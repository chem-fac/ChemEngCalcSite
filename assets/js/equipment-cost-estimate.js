(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const N_ROWS = 6;

  // 設置係数（ベアモジュール係数、炭素鋼基準）
  // Guthrie のモジュール係数（化学工学協会関東支部 編『経済評価とプラントコスト』1975 表3・14・図3・7）から
  // F = (1 + 付帯材料/E) × (1 + 労務/直接材料) × 1.34（間接係数のノーム）で算出。
  // 塔・槽・熱交換器・ポンプは白石(2011) 表7.1 の係数でも同じ値になる。
  const TYPES = {
    vv:   { label: '塔・縦型容器', f: 4.00 },
    hv:   { label: '横型容器・槽', f: 2.97 },
    hx:   { label: '熱交換器', f: 3.14 },
    pump: { label: 'ポンプ', f: 3.25 },
    comp: { label: '圧縮機', f: 2.90 },
    avg:  { label: 'その他の機器', f: 2.95 },
    none: { label: '据付工事なし', f: 1.00 },
  };

  // ラング係数 Lang (1948)：関山「化学プラント建設費について」化学工学 90(1) p.13 (2026)
  const LANG = {
    fluid: { label: '流体を扱うプラント', f: 4.74 },
    mixed: { label: '固体と流体を扱うプラント', f: 3.63 },
    solid: { label: '固体を扱うプラント', f: 3.10 },
  };

  // 精度の幅：AACE 18R-97 (Rev. 2020) の各クラスの広い側
  const STAGES = {
    c5: { label: '構想（Class 5相当）', lo: -0.50, hi: 1.00 },
    c4: { label: '概略（Class 4相当）', lo: -0.30, hi: 0.50 },
    c3: { label: '予算（Class 3相当）', lo: -0.20, hi: 0.30 },
  };

  const MAT_MAX = 20; // 材質の倍率の上限（チタン製熱交換器で16程度）

  const yen = (v) => Math.round(v).toLocaleString('ja-JP');
  const myen = (v, d = 1) => (v / 1e6).toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) {
      const e = v.toExponential(sig - 1);
      const m = e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
      return e;
    }
    return Number(v.toPrecision(sig)).toString();
  }

  function num(id) {
    const el = $(id);
    if (!el) return NaN;
    const s = el.value.trim();
    return s === '' ? NaN : Number(s);
  }
  function blank(id) {
    const el = $(id);
    return !el || el.value.trim() === '';
  }

  function setError(msg) {
    const e = $('error');
    e.textContent = msg;
    e.style.display = 'block';
    const ra = $('result-area');
    if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>';
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }
  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function calculate() {
    clearError();

    const rows = [];
    for (let i = 1; i <= N_ROWS; i++) {
      const type = $('t' + i).value;
      const used = type !== '' || !blank('n' + i) || !blank('p' + i) || !blank('m' + i);
      if (!used) continue;
      if (type === '' || !TYPES[type]) return setError(`機器${i}の種類を選んでください。`);
      if (blank('p' + i)) return setError(`機器${i}の価格を入力してください。`);
      const price = num('p' + i);
      if (!isFinite(price) || price <= 0) return setError(`機器${i}の価格は正の数で入力してください。`);
      let n = 1;
      if (!blank('n' + i)) {
        n = num('n' + i);
        if (!isFinite(n) || n < 1 || Math.floor(n) !== n) return setError(`機器${i}の台数は1以上の整数で入力してください。`);
      }
      let m = 1;
      if (!blank('m' + i)) {
        m = num('m' + i);
        if (!isFinite(m) || m <= 0 || m > MAT_MAX) return setError(`機器${i}の材質の倍率は0より大きく${MAT_MAX}以下の数で入力してください（炭素鋼＝1）。`);
      }
      const f = TYPES[type].f;
      const E = price * n;
      const inst = E + (E / m) * (f - 1);
      rows.push({ i, type, n, price, m, f, E, inst, fEff: inst / E });
    }
    if (rows.length === 0) return setError('機器を1つ以上入力してください（種類と価格）。');

    let extra = 0;
    if (!blank('extra')) {
      extra = num('extra');
      if (!isFinite(extra) || extra < 0) return setError('係数に入らない費用は0以上の数で入力してください。');
    }
    const rate = (id, name) => {
      if (blank(id)) return { v: 0, blank: true };
      const v = num(id);
      if (!isFinite(v) || v < 0 || v >= 100) return { err: `${name}は0以上100未満の数（%）で入力してください。` };
      return { v: v / 100, blank: false };
    };
    const rc = rate('cont', '予備費率');
    if (rc.err) return setError(rc.err);
    const rf = rate('fee', '業者のフィー率');
    if (rf.err) return setError(rf.err);

    const stage = STAGES[$('stage').value] || STAGES.c4;
    const lang = LANG[$('plant').value] || LANG.fluid;

    const sumE = rows.reduce((s, r) => s + r.E, 0);
    const sumInst = rows.reduce((s, r) => s + r.inst, 0);
    const sub = sumInst + extra;
    const cont = sub * rc.v;
    const fee = sub * rf.v;
    const total = sub + cont + fee;
    const langTotal = sumE * lang.f;

    const vals = [sumE, sumInst, sub, total, langTotal, total * (1 + stage.lo), total * (1 + stage.hi)];
    if (vals.some((v) => !isFinite(v) || v <= 0)) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }

    $('result-area').innerHTML = render({
      rows, extra, sumE, sumInst, sub, cont, fee, total, rc, rf, stage, lang, langTotal,
    });
  }

  function render(r) {
    const lo = r.total * (1 + r.stage.lo);
    const hi = r.total * (1 + r.stage.hi);
    const rowsHtml = r.rows.map((x) => `
        <tr>
          <td>機器${x.i}：${TYPES[x.type].label}${x.n > 1 ? `×${x.n}` : ''}${x.m !== 1 ? `（材質${fmtNum(x.m)}倍）` : ''}</td>
          <td class="num">${myen(x.E, 2)}</td>
          <td class="num">${fmtNum(x.fEff)}</td>
          <td class="num">${myen(x.inst, 2)}</td>
        </tr>`).join('');

    const notes = [];
    if (r.rc.blank) notes.push('予備費率が空欄のため0%で計算しています。');
    if (r.rf.blank) notes.push('業者のフィー率が空欄のため0%で計算しています。');

    return `
      <div class="result-target">総額（概算）</div>
      <div class="result-value-big">${myen(r.total)} <span class="unit">百万円</span></div>
      <div class="result-meta">
        <div>精度の幅 ${myen(lo)} 〜 ${myen(hi)} 百万円（${r.stage.label}）</div>
      </div>

      <div class="result-detail-label">機器ごとの費用［百万円］</div>
      <div class="stage-composition-wrap">
        <table class="unit-table stage-table">
          <thead><tr><th>機器</th><th>機器費</th><th>設置係数</th><th>据付後の費用</th></tr></thead>
          <tbody>${rowsHtml}
          </tbody>
        </table>
      </div>

      <div class="result-detail-label">総額の内訳［百万円］</div>
      <table class="unit-table">
        <tr><td>機器費の合計</td><td class="num">${myen(r.sumE, 2)}</td></tr>
        <tr><td>工事費・間接費（設置係数の分）</td><td class="num">${myen(r.sumInst - r.sumE, 2)}</td></tr>
        <tr><td>係数に入らない費用</td><td class="num">${myen(r.extra, 2)}</td></tr>
        <tr><td>小計</td><td class="num">${myen(r.sub, 2)}</td></tr>
        <tr><td>予備費（${fmtNum(r.rc.v * 100)}%）</td><td class="num">${myen(r.cont, 2)}</td></tr>
        <tr><td>業者のフィー（${fmtNum(r.rf.v * 100)}%）</td><td class="num">${myen(r.fee, 2)}</td></tr>
        <tr><td><strong>総額</strong></td><td class="num"><strong>${myen(r.total, 2)}</strong></td></tr>
        <tr><td>総額 ÷ 機器費の合計</td><td class="num">${fmtNum(r.total / r.sumE)} 倍</td></tr>
      </table>

      <div class="result-detail-label">ラング係数法との比較</div>
      <table class="unit-table">
        <tr><td>ラング係数（${r.lang.label}）</td><td class="num">${fmtNum(r.lang.f)}</td></tr>
        <tr><td>機器費の合計 × ラング係数</td><td class="num">${myen(r.langTotal, 2)} 百万円</td></tr>
        <tr><td>上の総額に対する比</td><td class="num">${fmtNum(r.langTotal / r.total)} 倍</td></tr>
      </table>

      <div class="result-meta">
        <div>総額 ${yen(r.total)} 円。設置係数は炭素鋼基準で、材質の倍率を入れた機器は工事費を「機器費÷倍率」に掛けて見込んでいます。</div>
        <div>ラング係数法の値は建屋・ユーティリティを含むプラント全体の目安です。</div>
        ${notes.length ? `<div>${notes.join('')}</div>` : ''}
      </div>`;
  }

  function reset() {
    for (let i = 1; i <= N_ROWS; i++) {
      $('t' + i).value = '';
      ['n', 'p', 'm'].forEach((k) => { $(k + i).value = ''; });
    }
    ['extra', 'cont', 'fee'].forEach((id) => { $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });

  // calc-utils.js は選択欄を設定として記憶・復元する。機器の種類は入力値なので、
  // 共有URLで開いたとき以外は復元された種類を空に戻す（価格が空のまま種類だけ残らないように）。
  window.addEventListener('load', () => {
    if (location.search) return;
    for (let i = 1; i <= N_ROWS; i++) $('t' + i).value = '';
  });
})();
