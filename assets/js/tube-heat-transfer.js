(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    mu: { Pas: 1, mPas: 0.001, cP: 0.001 },
    cp: { JkgK: 1, kJkgK: 1000, kcalkgK: 4186.8 },
    D: { m: 1, mm: 0.001, cm: 0.01 },
    rho: { kgm3: 1, gcm3: 1000 },
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
  function calculate() {
    clearError();
    const rho = getSI('rho');
    const u = val('velocity');
    const D = getSI('D');
    const mu = getSI('mu');
    const cp = getSI('cp');
    const k = val('k_fluid');
    const n = $('thermal_mode').value === 'heating' ? 0.4 : 0.3;
    if (![rho, u, D, mu, cp, k].every(positive)) {
      return setError('密度・流速・管内径・粘度・比熱・熱伝導率を正の数値で入力してください。');
    }
    const Re = rho * u * D / mu;
    const Pr = cp * mu / k;
    const Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(Pr, n);
    const h = Nu * k / D;
    const notes = [];
    if (Re < 2300) notes.push('層流域です。Dittus-Boelter式ではなく層流の相関式を検討してください。');
    else if (Re < 10000) notes.push('遷移域です。Dittus-Boelter式の誤差が大きくなる可能性があります。');
    if (Pr < 0.7 || Pr > 100) notes.push('Pr数が代表的な適用範囲（0.7〜100）から外れています。');
    $('result-area').innerHTML = `
      <div class="result-target">管内熱伝達係数 <span class="sym">h</span></div>
      <div class="result-value-big">${fmtNum(h)} <span class="unit">W/(m²K)</span></div>
      <table class="unit-table"><tbody>
        <tr><td>Reynolds数 Re</td><td class="num">${fmtNum(Re)} ［-］</td></tr>
        <tr><td>Prandtl数 Pr</td><td class="num">${fmtNum(Pr)} ［-］</td></tr>
        <tr><td>Nusselt数 Nu</td><td class="num">${fmtNum(Nu)} ［-］</td></tr>
        <tr><td>指数 n</td><td class="num">${n}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>相関式：Nu = 0.023Re<sup>0.8</sup>Pr<sup>${n}</sup></div>
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
        <div class="result-note">※ 単相・滑らかな円管内の十分発達した乱流の概算です。沸騰・凝縮や大きな物性変化を伴う場合は別途確認してください。</div>
      </div>
    `;
  }
  function reset() {
    ['rho','velocity','D','mu','cp','k_fluid'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
