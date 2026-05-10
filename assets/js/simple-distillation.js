(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
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

  function positive(v) {
    return isFinite(v) && v > 0;
  }

  function fraction(v) {
    return isFinite(v) && v > 0 && v < 1;
  }

  function setError(m) {
    const e = $('error');
    e.textContent = m;
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

  function equilibriumY(x, alpha) {
    return alpha * x / (1 + (alpha - 1) * x);
  }

  function rayleighIntegral(x0, xW, alpha) {
    const a = alpha - 1;
    return Math.log(x0 / xW) / a - alpha * Math.log((1 - x0) / (1 - xW)) / a;
  }

  function calculate() {
    clearError();
    const pSatA = val('psatA');
    const pSatB = val('psatB');
    const W0 = val('W0');
    const x0 = val('x0');
    const xW = val('xW');
    if (![pSatA, pSatB, W0].every(positive)) return setError('飽和蒸気圧と初期釜液量を正の数値で入力してください。');
    if (![x0, xW].every(fraction)) return setError('組成は 0〜1 の範囲内で入力してください。');
    if (xW >= x0) return setError('単蒸留では軽沸点成分が減るため、最終釜液組成 xW は初期組成 x0 より小さくしてください。');

    const alpha = pSatA / pSatB;
    if (alpha <= 1) return setError('相対揮発度 α が 1 以下です。軽沸点成分をAにするか、飽和蒸気圧を確認してください。');

    const integral = rayleighIntegral(x0, xW, alpha);
    const W = W0 / Math.exp(integral);
    const D = W0 - W;
    const recovery = (W0 * x0 - W * xW) / (W0 * x0);
    const xDavg = D > 0 ? (W0 * x0 - W * xW) / D : NaN;
    const yStart = equilibriumY(x0, alpha);
    const yEnd = equilibriumY(xW, alpha);
    const notes = [];
    if (D <= 0) notes.push('留出量がほぼ0です。目標釜液組成を確認してください。');
    if (xDavg < xW || xDavg > 1) notes.push('平均留出組成が通常範囲から外れています。入力値を確認してください。');

    $('result-area').innerHTML = `
      <div class="result-target">必要留出量 D</div>
      <div class="result-value-big">${fmtNum(D)} <span class="unit">kmol</span></div>
      <table class="unit-table"><tbody>
        <tr><td>最終釜液量 W</td><td class="num">${fmtNum(W)} kmol</td></tr>
        <tr><td>平均留出組成 x̄<sub>D</sub></td><td class="num">${fmtNum(xDavg)}</td></tr>
        <tr><td>軽沸点成分の回収率</td><td class="num">${fmtNum(recovery * 100)} %</td></tr>
        <tr><td>相対揮発度 α<sub>AB</sub></td><td class="num">${fmtNum(alpha)}</td></tr>
        <tr><td>初期の平衡蒸気組成 y*(x<sub>0</sub>)</td><td class="num">${fmtNum(yStart)}</td></tr>
        <tr><td>最終の平衡蒸気組成 y*(x<sub>W</sub>)</td><td class="num">${fmtNum(yEnd)}</td></tr>
        <tr><td>ln(W<sub>0</sub>/W)</td><td class="num">${fmtNum(integral)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>レイリーの式を一定相対揮発度で積分した概算です。</div>
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
      </div>
    `;
  }

  function reset() {
    $('psatA').value = '';
    $('psatB').value = '';
    $('W0').value = '100';
    $('x0').value = '0.5';
    $('xW').value = '0.2';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    reset();
  });
})();
