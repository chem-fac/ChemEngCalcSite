(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = 8.314462618;

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e6 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function tempK(id) { const v = val(id); return $(id + '_unit').value === 'C' ? v + 273.15 : v; }
  const P_TO_PA = { kPa: 1e3, MPa: 1e6, bar: 1e5, atm: 101325, mmHg: 133.322, Pa: 1 };
  function presPa(id) { const v = val(id); return v * P_TO_PA[$(id + '_unit').value]; }
  const positive = (v) => isFinite(v) && v > 0;
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'two';

  function pRow(pa) { return `${fmtNum(pa / 1000)} kPa / ${fmtNum(pa / 1e5)} bar / ${fmtNum(pa / 133.322)} mmHg`; }

  function calcTwo() {
    const T1 = tempK('T1'), P1 = presPa('P1'), T2 = tempK('T2'), P2 = presPa('P2');
    if (!positive(T1) || !positive(T2)) return setError('温度は正の絶対温度で入力してください（K ≦ 0 は不可）。');
    if (!positive(P1) || !positive(P2)) return setError('蒸気圧は正の値で入力してください。');
    if (Math.abs(T1 - T2) < 1e-9) return setError('T₁ と T₂ は別の温度にしてください（同じ温度では蒸発熱が求まりません）。');

    const dH = R * Math.log(P2 / P1) / (1 / T1 - 1 / T2);   // J/mol
    if (!(dH > 0)) {
      return setError('求めた蒸発熱が正になりません。高温側ほど蒸気圧が高くなる関係（温度↑で P↑）になっているか、データを確認してください。');
    }
    const rows2 = [['蒸発潜熱 ΔH_vap', `${fmtNum(dH / 1000)} kJ/mol（${fmtNum(dH)} J/mol）`]];

    const T3 = $('T3').value !== '' ? tempK('T3') : NaN;
    let p3line = '';
    if (isFinite(T3)) {
      if (!positive(T3)) return setError('T₃ は正の絶対温度で入力してください。');
      const P3 = P1 * Math.exp(-dH / R * (1 / T3 - 1 / T1));
      rows2.push(['T₃ での蒸気圧 P₃', pRow(P3)]);
      p3line = `T₃ = ${fmtNum(T3)} K での外挿蒸気圧を表示しています。`;
    }

    $('result-area').innerHTML = `
      <div class="result-target">蒸発潜熱 ΔH_vap</div>
      <div class="result-value-big">${fmtNum(dH / 1000)} <span class="unit">kJ/mol</span></div>
      <table class="unit-table"><tbody>
        ${rows2.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}
        <tr><td>区間（T₁〜T₂）</td><td class="num">${fmtNum(T1)} K 〜 ${fmtNum(T2)} K</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ 2点間で蒸発熱一定とした平均値です。${p3line}</div>
      </div>`;
  }

  function calcPredict() {
    const T1 = tempK('pT1'), P1 = presPa('pP1'), dH = val('pdH') * 1000, T2 = tempK('pT2');
    if (!positive(T1) || !positive(T2)) return setError('温度は正の絶対温度で入力してください。');
    if (!positive(P1)) return setError('基準蒸気圧 P₁ を正の値で入力してください。');
    if (!(dH > 0)) return setError('蒸発潜熱 ΔH_vap を正の値（kJ/mol）で入力してください。');

    const P2 = P1 * Math.exp(-dH / R * (1 / T2 - 1 / T1));
    $('result-area').innerHTML = `
      <div class="result-target">T₂ での蒸気圧 P₂</div>
      <div class="result-value-big">${fmtNum(P2 / 1000)} <span class="unit">kPa</span></div>
      <table class="unit-table"><tbody>
        <tr><td>蒸気圧 P₂</td><td class="num">${pRow(P2)}</td></tr>
        <tr><td>基準点</td><td class="num">${fmtNum(T1)} K, ${fmtNum(P1 / 1000)} kPa</td></tr>
        <tr><td>ΔH_vap</td><td class="num">${fmtNum(dH / 1000)} kJ/mol</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ 蒸発熱一定の近似による外挿です。外挿幅が大きいほど誤差が増えます。</div>
      </div>`;
  }

  function calculate() {
    clearError();
    if (mode === 'two') calcTwo();
    else calcPredict();
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next);
    });
    clearError();
    clearResult();
  }

  function reset() {
    ['T1', 'P1', 'T2', 'P2', 'T3', 'pT1', 'pP1', 'pdH', 'pT2'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
