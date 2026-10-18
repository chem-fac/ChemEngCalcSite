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
    [15,     0.0017057, 1.0009e-3, 77.875,    62.985,  2528.3, 0.2245, 8.7804],
    [20,     0.0023392, 1.0018e-3, 57.762,    83.915,  2537.4, 0.2965, 8.6661],
    [25,     0.0031699, 1.0030e-3, 43.341,    104.83,  2546.5, 0.3672, 8.5568],
    [30,     0.0042467, 1.0044e-3, 32.882,    125.74,  2555.5, 0.4368, 8.4521],
    [35,     0.0056280, 1.0060e-3, 25.205,    146.64,  2564.5, 0.5051, 8.3518],
    [40,     0.0073844, 1.0079e-3, 19.515,    167.54,  2573.5, 0.5724, 8.2557],
    [45,     0.0095944, 1.0100e-3, 15.252,    188.44,  2582.4, 0.6386, 8.1634],
    [50,     0.012352,  1.0121e-3, 12.026,    209.34,  2591.3, 0.7038, 8.0749],
    [55,     0.015763,  1.0145e-3, 9.5640,    230.24,  2600.1, 0.7679, 7.9899],
    [60,     0.019946,  1.0171e-3, 7.6677,    251.15,  2608.8, 0.8312, 7.9082],
    [65,     0.025041,  1.0199e-3, 6.1939,    272.08,  2617.5, 0.8935, 7.8296],
    [70,     0.031201,  1.0228e-3, 5.0395,    292.98,  2626.1, 0.9551, 7.7540],
    [75,     0.038595,  1.0258e-3, 4.1289,    313.92,  2634.6, 1.0157, 7.6812],
    [80,     0.047414,  1.0290e-3, 3.4053,    334.92,  2643.0, 1.0756, 7.6110],
    [85,     0.057867,  1.0324e-3, 2.8261,    355.92,  2651.4, 1.1346, 7.5434],
    [90,     0.070182,  1.0359e-3, 2.3593,    376.97,  2659.6, 1.1931, 7.4781],
    [95,     0.084608,  1.0396e-3, 1.9819,    398.02,  2667.6, 1.2504, 7.4150],
    [100,    0.10142,   1.0435e-3, 1.6720,    419.17,  2675.7, 1.3072, 7.3541],
    [110,    0.14338,   1.0517e-3, 1.2094,    461.42,  2691.1, 1.4188, 7.2380],
    [120,    0.19867,   1.0606e-3, 0.89133,   503.78,  2705.9, 1.5279, 7.1291],
    [130,    0.27028,   1.0700e-3, 0.66808,   546.31,  2720.1, 1.6346, 7.0264],
    [140,    0.36154,   1.0801e-3, 0.50871,   589.13,  2733.4, 1.7392, 6.9293],
    [150,    0.47616,   1.0908e-3, 0.39245,   632.18,  2745.9, 1.8418, 6.8370],
    [160,    0.61823,   1.1022e-3, 0.30682,   675.50,  2757.4, 1.9426, 6.7491],
    [170,    0.79205,   1.1145e-3, 0.24262,   719.21,  2767.9, 2.0418, 6.6649],
    [180,    1.00280,   1.1275e-3, 0.19386,   763.14,  2777.2, 2.1395, 6.5841],
    [190,    1.25520,   1.1415e-3, 0.15638,   807.49,  2785.3, 2.2358, 6.5060],
    [200,    1.55470,   1.1565e-3, 0.12721,   852.40,  2792.0, 2.3308, 6.4303],
    [220,    2.31929,   1.1900e-3, 0.086094,  943.45,  2801.0, 2.5177, 6.2842],
    [240,    3.34670,   1.2291e-3, 0.059745,  1037.62, 2802.8, 2.7022, 6.1425],
    [260,    4.69210,   1.2755e-3, 0.042175,  1135.04, 2796.6, 2.8851, 6.0017],
    [280,    6.41646,   1.3328e-3, 0.030154,  1236.84, 2779.8, 3.0681, 5.8578],
    [300,    8.58790,   1.4036e-3, 0.021653,  1344.74, 2749.6, 3.2547, 5.7058],
    [320,    11.284,    1.4995e-3, 0.015476,  1462.05, 2700.2, 3.4488, 5.5373],
    [340,    14.600,    1.6375e-3, 0.010784,  1594.61, 2622.1, 3.6604, 5.3359],
    [360,    18.666,    1.8945e-3, 0.0069449, 1761.49, 2480.99, 3.9164, 5.0527],
    [362,    19.121,    1.9374e-3, 0.0065740, 1782.62, 2459.49, 3.9483, 5.0140],
    [364,    19.586,    1.9873e-3, 0.0061969, 1805.41, 2435.34, 3.9827, 4.9714],
    [366,    20.061,    2.0469e-3, 0.0058079, 1830.43, 2407.62, 4.0204, 4.9235],
    [368,    20.546,    2.1215e-3, 0.0053976, 1858.77, 2374.76, 4.0631, 4.8679],
    [370,    21.043,    2.2221e-3, 0.0049462, 1892.64, 2333.50, 4.1142, 4.7996],
    [371,    21.296,    2.2902e-3, 0.0046914, 1913.25, 2307.45, 4.1453, 4.7573],
    [372,    21.553,    2.3817e-3, 0.0043985, 1938.54, 2274.69, 4.1836, 4.7046],
    [372.5,  21.682,    2.4435e-3, 0.0042263, 1954.32, 2253.90, 4.2076, 4.6716],
    [373,    21.813,    2.5264e-3, 0.0040212, 1974.14, 2227.55, 4.2377, 4.6299],
    [373.3,  21.892,    2.5955e-3, 0.0038691, 1989.65, 2206.85, 4.2614, 4.5974],
    [373.5,  21.945,    2.6576e-3, 0.0037446, 2002.95, 2189.14, 4.2818, 4.5697],
    [373.7,  21.998,    2.7466e-3, 0.0035830, 2021.17, 2165.15, 4.3097, 4.5323],
    [373.8,  22.025,    2.8139e-3, 0.0034730, 2034.37, 2148.17, 4.3300, 4.5059],
    [373.9,  22.052,    2.9281e-3, 0.0033085, 2055.86, 2121.78, 4.3631, 4.4650],
    [373.946, 22.064,   3.1056e-3, 0.0031056, 2087.55, 2087.55, 4.4120, 4.4120],
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
    // 温度から求めたときは入力値をそのまま、圧力から求めたときも 360 °C を超えたら小数3桁まで示す（373 °C・373.8 °C の境目と見分けられるように）
    const tFine = mode === 'T' || p.T > 360;
    // 373 °C（21.81 MPaA）を超える臨界点の近くは、IF97 自体と IAPWS-95 の差が補間の誤差より大きい（適用範囲と注意事項を参照）
    const noteHtml = p.T > 373.8
      ? '<div class="result-note-warn">注意：373.8 °C（22.02 MPaA、21.92 MPaG）を超える、臨界点のすぐ近くです。もとにしている IAPWS-IF97 自体が、より精密な IAPWS-95 と比容積で最大2.7%、比エンタルピーで最大15 kJ/kg 違い、蒸発潜熱は IAPWS-95 より 373.9 °C で約29%、373.94 °C で約4割小さくなります。さらに臨界点の直前では、表の点の間を直線で結ぶ誤差で、蒸発潜熱が同じ向きに割合で最大ほぼ100%小さく出ます。値は目安です。</div>'
      : p.T > 373
        ? '<div class="result-note-warn">注意：373 °C（21.81 MPaA、21.71 MPaG）を超える、臨界点の近くです。もとにしている IAPWS-IF97 自体が、より精密な IAPWS-95 と比容積で最大2.7%、比エンタルピーで最大15 kJ/kg 違い、蒸発潜熱は IAPWS-95 より 373.8 °C で約17%小さくなるため、値は目安です。</div>'
        : '<div class="result-note">※ IAPWS-IF97 の値の代表点を線形補間しています。精度は「適用範囲と注意事項」を参照してください。</div>';
    $('result-area').innerHTML = `
      <div class="result-target">飽和蒸気物性（${sourceLabel}）${p.T > 373 ? '<br>臨界点の近くのため目安の値' : ''}</div>
      <table class="unit-table"><tbody>
        <tr><td>飽和温度 T_sat</td><td class="num">${tFine ? Number(p.T.toFixed(3)) : fmtNum(p.T)} °C  /  ${tFine ? Number((p.T + 273.15).toFixed(3)) : fmtNum(p.T + 273.15)} K</td></tr>
        <tr><td>飽和圧力 P_sat</td><td class="num">${p.T > 360 ? p.P.toFixed(3) : fmtNum(p.P)} MPaA  /  ${p.T > 360 ? (p.P * 1000).toFixed(0) : fmtNum(p.P * 1000)} kPaA  /  ${p.T > 360 ? (p.P * 1000 - ATM_KPA).toFixed(0) : fmtNum(p.P * 1000 - ATM_KPA)} kPaG</td></tr>
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
        ${noteHtml}
      </div>
    `;
  }

  function calc() {
    clearError();
    if (mode === 'T') {
      const T = parseFloat($('T').value);
      if (!isFinite(T)) return setError('温度を入力してください。');
      const p = lookupByT(T);
      if (!p) return setError(`温度は 0 〜 373.946 °C の範囲で入力してください（入力：${T} °C）。`);
      showProps(p, `T = ${T} °C`);
    } else {
      const Pv = parseFloat($('P').value);
      const unit = $('P_unit').value;
      if (!isFinite(Pv)) return setError('圧力を入力してください。');
      const PMPa = presToMPaA(Pv, unit);
      if (!(PMPa > 0)) return setError('絶対圧として正の値になるように入力してください。');
      const p = lookupByP(PMPa);
      if (!p) return setError(`圧力は 0.0006117 〜 22.064 MPaA の範囲で入力してください（入力：${PMPa >= 1e-3 ? Number(PMPa.toFixed(6)) : Number(PMPa.toPrecision(6))} MPaA）。`);
      showProps(p, `P = ${Pv} ${unit}`);
    }
  }

  function showTable() {
    clearError();
    const rows = TABLE.map(r => {
      const hfg = r[5] - r[4];
      return `<tr><td>${r[0]}</td><td>${r[1] >= 1 ? r[1].toFixed(3) : fmtNum(r[1])}</td><td>${fmtNum(r[2] * 1000)}</td><td>${fmtNum(r[3])}</td><td>${fmtNum(r[4])}</td><td>${fmtNum(r[5])}</td><td>${fmtNum(hfg)}</td></tr>`;
    }).join('');
    $('result-area').innerHTML = `
      <div class="result-target">飽和水蒸気表（全データ）</div>
      <div class="st-table-wrap" data-no-copy tabindex="0" role="region" aria-label="飽和水蒸気表（横にスクロールできます）"><table class="st-table">
        <thead><tr><th>T [°C]</th><th>P [MPa]</th><th>v_f [L/kg]</th><th>v_g [m³/kg]</th><th>h_f [kJ/kg]</th><th>h_g [kJ/kg]</th><th>h_fg [kJ/kg]</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <div class="result-meta"><div class="result-note">※ 任意の T・P 値を入力すると、隣接2点で線形補間して物性値を返します。</div><div class="result-note">※ 373 °C を超える行は、もとにしている IAPWS-IF97 自体と、より精密な IAPWS-95 との差が大きいため目安です（適用範囲と注意事項を参照）。</div></div>
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
