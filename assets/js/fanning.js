(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const TO_SI = {
    rho: { kgm3: 1, gcm3: 1000 },
    u:   { ms: 1, cms: 0.01 },
    D:   { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    L:   { m: 1, km: 1000 },
    mu:  { Pas: 1, mPas: 0.001, cP: 0.001 },
    eps: { mm: 0.001, um: 1e-6, m: 1 },
  };

  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');

  // 単位はメートル。出典: engineeringtoolbox / Bentley HAMMER（Darcy-Weisbach roughness）
  const ROUGHNESS_PRESETS = {
    plastic:   0.005e-3,  // 樹脂管 PVC・PEなど
    drawn:     0.0015e-3, // 銅・真鍮・アルミ引抜管 新品
    sus:       0.003e-3,  // ステンレス配管・平滑仕上げ
    sus_ep:    0.0005e-3, // 電解研磨ステンレス
    steel:     0.045e-3,  // 炭素鋼管・新品
    galvan:    0.15e-3,   // 亜鉛めっき鋼管
    rusty:     0.5e-3,    // 鋼管・腐食あり
    cast_new:  0.26e-3,   // 鋳鉄管・新品
    concrete:  0.36e-3,   // コンクリート管・平均
  };

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

  function fmtRe(Re) {
    if (!isFinite(Re)) return '—';
    if (Re >= 1e5) {
      const exp = Re.toExponential(2);
      const m = exp.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
    }
    if (Re >= 1000) return Math.round(Re).toLocaleString('en-US');
    return Re.toFixed(1);
  }

  function readSI(field) {
    const el = $(field);
    if (!el || el.value.trim() === '') return { value: NaN, blank: true, invalid: false };
    const v = Number(el.value.trim());
    const unit = $(field + '_unit').value;
    if (!isFinite(v)) return { value: NaN, blank: false, invalid: true };
    return { value: v * TO_SI[field][unit], blank: false, invalid: false };
  }

  function getSI(field) {
    return readSI(field).value;
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
  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  // ======== Friction factor ========
  // Returns { f, formula, regime }
  // Colebrook (Fanning form): 1/√(4f) = -2 log10[(ε/D)/3.7 + 2.51/(Re·√(4f))]
  function frictionFactor(Re, epsOverD) {
    if (Re <= 2300) {
      return { f: 16 / Re, formula: '層流の式  f = 16 / Re', regime: 'laminar' };
    }
    // initial guess via Haaland (Darcy form), then iterate Colebrook
    const haaland = 1 / Math.pow(-1.8 * Math.log10(Math.pow(epsOverD / 3.7, 1.11) + 6.9 / Re), 2);
    let lambda = isFinite(haaland) && haaland > 0 ? haaland : 0.02;
    let X = 1 / Math.sqrt(lambda);
    for (let i = 0; i < 80; i++) {
      const Xn = -2 * Math.log10(epsOverD / 3.7 + 2.51 * X / Re);
      if (Math.abs(Xn - X) < 1e-12) { X = Xn; break; }
      X = Xn;
    }
    lambda = 1 / (X * X);
    const f = lambda / 4;
    const regime = (Re < 4000) ? 'transition' : 'turbulent';
    const formula = epsOverD > 0
      ? 'コールブルック (Colebrook) の式（粗面管・反復解）'
      : 'プラントル・カルマン (Prandtl–Kármán) の式（平滑管・反復解）';
    return { f, formula, regime };
  }

  function regimeLabel(key) {
    return { laminar: '層流', transition: '遷移域', turbulent: '乱流' }[key] || '—';
  }

  // 未入力時の既定値：ステンレス配管・平滑仕上げ ε = 0.003 mm = 3e-6 m
  const EPS_DEFAULT = 3e-6;

  // 相対粗さ ε/D の上限（コールブルック式・Moody線図の適用範囲）
  const EPS_OVER_D_MAX = 0.05;

  function calculate() {
    clearError();
    const rho = getSI('rho');
    const u = getSI('u');
    const D = getSI('D');
    const L = getSI('L');
    const mu = getSI('mu');
    const epsInfo = readSI('eps');
    const epsBlank = epsInfo.blank;
    if (epsInfo.invalid) {
      return setError('管内壁粗さは数値で入力してください。未入力の場合は既定値、平滑管の場合は0を入力してください。');
    }
    const eps = epsBlank ? EPS_DEFAULT : epsInfo.value;
    const epsDefaulted = epsBlank;

    const fields = { rho, u, D, L, mu };
    for (const k in fields) {
      if (!isFinite(fields[k]) || fields[k] <= 0) {
        return setError('密度・流速・管内径・配管長さ・粘度は正の数値で入力してください。');
      }
    }
    if (eps < 0) return setError('管内壁粗さは0以上で入力してください。');

    const Re = (rho * u * D) / mu;
    const A = Math.PI * D * D / 4;
    const epsOverD = eps / D;

    if (!isFinite(Re) || Re <= 0) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }
    if (!isFinite(epsOverD) || epsOverD > EPS_OVER_D_MAX) {
      return setError('管内壁粗さが管内径に対して大きすぎます。コールブルック式の適用目安として ε/D は0.05以下にしてください。小径の平滑管として計算する場合は粗さに0を入力してください。');
    }

    const { f, formula, regime } = frictionFactor(Re, epsOverD);
    if (!isFinite(f) || f <= 0) {
      return setError('管摩擦係数の収束計算に失敗しました。入力値を見直してください。');
    }

    const lambda = 4 * f;                                     // Darcy–Weisbach
    const dynamicHead = 0.5 * rho * u * u;                    // ρu²/2
    const dP = lambda * (L / D) * dynamicHead;                // ΔP [Pa]
    const dPperL = dP / L;                                    // [Pa/m]
    const headLoss = dP / (rho * 9.80665);                    // [m of fluid head]

    if (!isFinite(dP) || dP <= 0) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }

    $('result-area').innerHTML = render({
      Re, regime, f, lambda, dP, dPperL, headLoss, A, formula,
      epsOverD, rho, u, D, L, mu, eps, epsDefaulted,
    });
  }

  function render(r) {
    return `
      <div class="result-target">圧力損失 <span class="sym">ΔP</span></div>
      <div class="result-value-big">${fmtNum(r.dP / 1000)} <span class="unit">kPa</span></div>

      <div class="result-detail-label">他単位での値</div>
      <table class="unit-table"><tbody>
        <tr><td>Pa</td><td class="num">${fmtNum(r.dP)}</td></tr>
        <tr><td>kPa</td><td class="num">${fmtNum(r.dP / 1000)}</td></tr>
        <tr><td>MPa</td><td class="num">${fmtNum(r.dP / 1e6)}</td></tr>
        <tr><td>bar</td><td class="num">${fmtNum(r.dP / 1e5)}</td></tr>
        <tr><td>kgf/cm²</td><td class="num">${fmtNum(r.dP / 98066.5)}</td></tr>
        <tr><td>流体ヘッド m</td><td class="num">${fmtNum(r.headLoss)}</td></tr>
      </tbody></table>

      <div class="result-detail-label">管摩擦係数・流れの状態</div>
      <table class="unit-table"><tbody>
        <tr><td>レイノルズ数 <span class="sym">Re</span></td><td class="num">${fmtRe(r.Re)}</td></tr>
        <tr><td>流れの状態</td><td class="num"><span class="regime-badge ${r.regime}">${regimeLabel(r.regime)}</span></td></tr>
        <tr><td>管摩擦係数 <span class="sym">f</span>（ファニング定義）</td><td class="num">${fmtNum(r.f)}</td></tr>
        <tr><td>管摩擦係数 <span class="sym">λ</span>（ダルシー定義、= 4f）</td><td class="num">${fmtNum(r.lambda)}</td></tr>
        <tr><td>使用した式</td><td class="num" style="text-align:left;font-weight:500;">${r.formula}</td></tr>
      </tbody></table>

      <div class="result-meta">
        <div>配管長さあたりの圧力損失 <span class="sym">ΔP/L</span> = ${fmtNum(r.dPperL)} Pa/m (= ${fmtNum(r.dPperL / 1000)} kPa/m)</div>
        <div>動圧 <span class="sym">ρu²/2</span> = ${fmtNum(0.5 * r.rho * r.u * r.u)} Pa</div>
        <div>断面積 <span class="sym">A</span> = ${fmtNum(r.A * 10000)} cm² (= ${fmtNum(r.A)} m²)</div>
        ${r.epsDefaulted
            ? `<div>管内壁粗さ：未入力のためステンレス配管・平滑仕上げとして計算（ε = ${fmtNum(r.eps * 1000)} mm、ε/D = ${fmtNum(r.epsOverD)}）</div>`
            : (r.eps > 0
                ? `<div>相対粗さ <span class="sym">ε/D</span> = ${fmtNum(r.epsOverD)} （ε = ${fmtNum(r.eps * 1000)} mm）</div>`
                : '<div>管内壁粗さ：0（平滑管として計算）</div>')}
        <div>入力 <span class="sym">ρ</span> = ${fmtNum(r.rho)} kg/m³, <span class="sym">u</span> = ${fmtNum(r.u)} m/s, <span class="sym">D</span> = ${fmtNum(r.D * 1000)} mm, <span class="sym">L</span> = ${fmtNum(r.L)} m, <span class="sym">μ</span> = ${fmtNum(r.mu * 1000)} mPa·s</div>
        ${r.regime === 'transition' ? '<div class="result-note">※ レイノルズ数が遷移域（2,300〜4,000）にあります。このツールでは乱流側の式で参考計算していますが、実際の摩擦係数は条件により変動しやすいため、設計値として使う場合は安全側の評価や実測値を確認してください。</div>' : ''}
      </div>
    `;
  }

  function reset() {
    ['rho', 'u', 'D', 'L', 'mu', 'eps'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    const sel = $('eps_preset'); if (sel) sel.value = '';
    clearError();
    clearResult();
  }

  function applyEpsPreset(key) {
    if (!key) return;
    const v = ROUGHNESS_PRESETS[key];
    if (v == null) return;
    $('eps_unit').value = 'mm';
    $('eps').value = (v * 1000).toString();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    const sel = $('eps_preset');
    if (sel) {
      sel.addEventListener('change', () => applyEpsPreset(sel.value));
    }
  });
})();
