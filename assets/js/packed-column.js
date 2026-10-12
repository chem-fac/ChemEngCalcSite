(function () {
  'use strict';

  // ===== 計算部（画面に依存しない部分。Node でも検証できるよう分けている） =====
  const pos = v => isFinite(v) && v > 0;
  const given = v => isFinite(v);

  // 理論段数 → 充填高さ（濃縮部・回収部ごとに HETP を掛ける）
  function toHeight(p) {
    const { nR, nS, hetpR, hetpS } = p;
    if (!given(nR) && !given(nS)) return { error: '濃縮部か回収部の理論段数を入力してください。' };
    for (const [v, name] of [[nR, '濃縮部の理論段数'], [nS, '回収部の理論段数']]) {
      if (given(v) && !(v >= 0)) return { error: `${name}は 0 以上の値を入力してください。` };
    }
    if (!pos(hetpR)) return { error: 'HETP（濃縮部）は正の値を入力してください。' };
    if (given(hetpS) && !pos(hetpS)) return { error: 'HETP（回収部）は正の値を入力してください。' };
    const hS = given(hetpS) ? hetpS : hetpR;
    const NR = given(nR) ? nR : 0;
    const NS = given(nS) ? nS : 0;
    return { mode: 'height', NR, NS, hetpR, hetpS: hS, ZR: NR * hetpR, ZS: NS * hS };
  }

  // 充填高さ → 相当する理論段数
  function toStages(p) {
    const { zR, zS, hetpR, hetpS } = p;
    if (!given(zR) && !given(zS)) return { error: '濃縮部か回収部の充填高さを入力してください。' };
    for (const [v, name] of [[zR, '濃縮部の充填高さ'], [zS, '回収部の充填高さ']]) {
      if (given(v) && !(v >= 0)) return { error: `${name}は 0 以上の値を入力してください。` };
    }
    if (!pos(hetpR)) return { error: 'HETP（濃縮部）は正の値を入力してください。' };
    if (given(hetpS) && !pos(hetpS)) return { error: 'HETP（回収部）は正の値を入力してください。' };
    const hS = given(hetpS) ? hetpS : hetpR;
    const ZR = given(zR) ? zR : 0;
    const ZS = given(zS) ? zS : 0;
    return { mode: 'stages', ZR, ZS, hetpR, hetpS: hS, NR: ZR / hetpR, NS: ZS / hS };
  }

  // 全還流データ → HETP（Fenske式。リボイラーを1理論段として差し引く）
  function totalReflux(p) {
    const { a, xTop, xBot, Z } = p;
    if (!isFinite(a) || !(a > 1)) return { error: '相対揮発度 α は 1 より大きい値を入力してください。' };
    if (![xTop, xBot].every(v => v > 0 && v < 1)) return { error: '塔頂・塔底の組成は 0 と 1 の間の値（モル分率）で入力してください。' };
    if (!(xBot < xTop)) return { error: '塔頂の組成は塔底の組成より大きい値を入力してください。' };
    if (!pos(Z)) return { error: '充填高さ Z は正の値を入力してください。' };
    const Smin = Math.log((xTop / (1 - xTop)) * ((1 - xBot) / xBot)) / Math.log(a);
    const N = Smin - 1;
    if (!(N > 0)) {
      return { error: `この組成差はステップ数 ${Smin.toFixed(2)}（リボイラー込み）で、リボイラー分の1段を引くと充填部の段数が 0 以下になります。α と組成を見直してください。` };
    }
    return { mode: 'test', Smin, N, Z, HETP: Z / N };
  }

  const core = { toHeight, toStages, totalReflux };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (typeof document === 'undefined') return;

  // ===== 画面 =====
  const $ = id => document.getElementById(id);
  const PLACEHOLDER = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  const num = id => { const el = $(id); return el && el.value !== '' ? parseFloat(el.value) : NaN; };
  const f2 = v => (isFinite(v) ? v.toFixed(2) : '-');
  const f3 = v => (isFinite(v) ? Number(v.toPrecision(3)).toString() : '-');
  let mode = 'height';

  function setError(m) {
    const e = $('error');
    e.textContent = m;
    e.style.display = 'block';
    $('result-area').innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }

  function applyMode(m) {
    mode = m;
    document.querySelectorAll('.mode-tab').forEach(t => {
      const on = t.dataset.mode === m;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(m);
    });
    clearError();
    $('result-area').innerHTML = PLACEHOLDER;
  }

  function sectionTable(r) {
    const same = r.hetpR === r.hetpS;
    const row = (label, n, h, z) => `<tr><td>${label}</td><td class="num">${f2(n)}</td><td class="num">${h}</td><td class="num">${f2(z)} m</td></tr>`;
    return `
      <div class="result-detail-label">区間ごとの内訳</div>
      <div class="stage-composition-wrap">
        <table class="unit-table stage-table" style="min-width:420px">
          <thead><tr><th>区間</th><th style="text-align:right">理論段数</th><th style="text-align:right">HETP</th><th style="text-align:right">充填高さ</th></tr></thead>
          <tbody>
            ${row('濃縮部（供給位置より上）', r.NR, `${f3(r.hetpR)} m`, r.ZR)}
            ${row('回収部（供給位置より下）', r.NS, `${f3(r.hetpS)} m`, r.ZS)}
            ${row('充填部の合計', r.NR + r.NS, same ? `${f3(r.hetpR)} m` : '-', r.ZR + r.ZS)}
          </tbody>
        </table>
      </div>`;
  }

  function calculate() {
    clearError();
    const hetp = { hetpR: num('hetpR'), hetpS: num('hetpS') };
    if (mode === 'test') {
      const r = totalReflux({ a: num('alpha'), xTop: num('xTop'), xBot: num('xBot'), Z: num('zTest') });
      if (r.error) return setError(r.error);
      $('result-area').innerHTML = `
        <div class="result-target">HETP（全還流データから逆算）</div>
        <div class="result-value-big">${f3(r.HETP)} <span class="unit">m</span></div>
        <table class="unit-table"><tbody>
          <tr><td>全還流のステップ数 S<sub>min</sub>（Fenske式・リボイラー込み）</td><td class="num">${f2(r.Smin)}</td></tr>
          <tr><td>充填部の理論段数 <span class="sym">N</span> = S<sub>min</sub> − 1</td><td class="num">${f2(r.N)} 段</td></tr>
        </tbody></table>
        <div class="result-meta">塔頂は還流液、塔底は缶出液の組成とし、リボイラーを1理論段として差し引いています。</div>`;
      return;
    }
    if (mode === 'stages') {
      const r = toStages(Object.assign({ zR: num('zR'), zS: num('zS') }, hetp));
      if (r.error) return setError(r.error);
      const N = r.NR + r.NS;
      $('result-area').innerHTML = `
        <div class="result-target">充填部の理論段数 <span class="sym">N</span>（リボイラーを除く）</div>
        <div class="result-value-big">${f2(N)} <span class="unit">段</span></div>
        ${sectionTable(r)}
        <div class="result-meta">リボイラーを1理論段に数えると、塔全体では ${f2(N + 1)} 段です。</div>`;
      return;
    }
    const r = toHeight(Object.assign({ nR: num('nR'), nS: num('nS') }, hetp));
    if (r.error) return setError(r.error);
    $('result-area').innerHTML = `
      <div class="result-target">必要な充填高さ <span class="sym">Z</span></div>
      <div class="result-value-big">${f2(r.ZR + r.ZS)} <span class="unit">m</span></div>
      ${sectionTable(r)}
      <div class="result-meta">充填層だけの高さです。液分散器や支持板などの空間は含みません。</div>`;
  }

  function reset() {
    document.querySelectorAll('#calculator input[type="number"]').forEach(el => { el.value = ''; });
    clearError();
    $('result-area').innerHTML = PLACEHOLDER;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.addEventListener('click', () => applyMode(t.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
