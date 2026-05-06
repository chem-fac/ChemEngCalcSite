(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ====== Unit conversions to SI ======
  const TO_SI = {
    u: { ms: 1, cms: 0.01 },
    Q: { m3s: 1, m3h: 1 / 3600, Lmin: 1 / 60000, Lh: 1 / 3600000 },
    D: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    Do: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    t: { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
  };

  // ====== Output unit options ======
  const OUT_UNITS = {
    Q: [
      { v: 'm3h', label: 'm³/h', factor: 3600 },
      { v: 'Lmin', label: 'L/min', factor: 60000 },
      { v: 'Lh', label: 'L/h', factor: 3600000 },
      { v: 'm3s', label: 'm³/s', factor: 1 },
    ],
    u: [
      { v: 'ms', label: 'm/s', factor: 1 },
      { v: 'cms', label: 'cm/s', factor: 100 },
    ],
    D: [
      { v: 'mm', label: 'mm', factor: 1000 },
      { v: 'cm', label: 'cm', factor: 100 },
      { v: 'm', label: 'm', factor: 1 },
      { v: 'inch', label: 'inch', factor: 1 / 0.0254 },
    ],
  };

  let currentMode = 'flowrate'; // flowrate | velocity | diameter
  let dInputMode = 'inner';      // inner | outer

  function getSI(field) {
    const v = parseFloat($(field).value);
    const unit = $(field + '_unit').value;
    if (!isFinite(v)) return NaN;
    return v * TO_SI[field][unit];
  }

  // Returns { D, source: 'inner'|'outer', Do_si, t_si } or { error: string }
  function getInnerDiameter() {
    if (dInputMode === 'inner') {
      const D = getSI('D');
      if (!isFinite(D) || D <= 0) return { error: '管内径を正の数値で入力してください。' };
      return { D, source: 'inner' };
    }
    const Do = getSI('Do');
    const t = getSI('t');
    if (!isFinite(Do) || !isFinite(t)) return { error: '外径と肉厚を数値で入力してください。' };
    if (Do <= 0 || t <= 0) return { error: '外径と肉厚は正の値で入力してください。' };
    const D = Do - 2 * t;
    if (D <= 0) return { error: '外径に対して肉厚が大きすぎます。Di = Do − 2t > 0 となる値を入力してください。' };
    return { D, source: 'outer', Do, t };
  }

  function diameterMetaText(info) {
    if (info.source !== 'outer') return '';
    return `<div>外径 <span class="sym">D<sub>o</sub></span> = ${fmtNum(info.Do * 1000)} mm, 肉厚 <span class="sym">t</span> = ${fmtNum(info.t * 1000)} mm → 実内径 <span class="sym">D<sub>i</sub></span> = ${fmtNum(info.D * 1000)} mm</div>`;
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

  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  function toSup(s) {
    return String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  }

  // ====== Mode switching ======
  function applyMode() {
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === currentMode);
    });
    document.querySelectorAll('.input-row[data-show-when]').forEach(row => {
      const modes = row.dataset.showWhen.split(/\s+/);
      const visible = modes.includes(currentMode);
      row.hidden = !visible;
    });
    clearError();
  }

  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
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

  // ====== Calculations ======
  function calcArea(D) {
    return Math.PI * D * D / 4;
  }

  function calculate() {
    clearError();
    let result;

    if (currentMode === 'flowrate') {
      const u = getSI('u');
      if (!isFinite(u)) return setError('平均流速を数値で入力してください。');
      if (u <= 0) return setError('平均流速は正の値で入力してください。');
      const dInfo = getInnerDiameter();
      if (dInfo.error) return setError(dInfo.error);
      const A = calcArea(dInfo.D);
      const Q = u * A;
      if (!validateOutputs({ A, Q })) return;
      result = renderFlowrate(Q, A, u, dInfo);
    } else if (currentMode === 'velocity') {
      const Q = getSI('Q');
      if (!isFinite(Q)) return setError('体積流量を数値で入力してください。');
      if (Q <= 0) return setError('体積流量は正の値で入力してください。');
      const dInfo = getInnerDiameter();
      if (dInfo.error) return setError(dInfo.error);
      const A = calcArea(dInfo.D);
      const u = Q / A;
      if (!validateOutputs({ A, u })) return;
      result = renderVelocity(u, A, Q, dInfo);
    } else if (currentMode === 'diameter') {
      const Q = getSI('Q');
      const u = getSI('u');
      if (!isFinite(Q) || !isFinite(u)) return setError('体積流量と平均流速を数値で入力してください。');
      if (Q <= 0 || u <= 0) return setError('体積流量と平均流速は正の値で入力してください。');
      const A = Q / u;
      const D = Math.sqrt(4 * A / Math.PI);
      if (!validateOutputs({ A, D })) return;
      result = renderDiameter(D, A, Q, u);
    }

    $('result-area').innerHTML = result;
  }

  function validateOutputs(values) {
    for (const k in values) {
      const v = values[k];
      if (!isFinite(v) || v <= 0) {
        setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
        return false;
      }
    }
    return true;
  }

  function unitsTable(field, valueSI) {
    const rows = OUT_UNITS[field].map(opt => {
      const v = valueSI * opt.factor;
      return `<tr><td>${opt.label}</td><td class="num">${fmtNum(v)}</td></tr>`;
    }).join('');
    return `<table class="unit-table"><tbody>${rows}</tbody></table>`;
  }

  function renderFlowrate(Q, A, u, dInfo) {
    const primary = OUT_UNITS.Q[0];
    return `
      <div class="result-target">体積流量 <span class="sym">Q</span></div>
      <div class="result-value-big">${fmtNum(Q * primary.factor)} <span class="unit">${primary.label}</span></div>
      <div class="result-detail-label">他単位での値</div>
      ${unitsTable('Q', Q)}
      <div class="result-meta">
        <div>断面積 <span class="sym">A</span> = ${fmtNum(A * 10000)} cm² (= ${fmtNum(A)} m²)</div>
        <div>入力 <span class="sym">u</span> = ${fmtNum(u)} m/s, <span class="sym">D</span> = ${fmtNum(dInfo.D * 1000)} mm</div>
        ${diameterMetaText(dInfo)}
      </div>
    `;
  }

  function renderVelocity(u, A, Q, dInfo) {
    const primary = OUT_UNITS.u[0];
    return `
      <div class="result-target">平均流速 <span class="sym">u</span></div>
      <div class="result-value-big">${fmtNum(u * primary.factor)} <span class="unit">${primary.label}</span></div>
      <div class="result-detail-label">他単位での値</div>
      ${unitsTable('u', u)}
      <div class="result-meta">
        <div>断面積 <span class="sym">A</span> = ${fmtNum(A * 10000)} cm² (= ${fmtNum(A)} m²)</div>
        <div>入力 <span class="sym">Q</span> = ${fmtNum(Q * 3600)} m³/h, <span class="sym">D</span> = ${fmtNum(dInfo.D * 1000)} mm</div>
        ${diameterMetaText(dInfo)}
      </div>
    `;
  }

  function renderDiameter(D, A, Q, u) {
    const primary = OUT_UNITS.D[0];
    return `
      <div class="result-target">管内径 <span class="sym">D</span></div>
      <div class="result-value-big">${fmtNum(D * primary.factor)} <span class="unit">${primary.label}</span></div>
      <div class="result-detail-label">他単位での値</div>
      ${unitsTable('D', D)}
      <div class="result-meta">
        <div>必要断面積 <span class="sym">A</span> = ${fmtNum(A * 10000)} cm² (= ${fmtNum(A)} m²)</div>
        <div>入力 <span class="sym">Q</span> = ${fmtNum(Q * 3600)} m³/h, <span class="sym">u</span> = ${fmtNum(u)} m/s</div>
        <div class="result-note">※ 算出された管内径に最も近い規格管（呼び径）を選定し、肉厚に応じた実内径で再計算することをおすすめします。</div>
      </div>
    `;
  }

  function reset() {
    ['Q', 'u', 'D', 'Do', 't'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    clearError();
    clearResult();
  }

  function applyDInputMode() {
    document.querySelectorAll('.d-mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.dMode === dInputMode);
    });
    document.querySelectorAll('.d-mode-pane').forEach(p => {
      p.hidden = p.dataset.dPane !== dInputMode;
    });
    clearError();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.addEventListener('click', () => {
        currentMode = t.dataset.mode;
        applyMode();
      });
    });
    document.querySelectorAll('.d-mode-tab').forEach(t => {
      t.addEventListener('click', () => {
        dInputMode = t.dataset.dMode;
        applyDInputMode();
      });
    });
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    applyMode();
    applyDInputMode();
  });
})();
