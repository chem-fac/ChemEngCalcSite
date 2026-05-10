(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    mu: { Pas: 1, mPas: 0.001, cP: 0.001 },
    mu_wall: { Pas: 1, mPas: 0.001, cP: 0.001 },
    cp: { JkgK: 1, kJkgK: 1000, kcalkgK: 4186.8 },
    D: { m: 1, mm: 0.001, cm: 0.01 },
    L: { m: 1, mm: 0.001, cm: 0.01 },
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

  let mode = 'tube-turbulent';

  const MODE_LABELS = {
    'tube-laminar': '円管内・層流入口域',
    'tube-turbulent': '円管内・乱流',
    'flat-turbulent': '平板上・乱流強制対流',
    'vertical-natural': '垂直平板・自然対流',
  };

  function renderResult(opts) {
    const notes = opts.notes || [];
    $('result-area').innerHTML = `
      <div class="result-target">${opts.title}</div>
      <div class="result-value-big">${fmtNum(opts.h)} <span class="unit">W/(m²K)</span></div>
      <table class="unit-table"><tbody>
        ${opts.rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}
      </tbody></table>
      <div class="result-meta">
        <div>相関式：${opts.formula}</div>
        ${notes.map(n => `<div class="result-note">※ ${n}</div>`).join('')}
        <div class="result-note">※ 代表物性は膜温度または平均温度で評価してください。相変化、強い物性変化、非ニュートン流体では別途検討が必要です。</div>
      </div>
    `;
  }

  function commonProps() {
    const rho = getSI('rho');
    const mu = getSI('mu');
    const cp = getSI('cp');
    const k = val('k_fluid');
    if (![rho, mu, cp, k].every(positive)) {
      setError('密度・粘度・比熱・熱伝導率を正の数値で入力してください。');
      return null;
    }
    return { rho, mu, cp, k, Pr: cp * mu / k };
  }

  function calculateTubeLaminar(props) {
    const u = val('velocity');
    const D = getSI('D');
    const L = getSI('L');
    const muWallRaw = getSI('mu_wall');
    if (![u, D, L].every(positive)) return setError('平均流速・管内径・管長を正の数値で入力してください。');
    const muWall = positive(muWallRaw) ? muWallRaw : props.mu;
    const Re = props.rho * u * D / props.mu;
    const muRatio = props.mu / muWall;
    const Nu = 1.86 * Math.pow(Re * props.Pr * D / L, 1 / 3) * Math.pow(muRatio, 0.14);
    const h = Nu * props.k / D;
    const notes = [];
    if (Re > 2100) notes.push('Re が代表的な適用範囲（Re ≦ 2.1×10³）を超えています。乱流の相関式を検討してください。');
    if (!positive(muWallRaw)) notes.push('壁温粘度 μw が未入力のため、μ/μw = 1 として計算しました。');
    renderResult({
      title: '管内熱伝達係数 h',
      h,
      rows: [
        ['Reynolds数 Re', `${fmtNum(Re)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Nusselt数 Nu', `${fmtNum(Nu)} ［-］`],
        ['L/D', `${fmtNum(L / D)} ［-］`],
        ['μ/μw', `${fmtNum(muRatio)} ［-］`],
      ],
      formula: 'Nu = 1.86(Re Pr D/L)<sup>1/3</sup>(μ/μw)<sup>0.14</sup>',
      notes,
    });
  }

  function calculateTubeTurbulent(props) {
    const u = val('velocity');
    const D = getSI('D');
    if (![u, D].every(positive)) return setError('平均流速・管内径を正の数値で入力してください。');
    const n = $('thermal_mode').value === 'heating' ? 0.4 : 0.3;
    const Re = props.rho * u * D / props.mu;
    const Nu = 0.023 * Math.pow(Re, 0.8) * Math.pow(props.Pr, n);
    const h = Nu * props.k / D;
    const notes = [];
    if (Re < 2300) notes.push('層流域です。層流入口域の相関式などを検討してください。');
    else if (Re < 10000) notes.push('遷移域です。Dittus-Boelter式の誤差が大きくなる可能性があります。');
    if (Re > 1.2e5) notes.push('Re が代表的な適用範囲（10⁴〜1.2×10⁵）を超えています。');
    if (props.Pr < 0.7 || props.Pr > 120) notes.push('Pr数が代表的な適用範囲（0.7〜120）から外れています。');
    renderResult({
      title: '管内熱伝達係数 h',
      h,
      rows: [
        ['Reynolds数 Re', `${fmtNum(Re)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Nusselt数 Nu', `${fmtNum(Nu)} ［-］`],
        ['指数 n', n],
      ],
      formula: `Nu = 0.023Re<sup>0.8</sup>Pr<sup>${n}</sup>`,
      notes,
    });
  }

  function calculateFlatTurbulent(props) {
    const u = val('velocity');
    const L = getSI('L');
    if (![u, L].every(positive)) return setError('平均流速・代表長さを正の数値で入力してください。');
    const Re = props.rho * u * L / props.mu;
    const Nu = 0.036 * Math.pow(Re, 0.8) * Math.pow(props.Pr, 1 / 3);
    const h = Nu * props.k / L;
    const notes = [];
    if (Re < 5e5) notes.push('平板上で乱流境界層が十分発達していない可能性があります。');
    if (props.Pr < 0.6 || props.Pr > 400) notes.push('Pr数が代表的な適用範囲（0.6〜400）から外れています。');
    renderResult({
      title: '平均熱伝達係数 h',
      h,
      rows: [
        ['Reynolds数 Re<sub>L</sub>', `${fmtNum(Re)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Nusselt数 Nu<sub>L</sub>', `${fmtNum(Nu)} ［-］`],
      ],
      formula: 'Nu = 0.036Re<sup>0.8</sup>Pr<sup>1/3</sup>',
      notes,
    });
  }

  function calculateVerticalNatural(props) {
    const L = getSI('L');
    const beta = val('beta');
    const dT = val('deltaT');
    if (![L, beta, dT].every(positive)) return setError('代表長さ・体膨張係数・温度差を正の数値で入力してください。');
    const g = 9.80665;
    const nu = props.mu / props.rho;
    const Gr = g * beta * dT * Math.pow(L, 3) / Math.pow(nu, 2);
    const GrPr = Gr * props.Pr;
    const Nu = 0.555 * Math.pow(GrPr, 1 / 4);
    const h = Nu * props.k / L;
    const notes = [];
    if (GrPr < 1e4) notes.push('GrPr が代表的な適用下限（10⁴程度）を下回っています。');
    if (GrPr > 1e9) notes.push('層流自然対流の範囲を超える可能性があります。乱流自然対流の相関式も確認してください。');
    renderResult({
      title: '平均熱伝達係数 h',
      h,
      rows: [
        ['Grashof数 Gr', `${fmtNum(Gr)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Gr・Pr', `${fmtNum(GrPr)} ［-］`],
        ['Nusselt数 Nu', `${fmtNum(Nu)} ［-］`],
      ],
      formula: 'Nu = 0.555(Gr Pr)<sup>1/4</sup>',
      notes,
    });
  }

  function calculate() {
    clearError();
    const props = commonProps();
    if (!props) return;
    if (mode === 'tube-laminar') return calculateTubeLaminar(props);
    if (mode === 'flat-turbulent') return calculateFlatTurbulent(props);
    if (mode === 'vertical-natural') return calculateVerticalNatural(props);
    return calculateTubeTurbulent(props);
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next);
    });
    const result = $('selected-correlation');
    if (result) result.textContent = MODE_LABELS[next] || '';
    clearError();
    clearResult();
  }

  function reset() {
    ['rho','velocity','D','L','mu','mu_wall','cp','k_fluid','beta','deltaT'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
