(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e6 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const positive = (v) => isFinite(v) && v > 0;
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">値と単位を入れて「換算する」を押してください</div>'; };

  // 溶液密度を g/L に統一
  const RHO_TO_GL = { gcm3: 1000, kgL: 1000, kgm3: 1, gL: 1 };

  function calc() {
    clearError();
    const MA = val('MA'), MB = val('MB');
    const rhoGL = val('rho') * RHO_TO_GL[$('rho_unit').value];
    const C = val('conc'), unit = $('conc_unit').value;
    const rhoRequired = (unit === 'molL' || unit === 'gL' || unit === 'mgL');
    const hasRho = positive(rhoGL);
    if (!positive(MA)) return setError('溶質のモル質量 M_A を正の値で入力してください。');
    if (!positive(MB)) return setError('溶媒のモル質量 M_B を正の値で入力してください。');
    if ($('rho').value !== '' && !hasRho) return setError('溶液の密度を正の値で入力してください。密度が不明な場合は空欄にしてください。');
    if (rhoRequired && !hasRho) return setError('この単位（mol/L・g/L・mg/L）の換算には溶液の密度を正の値で入力してください。');
    if (!(isFinite(C) && C >= 0)) return setError('濃度の値を0以上で入力してください。');

    // 入力濃度 → 質量分率 w
    let w;
    if (unit === 'masspct') w = C / 100;
    else if (unit === 'ppm') w = C / 1e6;
    else if (unit === 'xfrac') w = (C * MA) / (C * MA + (1 - C) * MB);
    else if (unit === 'molkg') w = (C * MA) / (1000 + C * MA);          // per kg solvent
    else if (unit === 'molL') w = (C * MA) / rhoGL;                     // mol/L → g/L /density
    else if (unit === 'gL') w = C / rhoGL;
    else if (unit === 'mgL') w = (C / 1000) / rhoGL;

    if (!(w >= 0 && w < 1)) {
      return setError('換算した質量分率が対象範囲（0以上1未満）から外れました。濃度の値・単位・溶液密度・モル質量を見直してください。溶媒を含まない純溶質（質量100%）は対象外です。');
    }

    const massPct = 100 * w;
    const ppm = 1e6 * w;
    const molkg = (1000 * w) / (MA * (1 - w));
    const xA = (w / MA) / (w / MA + (1 - w) / MB);
    // 密度に依存する出力（密度未入力なら計算しない）
    const NO_RHO = '密度未入力のため計算しません';
    const gLCell = hasRho ? `${fmtNum(w * rhoGL)} g/L` : NO_RHO;
    const mgLCell = hasRho ? `${fmtNum(w * rhoGL * 1000)} mg/L` : NO_RHO;
    const molLCell = hasRho ? `${fmtNum((w * rhoGL) / MA)} mol/L` : NO_RHO;

    $('result-area').innerHTML = `
      <div class="result-target">質量パーセント</div>
      <div class="result-value-big">${fmtNum(massPct)} <span class="unit">質量 %</span></div>
      <table class="unit-table"><tbody>
        <tr><td>質量パーセント</td><td class="num">${fmtNum(massPct)} %</td></tr>
        <tr><td>モル濃度（molarity）</td><td class="num">${molLCell}</td></tr>
        <tr><td>質量モル濃度（molality）</td><td class="num">${fmtNum(molkg)} mol/kg-溶媒</td></tr>
        <tr><td>モル分率 x_A</td><td class="num">${fmtNum(xA)}</td></tr>
        <tr><td>溶質濃度</td><td class="num">${gLCell}</td></tr>
        <tr><td>溶質濃度</td><td class="num">${mgLCell}</td></tr>
        <tr><td>ppm（質量）</td><td class="num">${fmtNum(ppm)} ppm</td></tr>
        <tr><td>質量分率 w</td><td class="num">${fmtNum(w)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">${hasRho ? '※ モル濃度・g/L・mg/L は入力した溶液密度を使用しています。' : '※ 溶液密度が未入力のため、モル濃度・g/L・mg/L は計算していません。'}</div>
      </div>`;
  }

  function reset() {
    ['MA', 'MB', 'rho', 'conc'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
