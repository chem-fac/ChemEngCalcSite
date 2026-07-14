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

  function separationLabel(alpha) {
    if (!positive(alpha)) return '判定不可';
    const a = alpha >= 1 ? alpha : 1 / alpha;
    if (a < 1.05) return 'ほぼ分離困難';
    if (a < 1.5) return '分離はかなり難しい';
    if (a < 2.5) return '中程度の分離性';
    return '比較的分離しやすい';
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

  function calculate() {
    clearError();
    const pSatA = val('psatA');
    const pSatB = val('psatB');
    const P = val('P');
    const xA = val('xA');
    if (![pSatA, pSatB, P].every(positive)) return setError('飽和蒸気圧と系圧力を正の数値で入力してください。');
    if (!fraction(xA)) return setError('液相中の成分A組成 xA は 0〜1 の範囲で入力してください。');

    const xB = 1 - xA;
    const KA = pSatA / P;
    const KB = pSatB / P;
    const alpha = KA / KB;
    const yA = alpha * xA / (1 + (alpha - 1) * xA);
    const yB = 1 - yA;
    const yRawSum = KA * xA + KB * xB;
    const sumOffset = Math.abs(yRawSum - 1);
    const equilibriumOK = sumOffset <= 0.05;
    const notes = [];
    const warns = [];
    if (alpha < 1) notes.push('成分Aの方が成分Bより揮発しにくい条件です。軽沸点成分をAにしたい場合は成分A/Bを入れ替えてください。');
    if (Math.abs(alpha - 1) < 0.05) notes.push('相対揮発度が1に近く、通常の蒸留では分離が難しい系です。');
    if (!equilibriumOK) {
      const severe = sumOffset > 0.2;
      warns.push(`ΣxK = ${fmtNum(yRawSum)} で 1 から${severe ? '大きく' : ''}外れています。入力した飽和蒸気圧・系圧力の組み合わせは沸騰平衡条件を満たしておらず、実際にはこの圧力では液相のままか全量気化しています。下表の y<sub>A</sub> は「相対揮発度 α から算出した気相比」であり、この圧力での実際の平衡組成ではありません。`);
    }

    const yLabel = equilibriumOK
      ? '気相中の成分A組成 <span class="sym">y<sub>A</sub></span>'
      : '相対揮発度から算出した気相比 <span class="sym">y<sub>A</sub></span><sup>*</sup>';

    $('result-area').innerHTML = `
      <div class="result-target">${yLabel}</div>
      <div class="result-value-big">${fmtNum(yA)} <span class="unit">mol fraction</span></div>
      <table class="unit-table"><tbody>
        <tr><td>${equilibriumOK ? '気相中の成分B組成' : '気相比'} y<sub>B</sub></td><td class="num">${fmtNum(yB)}</td></tr>
        <tr><td>K<sub>A</sub> = P<sub>A</sub><sup>sat</sup>/P</td><td class="num">${fmtNum(KA)}</td></tr>
        <tr><td>K<sub>B</sub> = P<sub>B</sub><sup>sat</sup>/P</td><td class="num">${fmtNum(KB)}</td></tr>
        <tr><td>相対揮発度 α<sub>AB</sub></td><td class="num">${fmtNum(alpha)}</td></tr>
        <tr><td>分離しやすさ</td><td class="num">${separationLabel(alpha)}</td></tr>
        <tr><td>ΣxK（沸騰平衡判定）</td><td class="num">${fmtNum(yRawSum)}${equilibriumOK ? '' : ' ⚠'}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>理想溶液・理想気体を仮定し、Raoult則から K値と相対揮発度を計算しています。沸騰平衡条件では ΣxK ≈ 1 になります。</div>
        ${warns.map(n => `<div class="result-note-warn">⚠ ${n}</div>`).join('')}
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
      </div>
    `;
  }

  function reset() {
    $('psatA').value = '';
    $('psatB').value = '';
    $('P').value = '101.325';
    $('xA').value = '0.5';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    reset();
  });
})();
