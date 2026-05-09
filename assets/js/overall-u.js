(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = { delta: { m: 1, mm: 0.001 }, Rfi: { m2KW: 1 }, Rfo: { m2KW: 1 } };
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
  function nonNegative(v) { return isFinite(v) && v >= 0; }
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };
  function calculate() {
    clearError();
    const hi = val('hi');
    const ho = val('ho');
    const delta = getSI('delta');
    const k = val('k_wall');
    const Rfi = val('Rfi') || 0;
    const Rfo = val('Rfo') || 0;
    if (!positive(hi) || !positive(ho)) return setError('内側・外側の熱伝達係数を正の数値で入力してください。');
    if (!nonNegative(delta)) return setError('壁厚は 0 以上で入力してください。');
    if (delta > 0 && !positive(k)) return setError('壁厚を入力する場合は、管壁の熱伝導率を正の数値で入力してください。');
    if (!nonNegative(Rfi) || !nonNegative(Rfo)) return setError('汚れ係数は 0 以上で入力してください。');
    const parts = [
      ['内側境膜抵抗', 1 / hi],
      ['内側汚れ係数', Rfi],
      ['管壁抵抗', delta > 0 ? delta / k : 0],
      ['外側汚れ係数', Rfo],
      ['外側境膜抵抗', 1 / ho],
    ];
    const Rtotal = parts.reduce((sum, p) => sum + p[1], 0);
    if (!positive(Rtotal)) return setError('熱抵抗の合計が正になりません。入力値を確認してください。');
    const U = 1 / Rtotal;
    const maxPart = parts.reduce((a, b) => b[1] > a[1] ? b : a, parts[0]);
    $('result-area').innerHTML = `
      <div class="result-target">総括伝熱係数 <span class="sym">U</span></div>
      <div class="result-value-big">${fmtNum(U)} <span class="unit">W/(m²K)</span></div>
      <table class="unit-table"><tbody>
        <tr><td>総熱抵抗</td><td class="num">${fmtNum(Rtotal)} m²K/W</td></tr>
        <tr><td>律速寄りの抵抗</td><td class="num">${maxPart[0]}</td></tr>
      </tbody></table>
      <div class="result-detail-label">熱抵抗の内訳</div>
      <table class="unit-table"><tbody>
        ${parts.map(([label, r]) => `<tr><td>${label}</td><td class="num">${fmtNum(r)} (${fmtNum(r / Rtotal * 100, 3)}%)</td></tr>`).join('')}
      </tbody></table>
      <div class="result-note">※ 平板近似の式です。円管の内面基準・外面基準で厳密に扱う場合は、面積比を含む円筒壁の熱抵抗で確認してください。</div>
    `;
  }
  function reset() {
    ['hi','ho','delta','k_wall','Rfi','Rfo'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
