(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const TIME = { s: 1, min: 60, h: 3600 };
  const FLOW = { Ls: 1, Lmin: 1 / 60, m3h: 1000 / 3600, m3s: 1000 };
  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
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
  function val(id) {
    const el = $(id);
    if (!el || el.value === '') return NaN;
    return parseFloat(el.value);
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };
  function kUnit(order, t) {
    if (order === 0) return `mol/(L ${t})`;
    if (order === 1) return `1/${t}`;
    return `L/(mol ${t})`;
  }
  function updateKUnitHint() {
    const hint = $('k_unit_hint');
    if (!hint) return;
    const order = parseInt($('order').value, 10);
    const tUnit = $('k_time_unit').value;
    hint.textContent = `この条件で入力する k の単位：${kUnit(order, tUnit)}`;
  }
  function calculate() {
    clearError();
    const order = parseInt($('order').value, 10);
    const CA0 = val('CA0');
    const Xpct = val('X');
    const qIn = val('q');
    const kIn = val('k');
    if (!positive(CA0) || !positive(qIn) || !positive(kIn)) return setError('入口濃度・入口体積流量・速度定数を正の数値で入力してください。');
    if (!isFinite(Xpct) || Xpct <= 0 || Xpct >= 100) return setError('転化率 X は 0 より大きく 100 未満で入力してください。');
    const X = Xpct / 100;
    const q = qIn * FLOW[$('q_unit').value];
    const tUnit = $('k_time_unit').value;
    const k = kIn / TIME[tUnit];
    const CA = CA0 * (1 - X);
    const rate = k * Math.pow(CA, order);
    if (!positive(rate)) return setError('出口濃度での反応速度が正になりません。入力値を確認してください。');
    const tau = CA0 * X / rate;
    const V = q * tau;
    const FA0 = q * CA0;
    $('result-area').innerHTML = `
      <div class="result-target">CSTR容積 <span class="sym">V</span></div>
      <div class="result-value-big">${fmtNum(V / 1000)} <span class="unit">m³</span></div>
      <table class="unit-table"><tbody>
        <tr><td>容積</td><td class="num">${fmtNum(V)} L</td></tr>
        <tr><td>空間時間 τ</td><td class="num">${fmtNum(tau)} s (= ${fmtNum(tau / 60)} min)</td></tr>
        <tr><td>出口濃度 C_A</td><td class="num">${fmtNum(CA)} mol/L</td></tr>
        <tr><td>出口反応速度 -r_A</td><td class="num">${fmtNum(rate)} mol/(L s)</td></tr>
        <tr><td>入力した k の単位</td><td class="num">${kUnit(order, tUnit)}</td></tr>
        <tr><td>入口モル流量 F_A0</td><td class="num">${fmtNum(FA0)} mol/s</td></tr>
      </tbody></table>
      <div class="result-note">※ CSTRは完全混合のため、反応速度は出口濃度（槽内濃度）で評価します。</div>
    `;
  }
  function reset() {
    ['CA0','X','q','k'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('order').addEventListener('change', updateKUnitHint);
    $('k_time_unit').addEventListener('change', updateKUnitHint);
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    updateKUnitHint();
  });
})();
