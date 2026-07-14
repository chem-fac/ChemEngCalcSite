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
  const positive = (v) => isFinite(v) && v > 0;
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'two';

  function calcTwo() {
    const T1 = tempK('T1'), K1 = val('K1'), T2 = tempK('T2'), K2 = val('K2');
    if (!positive(T1) || !positive(T2)) return setError('温度は正の絶対温度で入力してください。');
    if (!positive(K1) || !positive(K2)) return setError('平衡定数 K は正の値で入力してください（K ≦ 0 は対数が取れません）。');
    if (Math.abs(T1 - T2) < 1e-9) return setError('T₁ と T₂ は別の温度にしてください。');

    const dH = R * Math.log(K2 / K1) / (1 / T1 - 1 / T2);   // J/mol
    const dG1 = -R * T1 * Math.log(K1);
    const dS = (dH - dG1) / T1;                             // ΔS° は T によらず一定（ΔH,ΔG ともに同近似）
    const dG2 = -R * T2 * Math.log(K2);
    const kind = dH > 0 ? '吸熱反応（温度↑で K↑）' : (dH < 0 ? '発熱反応（温度↑で K↓）' : '熱中性');

    $('result-area').innerHTML = `
      <div class="result-target">反応エンタルピー ΔH°</div>
      <div class="result-value-big">${fmtNum(dH / 1000)} <span class="unit">kJ/mol</span></div>
      <table class="unit-table"><tbody>
        <tr><td>ΔH°</td><td class="num">${fmtNum(dH / 1000)} kJ/mol（${fmtNum(dH)} J/mol）</td></tr>
        <tr><td>反応の種類</td><td class="num">${kind}</td></tr>
        <tr><td>ΔS°（一定近似）</td><td class="num">${fmtNum(dS)} J/(mol·K)</td></tr>
        <tr><td>ΔG° at T₁</td><td class="num">${fmtNum(dG1 / 1000)} kJ/mol</td></tr>
        <tr><td>ΔG° at T₂</td><td class="num">${fmtNum(dG2 / 1000)} kJ/mol</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ ΔH°・ΔS° を温度範囲で一定とした平均値です。</div>
      </div>`;
  }

  function calcPredict() {
    const T1 = tempK('pT1'), K1 = val('pK1'), dH = val('pdH') * 1000, T2 = tempK('pT2');
    if (!positive(T1) || !positive(T2)) return setError('温度は正の絶対温度で入力してください。');
    if (!positive(K1)) return setError('基準平衡定数 K₁ を正の値で入力してください。');
    if (!isFinite(dH)) return setError('反応エンタルピー ΔH° を入力してください（発熱は負）。');

    const K2 = K1 * Math.exp(-dH / R * (1 / T2 - 1 / T1));
    const dG2 = -R * T2 * Math.log(K2);
    $('result-area').innerHTML = `
      <div class="result-target">T₂ での平衡定数 K₂</div>
      <div class="result-value-big">${fmtNum(K2)}</div>
      <table class="unit-table"><tbody>
        <tr><td>平衡定数 K₂</td><td class="num">${fmtNum(K2)}</td></tr>
        <tr><td>基準点</td><td class="num">${fmtNum(T1)} K, K₁=${fmtNum(K1)}</td></tr>
        <tr><td>ΔH°</td><td class="num">${fmtNum(dH / 1000)} kJ/mol</td></tr>
        <tr><td>ΔG° at T₂</td><td class="num">${fmtNum(dG2 / 1000)} kJ/mol</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ ΔH° 一定の近似による外挿です。</div>
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
    ['T1', 'K1', 'T2', 'K2', 'pT1', 'pK1', 'pdH', 'pT2'].forEach(id => { if ($(id)) $(id).value = ''; });
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
