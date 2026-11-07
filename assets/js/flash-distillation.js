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
    const _ra = $('result-area'); if (_ra) _ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; 
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
    // This denominator also retains K at beta=1 when K-1 rounds to -1.
    const term = (z, K) => z === 0 ? 0 : z * ((K - 1) / ((1 - beta) + beta * K));
    return term(zA, KA) + term(1 - zA, KB);
  }

  function solveFlash(zA, KA, KB, endpoints) {
    if (!fraction(zA) || !positive(KA) || !positive(KB)) throw new Error('組成とK値の入力範囲を確認してください。');
    const zB = 1 - zA;
    const allUnit = (zA === 0 || KA === 1) && (zB === 0 || KB === 1);
    if (allUnit) return { phase: 'indeterminate', beta: null, xA: zA, xB: zB, yA: zA, yB: zB };
    const f0 = endpoints ? endpoints.f0 : rr(0, zA, KA, KB);
    const f1 = endpoints ? endpoints.f1 : rr(1, zA, KA, KB);
    if (Number.isNaN(f0) || Number.isNaN(f1)) throw new Error('K値の組み合わせで相判定の数値範囲を超えました。');
    if (f0 < 0) return { phase: 'liquid', beta: 0, xA: zA, xB: zB, yA: null, yB: null };
    if (f1 > 0) return { phase: 'vapor', beta: 1, xA: null, xB: null, yA: zA, yB: zB };
    let low = 0, high = 1, beta, phase;
    if (f0 === 0) { beta = 0; phase = 'bubble'; }
    else if (f1 === 0) { beta = 1; phase = 'dew'; }
    else phase = 'two-phase';
    let xA, xB, yA, yB, normalizationError;
    for (let i = 0; i < 1100; i++) {
      if (phase === 'two-phase') beta = low + (high - low) / 2;
      xA = zA / ((1 - beta) + beta * KA); xB = zB / ((1 - beta) + beta * KB);
      yA = KA * xA; yB = KB * xB;
      normalizationError = Math.max(Math.abs(xA + xB - 1), Math.abs(yA + yB - 1));
      if (phase !== 'two-phase' || (high - low <= 1e-12 && normalizationError <= 1e-10)) break;
      const f = rr(beta, zA, KA, KB);
      // Never stop solely on |f|: a nearly flat RR curve can have a large beta error.
      // Sign comparisons avoid underflow in products of small endpoint residuals.
      if (f > 0) low = beta;
      else high = beta;
      if (low === high || low + (high - low) / 2 === low || low + (high - low) / 2 === high) break;
    }
    if (![xA, xB, yA, yB].every(fraction) || normalizationError > 1e-10 || (phase === 'two-phase' && high - low > 1e-12)) throw new Error('入力値の組み合わせで計算精度を確保できません。圧力と組成の桁数を確認してください。');
    return { phase, beta, xA, xB, yA, yB, bracketWidth: phase === 'two-phase' ? high - low : 0, normalizationError,
      compositionSensitivity: phase === 'two-phase' ? Math.abs(1 / (KA - 1) - 1 / (KB - 1)) : null };
  }

  function solveFlashAtPressure(zA, pSatA, pSatB, P) {
    if (![pSatA, pSatB, P].every(positive)) throw new Error('飽和蒸気圧と系圧力を正の数値で入力してください。');
    const KA = pSatA / P, KB = pSatB / P, zB = 1 - zA;
    // Evaluate endpoints from pressure differences to retain exact pressure boundaries.
    const term = (z, pSat, denominator) => z === 0 ? 0 : z * ((pSat - P) / denominator);
    const f0 = term(zA, pSatA, P) + term(zB, pSatB, P);
    const f1 = term(zA, pSatA, pSatA) + term(zB, pSatB, pSatB);
    return solveFlash(zA, KA, KB, { f0, f1 });
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
    if (![KA, KB, alpha].every(positive)) return setError('K値または相対揮発度が数値範囲を超えました。圧力の桁を見直してください。');
    let result;
    try { result = solveFlashAtPressure(zA, pSatA, pSatB, P); } catch (error) { return setError(error.message); }
    const { beta, xA, xB, yA, yB } = result;
    const phase = { liquid: '全液相', vapor: '全気相', bubble: '泡点境界', dew: '露点境界', 'two-phase': '気液二相', indeterminate: '相量未定' }[result.phase];
    const notes = [];
    const V = beta === null ? null : F * beta;
    const L = beta === null ? null : F * (1 - beta);
    if (result.phase === 'indeterminate') notes.push('供給に含まれる全成分のK値が1で、どの蒸気率でも気液の組成が供給組成と一致します。この入力だけでは相量を決められません。熱量などの追加条件が必要です。');
    if (result.phase === 'bubble') notes.push('液体から蒸気が現れ始める境目です。蒸気流量は0で、気相組成は現れ始める蒸気の組成です。');
    if (result.phase === 'dew') notes.push('蒸気から液体が現れ始める境目です。液流量は0で、液相組成は現れ始める液体の組成です。');
    if (result.phase === 'liquid' || result.phase === 'vapor') notes.push('この固定Kモデルでは単相です。存在しない相の組成は表示しません。');
    if (result.phase === 'two-phase') notes.push('K値が1に近い条件では、入力のわずかな違いで蒸気率が大きく変わることがあります。');
    if (alpha < 1) notes.push('成分Aの方が成分Bより揮発しにくい条件です。軽沸点成分をAにしたい場合は成分A/Bを入れ替えてください。');

    const composition = value => value === null ? '存在しない相' : fmtNum(value);
    const flow = value => value === null ? '未定' : fmtNum(value) + ' kmol/h';

    $('result-area').innerHTML = `
      <div class="result-target">蒸気率 β（${phase}）</div>
      <div class="result-value-big">${beta === null ? '未定' : fmtNum(beta)} <span class="unit">-</span></div>
      <table class="unit-table"><tbody>
        <tr><td>気相流量 V</td><td class="num">${flow(V)}</td></tr>
        <tr><td>液相流量 L</td><td class="num">${flow(L)}</td></tr>
        <tr><td>液相組成 x<sub>A</sub></td><td class="num">${composition(xA)}</td></tr>
        <tr><td>液相組成 x<sub>B</sub></td><td class="num">${composition(xB)}</td></tr>
        <tr><td>気相組成 y<sub>A</sub></td><td class="num">${composition(yA)}</td></tr>
        <tr><td>気相組成 y<sub>B</sub></td><td class="num">${composition(yB)}</td></tr>
        <tr><td>K<sub>A</sub></td><td class="num">${fmtNum(KA)}</td></tr>
        <tr><td>K<sub>B</sub></td><td class="num">${fmtNum(KB)}</td></tr>
        <tr><td>相対揮発度 α<sub>AB</sub></td><td class="num">${fmtNum(alpha)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>入力: F = ${fmtNum(F)} kmol/h, z<sub>A</sub> = ${fmtNum(zA)}, P = ${fmtNum(P)} kPaA</div>
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

  if (typeof module !== 'undefined' && module.exports) module.exports = { solveFlash, solveFlashAtPressure, rr };
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    reset();
  });
})();
