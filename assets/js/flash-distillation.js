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
    return isFinite(v) && v >= 0 && v <= 1;
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

  function rr(beta, zA, KA, KB) {
    const zB = 1 - zA;
    return zA * (KA - 1) / (1 + beta * (KA - 1)) +
           zB * (KB - 1) / (1 + beta * (KB - 1));
  }

  function bisect(fn, low, high) {
    let fLow = fn(low);
    let mid = NaN;
    for (let i = 0; i < 100; i++) {
      mid = (low + high) / 2;
      const fMid = fn(mid);
      if (Math.abs(fMid) < 1e-10 || Math.abs(high - low) < 1e-8) return mid;
      if (fLow * fMid <= 0) {
        high = mid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }
    return mid;
  }

  function calculate() {
    clearError();
    const pSatA = val('psatA');
    const pSatB = val('psatB');
    const P = val('P');
    const zA = val('zA');
    const F = val('F');
    if (![pSatA, pSatB, P, F].every(positive)) return setError('飽和蒸気圧、系圧力、供給流量を正の数値で入力してください。');
    if (!fraction(zA)) return setError('供給中の成分A組成 zA は 0〜1 の範囲で入力してください。');

    const KA = pSatA / P;
    const KB = pSatB / P;
    const alpha = KA / KB;
    const f0 = rr(0, zA, KA, KB);
    const f1 = rr(1, zA, KA, KB);
    let beta;
    let phase;
    let xA;
    let yA;
    const notes = [];

    if (f0 <= 0) {
      beta = 0;
      phase = '全液相';
      xA = zA;
      const yRawA = KA * xA;
      const yRawB = KB * (1 - xA);
      yA = yRawA / (yRawA + yRawB);
      notes.push('Rachford-Rice式に0〜1の二相根がないため、全液相として判定しました。');
    } else if (f1 >= 0) {
      beta = 1;
      phase = '全気相';
      yA = zA;
      const xRawA = yA / KA;
      const xRawB = (1 - yA) / KB;
      xA = xRawA / (xRawA + xRawB);
      notes.push('Rachford-Rice式に0〜1の二相根がないため、全気相として判定しました。');
    } else {
      beta = bisect(b => rr(b, zA, KA, KB), 0, 1);
      phase = '気液二相';
      xA = zA / (1 + beta * (KA - 1));
      yA = KA * xA;
    }

    const V = F * beta;
    const L = F - V;
    const xB = 1 - xA;
    const yB = 1 - yA;
    if (alpha < 1) notes.push('成分Aの方が成分Bより揮発しにくい条件です。軽沸点成分をAにしたい場合は成分A/Bを入れ替えてください。');

    $('result-area').innerHTML = `
      <div class="result-target">蒸気率 β（${phase}）</div>
      <div class="result-value-big">${fmtNum(beta)} <span class="unit">-</span></div>
      <table class="unit-table"><tbody>
        <tr><td>気相流量 V</td><td class="num">${fmtNum(V)} kmol/h</td></tr>
        <tr><td>液相流量 L</td><td class="num">${fmtNum(L)} kmol/h</td></tr>
        <tr><td>液相組成 x<sub>A</sub></td><td class="num">${fmtNum(xA)}</td></tr>
        <tr><td>液相組成 x<sub>B</sub></td><td class="num">${fmtNum(xB)}</td></tr>
        <tr><td>気相組成 y<sub>A</sub></td><td class="num">${fmtNum(yA)}</td></tr>
        <tr><td>気相組成 y<sub>B</sub></td><td class="num">${fmtNum(yB)}</td></tr>
        <tr><td>K<sub>A</sub></td><td class="num">${fmtNum(KA)}</td></tr>
        <tr><td>K<sub>B</sub></td><td class="num">${fmtNum(KB)}</td></tr>
        <tr><td>相対揮発度 α<sub>AB</sub></td><td class="num">${fmtNum(alpha)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>入力: F = ${fmtNum(F)} kmol/h, z<sub>A</sub> = ${fmtNum(zA)}, P = ${fmtNum(P)} kPa abs</div>
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
      </div>
    `;
  }

  function reset() {
    $('psatA').value = '';
    $('psatB').value = '';
    $('P').value = '101.325';
    $('zA').value = '0.5';
    $('F').value = '100';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    reset();
  });
})();
