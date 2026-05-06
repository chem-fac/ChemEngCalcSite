(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const TO_SI = {
    u1: { ms: 1, cms: 0.01 },
    D1: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    D2: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
  };

  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  function toSup(s) {
    return String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  }

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '—';
    const abs = Math.abs(v);
    if (abs === 0) return '0';
    if (abs >= 1e5 || abs < 1e-3) {
      const exp = v.toExponential(sig - 1);
      const m = exp.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
      return exp;
    }
    return Number(v.toPrecision(sig)).toString();
  }

  function getSI(field) {
    const v = parseFloat($(field).value);
    const unit = $(field + '_unit').value;
    if (!isFinite(v)) return NaN;
    return v * TO_SI[field][unit];
  }

  function setError(msg) {
    const e = $('error');
    e.textContent = msg;
    e.style.display = 'block';
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }
  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function calcArea(D) { return Math.PI * D * D / 4; }

  function calculate() {
    clearError();
    const u1 = getSI('u1');
    const D1 = getSI('D1');
    const D2 = getSI('D2');

    if (!isFinite(u1) || !isFinite(D1) || !isFinite(D2)) {
      return setError('入口の流速・管内径と出口の管内径を数値で入力してください。');
    }
    if (u1 <= 0 || D1 <= 0 || D2 <= 0) {
      return setError('流速と管内径は正の値で入力してください。');
    }

    const A1 = calcArea(D1);
    const A2 = calcArea(D2);
    const u2 = u1 * (A1 / A2);
    const Q = u1 * A1;

    for (const [k, v] of Object.entries({ A1, A2, u2, Q })) {
      if (!isFinite(v) || v <= 0) {
        return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
      }
    }

    $('result-area').innerHTML = render(u2, Q, A1, A2, u1, D1, D2);
  }

  function render(u2, Q, A1, A2, u1, D1, D2) {
    return `
      <div class="result-target">出口の平均流速 <span class="sym">u<sub>2</sub></span></div>
      <div class="result-value-big">${fmtNum(u2)} <span class="unit">m/s</span></div>

      <div class="result-detail-label">他単位での値</div>
      <table class="unit-table"><tbody>
        <tr><td>m/s</td><td class="num">${fmtNum(u2)}</td></tr>
        <tr><td>cm/s</td><td class="num">${fmtNum(u2 * 100)}</td></tr>
      </tbody></table>

      <div class="result-detail-label">体積流量（入口・出口で一定）</div>
      <table class="unit-table"><tbody>
        <tr><td>m³/h</td><td class="num">${fmtNum(Q * 3600)}</td></tr>
        <tr><td>L/min</td><td class="num">${fmtNum(Q * 60000)}</td></tr>
        <tr><td>m³/s</td><td class="num">${fmtNum(Q)}</td></tr>
      </tbody></table>

      <div class="result-meta">
        <div>入口断面積 <span class="sym">A<sub>1</sub></span> = ${fmtNum(A1 * 10000)} cm² (= ${fmtNum(A1)} m²)</div>
        <div>出口断面積 <span class="sym">A<sub>2</sub></span> = ${fmtNum(A2 * 10000)} cm² (= ${fmtNum(A2)} m²)</div>
        <div>面積比 <span class="sym">A<sub>1</sub></span>/<span class="sym">A<sub>2</sub></span> = ${fmtNum(A1 / A2)}（流速比 <span class="sym">u<sub>2</sub></span>/<span class="sym">u<sub>1</sub></span> も同じ）</div>
        <div>入力 <span class="sym">u<sub>1</sub></span> = ${fmtNum(u1)} m/s, <span class="sym">D<sub>1</sub></span> = ${fmtNum(D1 * 1000)} mm, <span class="sym">D<sub>2</sub></span> = ${fmtNum(D2 * 1000)} mm</div>
      </div>
    `;
  }

  function reset() {
    ['u1', 'D1', 'D2'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
