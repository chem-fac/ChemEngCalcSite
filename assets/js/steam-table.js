(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ATM_KPA = 101.325;

  // Saturated water/steam table (IAPWS-IF97 reference)
  // [T_C, P_MPa, vf_m3kg, vg_m3kg, hf_kJkg, hg_kJkg, sf_kJkgK, sg_kJkgK]
  const TABLE = [
    [0,      0.0006117, 1.0002e-3, 205.99,    0.001,   2500.9, 0.0000, 9.1555],
    [5,      0.0008726, 1.0001e-3, 147.01,    21.020,  2510.1, 0.0763, 9.0249],
    [10,     0.0012281, 1.0003e-3, 106.30,    42.022,  2519.2, 0.1511, 8.8998],
    [15,     0.0017057, 1.0009e-3, 77.875,    62.985,  2528.3, 0.2245, 8.7803],
    [20,     0.0023392, 1.0018e-3, 57.762,    83.915,  2537.4, 0.2965, 8.6661],
    [25,     0.0031699, 1.0030e-3, 43.341,    104.83,  2546.5, 0.3672, 8.5566],
    [30,     0.0042467, 1.0044e-3, 32.882,    125.74,  2555.5, 0.4368, 8.4520],
    [35,     0.0056280, 1.0060e-3, 25.205,    146.64,  2564.5, 0.5051, 8.3517],
    [40,     0.0073814, 1.0079e-3, 19.515,    167.54,  2573.5, 0.5724, 8.2555],
    [45,     0.0095896, 1.0100e-3, 15.252,    188.44,  2582.4, 0.6386, 8.1633],
    [50,     0.012352,  1.0121e-3, 12.026,    209.34,  2591.3, 0.7038, 8.0745],
    [55,     0.015763,  1.0145e-3, 9.5640,    230.24,  2600.1, 0.7679, 7.9888],
    [60,     0.019946,  1.0171e-3, 7.6677,    251.15,  2608.8, 0.8312, 7.9075],
    [65,     0.025041,  1.0199e-3, 6.1939,    272.08,  2617.5, 0.8935, 7.8290],
    [70,     0.031201,  1.0228e-3, 5.0395,    292.98,  2626.1, 0.9551, 7.7531],
    [75,     0.038595,  1.0258e-3, 4.1289,    313.92,  2634.6, 1.0157, 7.6797],
    [80,     0.047414,  1.0290e-3, 3.4053,    334.92,  2643.0, 1.0756, 7.6099],
    [85,     0.057867,  1.0324e-3, 2.8261,    355.92,  2651.4, 1.1346, 7.5425],
    [90,     0.070182,  1.0359e-3, 2.3593,    376.97,  2659.6, 1.1931, 7.4763],
    [95,     0.084608,  1.0396e-3, 1.9819,    398.02,  2667.6, 1.2504, 7.4128],
    [100,    0.10142,   1.0435e-3, 1.6720,    419.17,  2675.7, 1.3072, 7.3541],
    [110,    0.14338,   1.0517e-3, 1.2094,    461.42,  2691.1, 1.4188, 7.2381],
    [120,    0.19867,   1.0606e-3, 0.89133,   503.78,  2705.9, 1.5279, 7.1291],
    [130,    0.27028,   1.0700e-3, 0.66808,   546.31,  2720.1, 1.6346, 7.0264],
    [140,    0.36154,   1.0801e-3, 0.50871,   589.13,  2733.4, 1.7392, 6.9293],
    [150,    0.47616,   1.0908e-3, 0.39245,   632.18,  2745.9, 1.8418, 6.8371],
    [160,    0.61823,   1.1022e-3, 0.30709,   675.50,  2757.4, 1.9426, 6.7491],
    [170,    0.79220,   1.1145e-3, 0.24283,   719.21,  2767.9, 2.0418, 6.6650],
    [180,    1.00280,   1.1275e-3, 0.19403,   763.14,  2777.2, 2.1395, 6.5839],
    [190,    1.25520,   1.1415e-3, 0.15649,   807.49,  2785.3, 2.2358, 6.5052],
    [200,    1.55470,   1.1565e-3, 0.12721,   852.40,  2792.0, 2.3308, 6.4280],
    [220,    2.31960,   1.1900e-3, 0.086094,  943.45,  2801.0, 2.5177, 6.2766],
    [240,    3.34670,   1.2291e-3, 0.059745,  1037.62, 2802.8, 2.7022, 6.1247],
    [260,    4.69210,   1.2755e-3, 0.041952,  1135.04, 2796.0, 2.8851, 5.9685],
    [280,    6.41650,   1.3320e-3, 0.030126,  1236.84, 2778.6, 3.0681, 5.8014],
    [300,    8.58790,   1.4036e-3, 0.021653,  1344.74, 2748.7, 3.2538, 5.6160],
    [320,    11.279,    1.4995e-3, 0.015488,  1462.50, 2700.2, 3.4488, 5.4001],
    [340,    14.586,    1.6390e-3, 0.010797,  1594.61, 2622.1, 3.6604, 5.1346],
    [360,    18.666,    1.8945e-3, 0.0069490, 1761.46, 2480.99, 3.9165, 4.7378],
    [373.95, 22.064,    3.1056e-3, 0.0031056, 2087.5,  2087.5, 4.4070, 4.4070],
  ];

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }

  function lerp(x, x0, x1, y0, y1) {
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }

  // Interpolate by temperature
  function lookupByT(T) {
    if (T < TABLE[0][0] || T > TABLE[TABLE.length - 1][0]) return null;
    for (let i = 0; i < TABLE.length - 1; i++) {
      const a = TABLE[i], b = TABLE[i + 1];
      if (T >= a[0] && T <= b[0]) {
        const t = (T - a[0]) / (b[0] - a[0]);
        return {
          T,
          P: a[1] + (b[1] - a[1]) * t,
          vf: a[2] + (b[2] - a[2]) * t,
          vg: a[3] + (b[3] - a[3]) * t,
          hf: a[4] + (b[4] - a[4]) * t,
          hg: a[5] + (b[5] - a[5]) * t,
          sf: a[6] + (b[6] - a[6]) * t,
          sg: a[7] + (b[7] - a[7]) * t,
        };
      }
    }
    return null;
  }

  // Interpolate by pressure (log-linear on P for T)
  function lookupByP(P_MPa) {
    if (P_MPa < TABLE[0][1] || P_MPa > TABLE[TABLE.length - 1][1]) return null;
    for (let i = 0; i < TABLE.length - 1; i++) {
      const a = TABLE[i], b = TABLE[i + 1];
      if (P_MPa >= a[1] && P_MPa <= b[1]) {
        // log-linear interp on P → T
        const lnP = Math.log(P_MPa);
        const lnPa = Math.log(a[1]);
        const lnPb = Math.log(b[1]);
        const t = (lnP - lnPa) / (lnPb - lnPa);
        const T = a[0] + (b[0] - a[0]) * t;
        // Then linear-interp other props on T as primary
        return {
          T,
          P: P_MPa,
          vf: a[2] + (b[2] - a[2]) * t,
          vg: a[3] + (b[3] - a[3]) * t,
          hf: a[4] + (b[4] - a[4]) * t,
          hg: a[5] + (b[5] - a[5]) * t,
          sf: a[6] + (b[6] - a[6]) * t,
          sg: a[7] + (b[7] - a[7]) * t,
        };
      }
    }
    return null;
  }

  let mode = 'T';

  function presToMPaA(val, unit) {
    if (unit === 'MPaA') return val;
    if (unit === 'kPaA') return val / 1000;
    if (unit === 'MPaG') return val + ATM_KPA / 1000;
    if (unit === 'kPaG') return (val + ATM_KPA) / 1000;
    if (unit === 'barA') return val / 10;
    if (unit === 'barG') return (val + 1.01325) / 10;
    return val;
  }

  function setError(m) { $('error').textContent = m; $('error').style.display = 'block'; const _ra = $('result-area'); if (_ra) _ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; }
  function clearError() { $('error').textContent = ''; $('error').style.display = 'none'; }

  function showProps(p, sourceLabel) {
    const rho_f = 1 / p.vf, rho_g = 1 / p.vg;
    const hfg = p.hg - p.hf;
    $('result-area').innerHTML = `
      <div class="result-target">飽和蒸気物性（${sourceLabel}）</div>
      <table class="unit-table"><tbody>
        <tr><td>飽和温度 T_sat</td><td class="num">${fmtNum(p.T)} °C  /  ${fmtNum(p.T + 273.15)} K</td></tr>
        <tr><td>飽和圧力 P_sat</td><td class="num">${fmtNum(p.P)} MPaA  /  ${fmtNum(p.P * 1000)} kPaA  /  ${fmtNum(p.P * 1000 - ATM_KPA)} kPaG</td></tr>
        <tr><td>飽和液 比容積 v_f</td><td class="num">${fmtNum(p.vf)} m³/kg  /  ${fmtNum(p.vf * 1000)} L/kg</td></tr>
        <tr><td>飽和液 密度 ρ_f</td><td class="num">${fmtNum(rho_f)} kg/m³</td></tr>
        <tr><td>飽和蒸気 比容積 v_g</td><td class="num">${fmtNum(p.vg)} m³/kg</td></tr>
        <tr><td>飽和蒸気 密度 ρ_g</td><td class="num">${fmtNum(rho_g)} kg/m³</td></tr>
        <tr><td>飽和液 比エンタルピー h_f</td><td class="num">${fmtNum(p.hf)} kJ/kg</td></tr>
        <tr><td>飽和蒸気 比エンタルピー h_g</td><td class="num">${fmtNum(p.hg)} kJ/kg</td></tr>
        <tr><td>蒸発潜熱 h_fg = h_g - h_f</td><td class="num">${fmtNum(hfg)} kJ/kg  /  ${fmtNum(hfg / 4.184)} kcal/kg</td></tr>
        <tr><td>飽和液 比エントロピー s_f</td><td class="num">${fmtNum(p.sf)} kJ/(kg·K)</td></tr>
        <tr><td>飽和蒸気 比エントロピー s_g</td><td class="num">${fmtNum(p.sg)} kJ/(kg·K)</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ IAPWS-IF97 標準値の代表点を線形補間。臨界点（374 °C, 22.1 MPa）近傍では非線形性が強くなります。</div>
      </div>
    `;
  }

  function calc() {
    clearError();
    if (mode === 'T') {
      const T = parseFloat($('T').value);
      if (!isFinite(T)) return setError('温度を入力してください。');
      const p = lookupByT(T);
      if (!p) return setError(`温度は 0 〜 373.95 °C の範囲で入力してください（入力：${T} °C）。`);
      showProps(p, `T = ${T} °C`);
    } else {
      const Pv = parseFloat($('P').value);
      const unit = $('P_unit').value;
      if (!isFinite(Pv)) return setError('圧力を入力してください。');
      const PMPa = presToMPaA(Pv, unit);
      if (!(PMPa > 0)) return setError('絶対圧として正の値になるように入力してください。');
      const p = lookupByP(PMPa);
      if (!p) return setError(`圧力は 0.0006117 〜 22.064 MPaA の範囲で入力してください（入力：${fmtNum(PMPa)} MPaA）。`);
      showProps(p, `P = ${Pv} ${unit}`);
    }
  }

  function showTable() {
    clearError();
    const rows = TABLE.map(r => {
      const hfg = r[5] - r[4];
      return `<tr><td>${r[0]}</td><td>${fmtNum(r[1])}</td><td>${fmtNum(r[2] * 1000)}</td><td>${fmtNum(r[3])}</td><td>${fmtNum(r[4])}</td><td>${fmtNum(r[5])}</td><td>${fmtNum(hfg)}</td></tr>`;
    }).join('');
    $('result-area').innerHTML = `
      <div class="result-target">飽和水蒸気表（全データ）</div>
      <table class="st-table">
        <thead><tr><th>T [°C]</th><th>P [MPa]</th><th>v_f [L/kg]</th><th>v_g [m³/kg]</th><th>h_f [kJ/kg]</th><th>h_g [kJ/kg]</th><th>h_fg [kJ/kg]</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="result-meta"><div class="result-note">※ 任意の T・P 値を入力すると、隣接2点で線形補間して物性値を返します。</div></div>
    `;
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next);
    });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">温度または圧力を入れて「物性を取得」を押してください</div>';
  }

  function reset() {
    ['T', 'P'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">温度または圧力を入れて「物性を取得」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    $('show-table-btn').addEventListener('click', showTable);
    setMode(mode);
  });
})();
