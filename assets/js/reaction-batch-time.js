(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const TIME = { s: 1, min: 60, h: 3600 };
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
    const kIn = val('k');
    const tUnit = $('k_time_unit').value;
    if (!positive(CA0) || !positive(kIn)) return setError('初濃度 C_A0 と速度定数 k を正の数値で入力してください。');
    if (!isFinite(Xpct) || Xpct <= 0 || Xpct >= 100) return setError('目標転化率 X は 0 より大きく 100 未満で入力してください。');
    const X = Xpct / 100;
    const k = kIn / TIME[tUnit];
    let t;
    if (order === 0) t = CA0 * X / k;
    else if (order === 1) t = -Math.log(1 - X) / k;
    else t = X / (k * CA0 * (1 - X));
    const CA = CA0 * (1 - X);
    const rateEnd = k * Math.pow(CA, order);
    $('result-area').innerHTML = `
      <div class="result-target">反応時間 <span class="sym">t</span></div>
      <div class="result-value-big">${fmtNum(t / 60)} <span class="unit">min</span></div>
      <table class="unit-table"><tbody>
        <tr><td>反応時間</td><td class="num">${fmtNum(t)} s</td></tr>
        <tr><td>反応時間</td><td class="num">${fmtNum(t / 3600)} h</td></tr>
        <tr><td>出口濃度相当 C_A</td><td class="num">${fmtNum(CA)} mol/L</td></tr>
        <tr><td>目標転化率</td><td class="num">${fmtNum(Xpct)} %</td></tr>
        <tr><td>入力した k の単位</td><td class="num">${kUnit(order, tUnit)}</td></tr>
        <tr><td>終点反応速度</td><td class="num">${fmtNum(rateEnd)} mol/(L s)</td></tr>
      </tbody></table>
      <div class="result-note">※ 定容・等温・不可逆反応を仮定した反応時間です。実バッチでは昇温、投入、冷却、サンプリングなどの時間を別途見込みます。</div>
    `;
  }
  function reset() {
    ['CA0','X','k'].forEach(id => { if ($(id)) $(id).value = ''; });
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
