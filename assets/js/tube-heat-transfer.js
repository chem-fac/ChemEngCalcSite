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
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const _ra = $('result-area'); if (_ra) _ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
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

  // 平板・乱流（前縁から乱流と仮定した平均値）
  // Lienhard & Lienhard, A Heat Transfer Textbook, 6th ed. (v6.00, 2024):
  //   局所式 Nu_x = 0.0296 Re_x^0.8 Pr^0.6（気体, 式(6.112) p.326）
  //          Nu_x = 0.032  Re_x^0.8 Pr^0.43（非金属液体, Pr ≦ 85, 式(6.113) p.327）
  //   式(6.119)（p.334）で x = 0〜L を積分（遷移域なし）→ Nu_L = (係数/0.8) Re_L^0.8 Pr^n。
  //   気体側は式(6.120)（p.334）で Re_l = Re_u = 0 とした形と同じ。
  //   2式の Nu_x が等しくなる Pr（≈1.58）で切り替える（= 2式の小さい方、Nu は連続）。
  const FLAT_PR_SWITCH = Math.pow(0.032 / 0.0296, 1 / (0.6 - 0.43));
  function flatPlateTurbulentNu(Re, Pr) {
    const liquid = Pr > FLAT_PR_SWITCH;
    return liquid
      ? { Nu: (0.032 / 0.8) * Math.pow(Re, 0.8) * Math.pow(Pr, 0.43), liquid }
      : { Nu: (0.0296 / 0.8) * Math.pow(Re, 0.8) * Math.pow(Pr, 0.6), liquid };
  }

  function calculateFlatTurbulent(props) {
    const u = val('velocity');
    const L = getSI('L');
    if (![u, L].every(positive)) return setError('平均流速・代表長さを正の数値で入力してください。');
    const Re = props.rho * u * L / props.mu;
    const r = flatPlateTurbulentNu(Re, props.Pr);
    const Nu = r.Nu;
    const h = Nu * props.k / L;
    const notes = [];
    if (Re < 5e5) notes.push('Re_L が小さく、前縁側の層流・遷移域の割合が大きい条件です。前縁から乱流とみなすこの式は合わない可能性があります。');
    if (props.Pr < 0.6) notes.push('Pr < 0.6 です。液体金属などは式(6.112)・(6.113)の対象外です。');
    if (props.Pr > 85) notes.push('Pr が 85 を超えています。式(6.113)のもとになった測定は Pr 85 までです。');
    renderResult({
      title: '平均熱伝達係数 h',
      h,
      rows: [
        ['Reynolds数 Re<sub>L</sub>', `${fmtNum(Re)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Nusselt数 Nu<sub>L</sub>', `${fmtNum(Nu)} ［-］`],
      ],
      formula: r.liquid
        ? 'Nu = 0.040Re<sup>0.8</sup>Pr<sup>0.43</sup>（Pr &gt; 1.58、液体の式(6.113)を前縁から積分）'
        : 'Nu = 0.037Re<sup>0.8</sup>Pr<sup>0.6</sup>（Pr ≦ 1.58、気体の式(6.112)を前縁から積分）',
      notes,
    });
  }

  // 垂直平板・自然対流（Churchill & Chu, IJHMT 18 (1975) 1323）
  // Lienhard & Lienhard, A Heat Transfer Textbook, 6th ed. (v6.00, 2024):
  //   Ra ≦ 10⁹：式(8.13a) p.419  Nu = 0.68 + 0.670 Ra^(1/4) / ψ^(4/9)
  //   Ra > 10⁹：式(8.13b) p.420  Nu = {0.825 + 0.387 Ra^(1/6) / ψ^(8/27)}²
  //   ψ = 1 + (0.492/Pr)^(9/16)。全 Pr に適用、等温壁・等熱流束壁のどちらにも可、物性は膜温度。
  function churchillChuNu(Ra, Pr) {
    const psi = 1 + Math.pow(0.492 / Pr, 9 / 16);
    const turbulent = Ra > 1e9;
    const Nu = turbulent
      ? Math.pow(0.825 + 0.387 * Math.pow(Ra, 1 / 6) / Math.pow(psi, 8 / 27), 2)
      : 0.68 + 0.670 * Math.pow(Ra, 1 / 4) / Math.pow(psi, 4 / 9);
    return { Nu, psi, turbulent };
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
    const r = churchillChuNu(GrPr, props.Pr);
    const Nu = r.Nu;
    const h = Nu * props.k / L;
    const notes = [];
    if (r.turbulent) {
      const NuLam = 0.68 + 0.670 * Math.pow(GrPr, 1 / 4) / Math.pow(r.psi, 4 / 9);
      notes.push(`Ra = Gr·Pr が 10⁹ を超えるため、乱流を含む式(8.13b)で計算しました。層流の式(8.13a)では Nu = ${fmtNum(NuLam)} です。Ra = 10⁹ で式を切り替えるため、その前後で h が変わります（Pr = 0.71 で約3割、Pr = 7 で約4割）。`);
    }
    if (GrPr / Math.pow(r.psi, 16 / 9) < 0.1) notes.push('Ra が Churchill と Chu の式のもとになったデータの範囲（Lienhard 図8.3、横軸 10⁻¹ 以上）より小さい条件です。');
    renderResult({
      title: '平均熱伝達係数 h',
      h,
      rows: [
        ['Grashof数 Gr', `${fmtNum(Gr)} ［-］`],
        ['Prandtl数 Pr', `${fmtNum(props.Pr)} ［-］`],
        ['Gr・Pr（= Ra）', `${fmtNum(GrPr)} ［-］`],
        ['Nusselt数 Nu', `${fmtNum(Nu)} ［-］`],
      ],
      formula: r.turbulent
        ? 'Nu = {0.825 + 0.387Ra<sup>1/6</sup>/[1 + (0.492/Pr)<sup>9/16</sup>]<sup>8/27</sup>}<sup>2</sup>（Churchill–Chu、式(8.13b)、Ra = Gr·Pr）'
        : 'Nu = 0.68 + 0.670Ra<sup>1/4</sup>/[1 + (0.492/Pr)<sup>9/16</sup>]<sup>4/9</sup>（Churchill–Chu、式(8.13a)、Ra = Gr·Pr）',
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
