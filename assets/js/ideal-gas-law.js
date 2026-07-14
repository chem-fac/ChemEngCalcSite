(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = 8.314462618;      // J/(mol·K)
  const TN = 273.15;          // Normal temperature [K]
  const PN = 101325;          // Normal pressure [Pa]
  const VM_N = 22.414;        // molar volume at 0°C, 101.325 kPa [L/mol]

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e6 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function tempK(id) { const v = val(id); const u = $(id + '_unit').value; return u === 'C' ? v + 273.15 : v; }
  const P_TO_PA = { kPaA: 1e3, MPaA: 1e6, barA: 1e5, atm: 101325 };
  function presPa(id) { const v = val(id); return v * P_TO_PA[$(id + '_unit').value]; }
  const positive = (v) => isFinite(v) && v > 0;
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'density';

  function render(opts) {
    $('result-area').innerHTML = `
      <div class="result-target">${opts.title}</div>
      <div class="result-value-big">${opts.bigValue}</div>
      <table class="unit-table"><tbody>
        ${opts.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}
      </tbody></table>
      <div class="result-meta">${(opts.notes || []).map(n => `<div class="result-note">※ ${n}</div>`).join('')}</div>`;
  }

  function calcDensity() {
    const T = tempK('Td'), P = presPa('Pd'), M = val('Md');
    if (!positive(T)) return setError('温度 T を正の絶対温度で入力してください（K ≦ 0 は不可）。');
    if (!positive(P)) return setError('圧力 P を正の絶対圧で入力してください。');
    if (!positive(M)) return setError('モル質量 M を正の値で入力してください。');

    const Mkg = M / 1000;
    const rho = P * Mkg / (R * T);
    const Vm = R * T / P;            // m³/mol
    const v = 1 / rho;              // m³/kg
    const rhoN = PN * Mkg / (R * TN);

    render({
      title: '密度 ρ',
      bigValue: `${fmtNum(rho)} <span class="unit">kg/m³</span>`,
      rows: [
        ['モル体積 V_m', `${fmtNum(Vm * 1000)} L/mol`],
        ['比容 v = 1/ρ', `${fmtNum(v)} m³/kg`],
        ['標準状態密度 ρ_N（0℃, 101.325 kPaA）', `${fmtNum(rhoN)} kg/m³`],
        ['指定条件 / 標準状態の密度比', `${fmtNum(rho / rhoN)}`],
      ],
      notes: ['理想気体 PV=nRT による概算。高圧・低温では実在気体（Z 係数）を考慮してください。'],
    });
  }

  function calcFlow() {
    const Q = val('Qf'), type = $('Qf_type').value;
    const T = tempK('Tf'), P = presPa('Pf'), M = val('Mf');
    if (!positive(Q)) return setError('流量 Q を正の値で入力してください。');
    if (!positive(T)) return setError('運転温度 T を正の絶対温度で入力してください。');
    if (!positive(P)) return setError('運転圧力 P を正の絶対圧で入力してください。');
    if ($('Mf').value !== '' && !positive(M)) return setError('モル質量 M は正の値で入力してください（空欄なら質量流量を省略）。');

    // 入力流量を Nm³/h（0℃, 101.325 kPaA）に統一
    let QN;
    if (type === 'Nm3h') QN = Q;
    else if (type === 'Sm3h') QN = Q * (TN / 288.15);               // 15℃同圧 → 0℃
    else QN = Q * (P / PN) * (TN / T);                              // 実 m³/h（運転条件）→ Nm³/h
    const QS = QN * (288.15 / TN);                                  // Nm³/h → Sm³/h（15℃）
    const QA = QN * (PN / P) * (T / TN);                            // Nm³/h → 実 m³/h（運転条件）
    const nkmol = QN / VM_N;                                        // kmol/h
    const rhoOp = M ? (P * (M / 1000)) / (R * T) : NaN;             // 運転条件の密度
    const mdot = M ? nkmol * M : NaN;                               // kg/h

    const rows = [
      ['標準流量 Q_N（0℃, 101.325 kPaA）', `${fmtNum(QN)} Nm³/h`],
      ['標準流量 Q_S（15℃, 101.325 kPaA）', `${fmtNum(QS)} Sm³/h`],
      ['実体積流量 Q_A（運転 T, P）', `${fmtNum(QA)} m³/h`],
      ['モル流量', `${fmtNum(nkmol)} kmol/h`],
    ];
    if (M) {
      rows.push(['質量流量', `${fmtNum(mdot)} kg/h`]);
      rows.push(['運転条件の密度 ρ', `${fmtNum(rhoOp)} kg/m³`]);
    }
    render({
      title: '実体積流量 Q_A',
      bigValue: `${fmtNum(QA)} <span class="unit">m³/h</span>`,
      rows,
      notes: [
        '標準状態は Normal=0℃・Standard=15℃（いずれも 101.325 kPaA）として換算しています。',
        '理想気体換算です。高圧では実在気体補正（Z）が必要になります。',
      ],
    });
  }

  function calculate() {
    clearError();
    if (mode === 'density') calcDensity();
    else calcFlow();
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
    ['Td', 'Pd', 'Md', 'Qf', 'Tf', 'Pf', 'Mf'].forEach(id => { if ($(id)) $(id).value = ''; });
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
