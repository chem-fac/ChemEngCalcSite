(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    b: { m: 1, cm: 0.01, mm: 0.001 },
    d: { m: 1, cm: 0.01, mm: 0.001 },
    D: { m: 1, cm: 0.01, mm: 0.001 },
    H: { m: 1, cm: 0.01, mm: 0.001 },
    n: { rps: 1, rpm: 1 / 60 },
  };
  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '—';
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
  function getSI(f) {
    const el = $(f);
    if (!el || el.value === '') return NaN;
    const v = parseFloat(el.value);
    const sel = $(f + '_unit');
    const u = sel ? sel.value : null;
    return isFinite(v) ? v * (TO_SI[f] && u ? TO_SI[f][u] : 1) : NaN;
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  function calculate() {
    clearError();
    const Np = parseFloat($('Np').value);
    const np = parseFloat($('np').value);
    const n = getSI('n');
    const b = getSI('b');
    const d = getSI('d');
    const D = getSI('D');
    const H = getSI('H');
    if (![Np, np, n, b, d, D].every(positive)) {
      return setError('動力数 Np・羽根枚数・回転数・翼幅・翼径・槽径を正の数値で入力してください。');
    }
    if (D <= d) return setError('槽径 D は翼径 d より大きい必要があります。');

    const Dd = D / d;
    const bd = b / d;
    const dD = d / D;
    const bladeTerm = Math.pow(np, 0.7) * bd;
    const Nqd = 0.32 * Math.pow(bladeTerm, 0.25) * Math.pow(Dd, 0.34) * Math.pow(Np, 0.5);
    const Nqc = Nqd * (1 + 0.16 * (Math.pow(Dd, 2) - 1));
    const qd = Nqd * n * Math.pow(d, 3);
    const qc = Nqc * n * Math.pow(d, 3);
    if (![Nqd, Nqc, qd, qc].every(positive)) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
    }

    let circulationTime = '';
    if (positive(H)) {
      const V = Math.PI * D * D * H / 4;
      const tc = V / qc;
      circulationTime = `
        <div class="result-detail-label">槽内循環の目安</div>
        <table class="unit-table"><tbody>
          <tr><td>液量 <span class="sym">V</span></td><td class="num">${fmtNum(V)} m³</td></tr>
          <tr><td>循環時間 <span class="sym">t<sub>c</sub> = V/q<sub>c</sub></span></td><td class="num">${fmtNum(tc)} s (= ${fmtNum(tc / 60)} min)</td></tr>
        </tbody></table>
      `;
    }

    const note = (dD < 0.2 || dD > 0.6 || bd < 0.05 || bd > 0.4)
      ? '<div class="result-note">※ 寸法比が一般的な撹拌槽の範囲から外れている可能性があります。相関式の適用性を確認してください。</div>'
      : '';

    $('result-area').innerHTML = `
      <div class="result-target">循環流量 <span class="sym">q<sub>c</sub></span></div>
      <div class="result-value-big">${fmtNum(qc * 3600)} <span class="unit">m³/h</span></div>
      <div class="result-detail-label">吐出流量</div>
      <table class="unit-table"><tbody>
        <tr><td>吐出流量 <span class="sym">q<sub>d</sub></span></td><td class="num">${fmtNum(qd)} m³/s</td></tr>
        <tr><td>吐出流量 <span class="sym">q<sub>d</sub></span></td><td class="num">${fmtNum(qd * 3600)} m³/h</td></tr>
        <tr><td>吐出流量 <span class="sym">q<sub>d</sub></span></td><td class="num">${fmtNum(qd * 60000)} L/min</td></tr>
        <tr><td>吐出流量数 <span class="sym">N<sub>qd</sub></span></td><td class="num">${fmtNum(Nqd)} ［-］</td></tr>
      </tbody></table>
      <div class="result-detail-label">循環流量</div>
      <table class="unit-table"><tbody>
        <tr><td>循環流量 <span class="sym">q<sub>c</sub></span></td><td class="num">${fmtNum(qc)} m³/s</td></tr>
        <tr><td>循環流量 <span class="sym">q<sub>c</sub></span></td><td class="num">${fmtNum(qc * 3600)} m³/h</td></tr>
        <tr><td>循環流量 <span class="sym">q<sub>c</sub></span></td><td class="num">${fmtNum(qc * 60000)} L/min</td></tr>
        <tr><td>循環流量数 <span class="sym">N<sub>qc</sub></span></td><td class="num">${fmtNum(Nqc)} ［-］</td></tr>
      </tbody></table>
      ${circulationTime}
      <div class="result-meta">
        <div>吐出流量数：<span class="sym">N<sub>qd</sub></span> = 0.32(n<sub>p</sub><sup>0.7</sup>b/d)<sup>0.25</sup>(D/d)<sup>0.34</sup><span class="sym">N<sub>p</sub></span><sup>0.5</sup></div>
        <div>循環流量数：<span class="sym">N<sub>qc</sub></span> = <span class="sym">N<sub>qd</sub></span>[1 + 0.16{(D/d)<sup>2</sup> - 1}]</div>
        <div>流量：<span class="sym">q<sub>d</sub></span> = <span class="sym">N<sub>qd</sub></span>nd³, <span class="sym">q<sub>c</sub></span> = <span class="sym">N<sub>qc</sub></span>nd³</div>
        <div>入力 <span class="sym">N<sub>p</sub></span> = ${fmtNum(Np)}, <span class="sym">n<sub>p</sub></span> = ${fmtNum(np)}, <span class="sym">b/d</span> = ${fmtNum(bd)}, <span class="sym">D/d</span> = ${fmtNum(Dd)}, <span class="sym">n</span> = ${fmtNum(n)} 1/s</div>
        ${note}
        <div class="result-note">※ 乱流条件下の概算式です。翼種やバッフル条件によって吐出流量特性は変わります。</div>
      </div>
    `;
  }
  function reset() {
    ['Np','np','n','b','d','D','H'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
  });
})();
