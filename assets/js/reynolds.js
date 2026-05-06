(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ====== Unit conversions to SI ======
  const TO_SI = {
    rho:  { kgm3: 1, gcm3: 1000 },
    u:    { ms: 1, cms: 0.01 },
    Q:    { m3s: 1, m3h: 1/3600, Lmin: 1/60000, Lh: 1/3600000 },
    D:    { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    mu:   { Pas: 1, mPas: 0.001, cP: 0.001 },
    nu:   { m2s: 1, mm2s: 1e-6, cSt: 1e-6 },
  };

  // ====== Presets ======
  const PRESETS = {
    water20:    { rho: 998,  rho_unit: 'kgm3', mu: 1.0,    mu_unit: 'mPas' },
    air20:      { rho: 1.20, rho_unit: 'kgm3', mu: 0.0181, mu_unit: 'mPas' },
    ethanol20:  { rho: 789,  rho_unit: 'kgm3', mu: 1.20,   mu_unit: 'mPas' },
    glycerin20: { rho: 1261, rho_unit: 'kgm3', mu: 1410,   mu_unit: 'mPas' },
  };

  // ====== Regime comments ======
  const REGIME_COMMENT = {
    laminar:    '粘性の影響が大きく、流れは層状に整いやすい条件です。圧力損失や伝熱の計算では、層流用の相関式を使う必要があります。',
    transition: '層流と乱流の中間にあたる領域です。流れが不安定になりやすく、条件によって挙動が変わるため、設計上は注意が必要です。',
    turbulent:  '慣性の影響が大きく、流れに乱れが生じやすい条件です。圧力損失や伝熱計算では乱流用の相関式を使います。',
  };

  let currentMode = 'velocity';

  // ====== Helpers ======
  function getSI(field) {
    const v = parseFloat($(field).value);
    const unit = $(field + '_unit').value;
    if (!isFinite(v)) return NaN;
    return v * TO_SI[field][unit];
  }

  const SUP_MAP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':''};
  function toSup(s) {
    return String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  }

  function fmtRe(Re) {
    if (!isFinite(Re)) return '—';
    const abs = Math.abs(Re);
    if (abs >= 1e5) {
      const exp = Re.toExponential(2);
      const m = exp.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
      return exp;
    }
    if (abs >= 1000) return Math.round(Re).toLocaleString('en-US');
    if (abs >= 10) return Re.toFixed(1);
    return Re.toFixed(2);
  }

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e5 || abs < 1e-3) {
      const exp = v.toExponential(3);
      const m = exp.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
      return exp;
    }
    return Number(v.toPrecision(sig)).toString();
  }

  function regimeOf(Re) {
    if (Re <= 2300) return 'laminar';
    if (Re < 4000) return 'transition';
    return 'turbulent';
  }

  function regimeLabel(key) {
    return { laminar: '層流', transition: '遷移域', turbulent: '乱流' }[key];
  }

  function scalePosition(Re) {
    if (Re <= 0) return 0;
    if (Re <= 2300) return (Re / 2300) * 30;
    if (Re <= 4000) return 30 + ((Re - 2300) / 1700) * 10;
    const offset = Math.min(60, (Math.log10(Re / 4000) / 3) * 60);
    return 40 + offset;
  }

  // ====== Mode switching ======
  function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(b => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active);
    });
    document.querySelectorAll('[data-show-when]').forEach(el => {
      const modes = el.dataset.showWhen.split(/\s+/);
      el.hidden = !modes.includes(mode);
    });
    hideError();
    renderPlaceholder();
  }

  // ====== Validation & calculation ======
  function showError(msg) {
    const el = $('error');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function hideError() { $('error').style.display = 'none'; }

  function calculate() {
    hideError();

    if (currentMode === 'velocity') {
      const rho = getSI('rho'), u = getSI('u'), D = getSI('D'), mu = getSI('mu');
      if (!validatePositive({rho, u, D, mu}, ['密度', '平均流速', '管内径', '粘度'])) return;
      const Re = (rho * u * D) / mu;
      const A = Math.PI * D * D / 4;
      if (!validateResult({ Re, A })) return;
      renderResult({ Re, u, D, A, mode: 'velocity', inputs: {rho, u, D, mu} });

    } else if (currentMode === 'flowrate') {
      const rho = getSI('rho'), Q = getSI('Q'), D = getSI('D'), mu = getSI('mu');
      if (!validatePositive({rho, Q, D, mu}, ['密度', '体積流量', '管内径', '粘度'])) return;
      const A = Math.PI * D * D / 4;
      const u = Q / A;
      const Re = (rho * u * D) / mu;
      if (!validateResult({ u, Re, A })) return;
      renderResult({ Re, u, D, A, mode: 'flowrate', inputs: {rho, Q, D, mu} });

    } else if (currentMode === 'kinematic') {
      const u = getSI('u'), D = getSI('D'), nu = getSI('nu');
      if (!validatePositive({u, D, nu}, ['平均流速', '管内径', '動粘度'])) return;
      const Re = (u * D) / nu;
      const A = Math.PI * D * D / 4;
      if (!validateResult({ Re, A })) return;
      renderResult({ Re, u, D, A, mode: 'kinematic', inputs: {u, D, nu} });
    }
  }

  function validateResult(values) {
    for (const k in values) {
      const v = values[k];
      if (!isFinite(v) || v <= 0) {
        showError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
        renderPlaceholder();
        return false;
      }
    }
    return true;
  }

  function validatePositive(values, labels) {
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i++) {
      const v = values[keys[i]];
      if (!isFinite(v)) {
        showError(`${labels[i]}を入力してください。`);
        renderPlaceholder();
        return false;
      }
      if (v <= 0) {
        showError(`${labels[i]}は0より大きい値を入力してください。`);
        renderPlaceholder();
        return false;
      }
    }
    return true;
  }

  // ====== Rendering ======
  function renderPlaceholder() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  function renderResult({ Re, u, D, A, mode, inputs }) {
    const regime = regimeOf(Re);
    const pos = scalePosition(Re);
    const auxHtml = mode === 'flowrate' ? `
      <div class="result-aux">
        <div class="aux-item">
          <span class="aux-label">平均流速 u</span>
          <span class="aux-value">${fmtNum(u)} m/s</span>
        </div>
        <div class="aux-item">
          <span class="aux-label">管断面積 A</span>
          <span class="aux-value">${fmtNum(A)} m²</span>
        </div>
      </div>` : '';

    $('result-area').innerHTML = `
      <div class="result-main">
        <div class="result-label">レイノルズ数 Re</div>
        <div class="result-value-big">${fmtRe(Re)}</div>
        <span class="regime-badge ${regime}">${regimeLabel(regime)}</span>
      </div>
      <div class="regime-scale">
        <div class="scale-zones">
          <span class="z-laminar">層流</span>
          <span class="z-transition">遷移</span>
          <span class="z-turbulent">乱流</span>
        </div>
        <div class="scale-bar">
          <div class="scale-marker" style="left: ${pos.toFixed(1)}%"></div>
        </div>
        <div class="scale-labels">
          <span style="left:0%">0</span>
          <span style="left:30%;transform:translateX(-50%)">2,300</span>
          <span style="left:40%;transform:translateX(-50%)">4,000</span>
        </div>
      </div>
      ${auxHtml}
      <div class="regime-comment">${REGIME_COMMENT[regime]}</div>
      <details class="calc-process">
        <summary>計算過程を表示</summary>
        <div class="calc-process-body">${buildProcess(mode, inputs, Re, u, A)}</div>
      </details>
    `;
  }

  function buildProcess(mode, inp, Re, u, A) {
    const lines = [];
    if (mode === 'velocity') {
      lines.push(`ρ = ${fmtNum(inp.rho)} kg/m³`);
      lines.push(`u = ${fmtNum(inp.u)} m/s`);
      lines.push(`D = ${fmtNum(inp.D)} m`);
      lines.push(`μ = ${fmtNum(inp.mu)} Pa·s`);
      lines.push(``);
      lines.push(`Re = ρuD / μ`);
      lines.push(`   = ${fmtNum(inp.rho)} × ${fmtNum(inp.u)} × ${fmtNum(inp.D)} / ${fmtNum(inp.mu)}`);
      lines.push(`   = ${fmtRe(Re)}`);
    } else if (mode === 'flowrate') {
      lines.push(`ρ = ${fmtNum(inp.rho)} kg/m³`);
      lines.push(`Q = ${fmtNum(inp.Q)} m³/s`);
      lines.push(`D = ${fmtNum(inp.D)} m`);
      lines.push(`μ = ${fmtNum(inp.mu)} Pa·s`);
      lines.push(``);
      lines.push(`A = π D² / 4 = ${fmtNum(A)} m²`);
      lines.push(`u = Q / A = ${fmtNum(u)} m/s`);
      lines.push(``);
      lines.push(`Re = ρuD / μ`);
      lines.push(`   = ${fmtNum(inp.rho)} × ${fmtNum(u)} × ${fmtNum(inp.D)} / ${fmtNum(inp.mu)}`);
      lines.push(`   = ${fmtRe(Re)}`);
    } else {
      lines.push(`u = ${fmtNum(inp.u)} m/s`);
      lines.push(`D = ${fmtNum(inp.D)} m`);
      lines.push(`ν = ${fmtNum(inp.nu)} m²/s`);
      lines.push(``);
      lines.push(`Re = uD / ν`);
      lines.push(`   = ${fmtNum(inp.u)} × ${fmtNum(inp.D)} / ${fmtNum(inp.nu)}`);
      lines.push(`   = ${fmtRe(Re)}`);
    }
    return lines.join('\n');
  }

  // ====== Reset & Preset ======
  function reset() {
    ['rho', 'u', 'Q', 'D', 'mu', 'nu'].forEach(id => { if ($(id)) $(id).value = ''; });
    hideError();
    renderPlaceholder();
  }

  function applyPreset(key) {
    if (key === 'clear') {
      ['rho', 'mu'].forEach(id => $(id).value = '');
      return;
    }
    const p = PRESETS[key];
    if (!p) return;
    $('rho').value = p.rho;
    $('rho_unit').value = p.rho_unit;
    $('mu').value = p.mu;
    $('mu_unit').value = p.mu_unit;
  }

  // ====== Init ======
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => {
      b.addEventListener('click', () => setMode(b.dataset.mode));
    });
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    document.querySelectorAll('.preset-buttons button').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        applyPreset(b.dataset.preset);
      });
    });
    ['rho', 'u', 'Q', 'D', 'mu', 'nu'].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); calculate(); }
      });
    });
    setMode('velocity');
  });
})();
