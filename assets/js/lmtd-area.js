(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    Q: { W: 1, kW: 1000, MJh: 1000000 / 3600, kcalh: 4186.8 / 3600 },
    U: { Wm2K: 1, kWm2K: 1000, kcalhm2K: 4186.8 / 3600 },
  };
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
  function getSI(id) {
    const v = val(id);
    const u = $(id + '_unit') ? $(id + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[id] && u ? TO_SI[id][u] : 1) : NaN;
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };
  function lmtd(dt1, dt2) {
    if (Math.abs(dt1 - dt2) < 1e-9) return dt1;
    return (dt1 - dt2) / Math.log(dt1 / dt2);
  }
  function calculate() {
    clearError();
    const flow = $('flow_type').value;
    const Thi = val('Th_in');
    const Tho = val('Th_out');
    const Tci = val('Tc_in');
    const Tco = val('Tc_out');
    const Q = getSI('Q');
    const U = getSI('U');
    const F = val('F');
    if (![Thi, Tho, Tci, Tco].every(isFinite)) return setError('高温側・低温側の入口温度と出口温度を入力してください。');
    if (!positive(Q) || !positive(U)) return setError('熱交換量 Q と総括伝熱係数 U を正の数値で入力してください。');
    if (!positive(F) || F > 1) return setError('LMTD補正係数 F は 0 より大きく 1 以下で入力してください。');
    if (Tho > Thi) return setError('高温側は出口温度が入口温度以下になる条件で入力してください。入口・出口の向きを確認してください。');
    if (Tco < Tci) return setError('低温側は出口温度が入口温度以上になる条件で入力してください。入口・出口の向きを確認してください。');
    const dt1 = flow === 'counter' ? Thi - Tco : Thi - Tci;
    const dt2 = flow === 'counter' ? Tho - Tci : Tho - Tco;
    if (dt1 <= 0 || dt2 <= 0) return setError('温度差 ΔT1 と ΔT2 が正になる温度条件を入力してください。温度交差や流れ形式を確認してください。');
    const dtlm = lmtd(dt1, dt2);
    const dtEff = dtlm * F;
    const A = Q / (U * dtEff);
    const UA = U * A;
    const notes = [];
    if (F < 0.75) notes.push('補正係数 F が小さいため、多パス構成や温度条件の見直しが必要な可能性があります。');
    if (Math.min(dt1, dt2) / Math.max(dt1, dt2) > 0.95) notes.push('2つの端温度差が近いため、算術平均温度差でも近い値になります。');
    $('result-area').innerHTML = `
      <div class="result-target">必要伝熱面積 <span class="sym">A</span></div>
      <div class="result-value-big">${fmtNum(A)} <span class="unit">m²</span></div>
      <table class="unit-table"><tbody>
        <tr><td>温度差 ΔT1</td><td class="num">${fmtNum(dt1)} K</td></tr>
        <tr><td>温度差 ΔT2</td><td class="num">${fmtNum(dt2)} K</td></tr>
        <tr><td>LMTD</td><td class="num">${fmtNum(dtlm)} K</td></tr>
        <tr><td>補正後温度差 FΔTlm</td><td class="num">${fmtNum(dtEff)} K</td></tr>
        <tr><td>UA</td><td class="num">${fmtNum(UA)} W/K</td></tr>
        <tr><td>熱交換量</td><td class="num">${fmtNum(Q / 1000)} kW</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>流れ形式：${flow === 'counter' ? '向流' : '並流'}</div>
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
      </div>
    `;
  }
  function reset() {
    ['Th_in','Th_out','Tc_in','Tc_out','Q','U'].forEach(id => { if ($(id)) $(id).value = ''; });
    $('F').value = '1';
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
