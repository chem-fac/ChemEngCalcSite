(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = 9.80665;

  const TO_SI = {
    d: { um: 1e-6, mm: 1e-3, m: 1 },
    rho_p: { kgm3: 1, gcm3: 1000 },
    rho_f: { kgm3: 1, gcm3: 1000 },
    mu: { mPas: 1e-3, cP: 1e-3, Pas: 1 },
  };

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function getSI(id) {
    const v = val(id);
    const u = $(id + '_unit') ? $(id + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[id] && u ? TO_SI[id][u] : 1) : NaN;
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  // 球形固体粒子の終末沈降速度。粒子レイノルズ数の領域に応じて式を使い分ける。
  //   ストークス域 (Re_p < 2) / アレン域 (2 <= Re_p < 500) / ニュートン域 (500 <= Re_p)
  //   dRho = ρ_p - ρ_f (> 0) [kg/m³], d[m], mu[Pa·s], rhoF[kg/m³]
  function terminalVelocity(dRho, d, mu, rhoF) {
    // ストークス域
    const vS = G * d * d * dRho / (18 * mu);
    const ReS = rhoF * vS * d / mu;
    if (ReS < 2) return { v: vS, Re: ReS, regime: 'ストークス域', law: 'Stokes' };
    // アレン域（中間域）
    const vA = Math.cbrt((4 / 225) * (G * G * dRho * dRho) / (rhoF * mu)) * d;
    const ReA = rhoF * vA * d / mu;
    if (ReA < 500) return { v: vA, Re: ReA, regime: 'アレン域', law: 'Allen' };
    // ニュートン域
    const vN = Math.sqrt(3 * G * dRho * d / rhoF);
    const ReN = rhoF * vN * d / mu;
    return { v: vN, Re: ReN, regime: 'ニュートン域', law: 'Newton' };
  }

  // 粒子径を読みやすい単位で
  function fmtD(m) {
    const um = m * 1e6;
    if (um < 1000) return fmtNum(um, 3) + ' µm';
    return fmtNum(m * 1000, 3) + ' mm';
  }

  // 終末速度を読みやすい単位の大見出しに
  function bigVal(v) {
    if (v >= 1) return fmtNum(v) + ' <span class="unit">m/s</span>';
    if (v >= 0.01) return fmtNum(v * 100) + ' <span class="unit">cm/s</span>';
    return fmtNum(v * 1000) + ' <span class="unit">mm/s</span>';
  }

  function calc() {
    clearError();
    const d = getSI('d');
    const rhoP = getSI('rho_p');
    const rhoF = getSI('rho_f');
    const mu = getSI('mu');
    if (![d, rhoP, rhoF, mu].every(positive)) return setError('すべての値を正の数値で入力してください。');
    if (rhoP <= rhoF) return setError('粒子密度 ρ_p は流体密度 ρ_f より大きくしてください（ρ_p < ρ_f の場合、粒子は沈まず浮上します）。');

    const dRho = rhoP - rhoF;
    const r = terminalVelocity(dRho, d, mu, rhoF);
    const v = r.v, Re = r.Re, regime = r.regime;
    if (!isFinite(v) || v <= 0) return setError('計算が収束しませんでした。入力値を見直してください。');

    // 抗力係数を逆算（つり合い式から）。3 領域いずれでも C_D = 4 g Δρ d / (3 ρ_f v_t²)
    const Cd = 4 * G * dRho * d / (3 * rhoF * v * v);

    // 粒子径による感度（同じ Δρ・μ・流体）。入力した粒子径も必ず表に差し込んでハイライト
    const thL = 'style="text-align:left;padding:8px 12px;background:var(--brand-faint);font-size:12px;font-weight:700;color:var(--text-sub);border-bottom:1px solid var(--border)"';
    const thR = thL.replace('text-align:left', 'text-align:right');
    const dInputUm = d * 1e6;
    const dList = [2000, 1000, 500, 200, 100, 50, 20, 10];
    if (!dList.some(x => Math.abs(x - dInputUm) < 1e-6)) dList.push(dInputUm);
    dList.sort((a, b) => b - a);
    const rows = dList.map(dum => {
      const isInput = Math.abs(dum - dInputUm) < 1e-6;
      const rr = terminalVelocity(dRho, dum * 1e-6, mu, rhoF);
      const mark = isInput ? ' style="background:var(--brand-faint)"' : '';
      const label = isInput ? `<strong>${fmtD(dum * 1e-6)}</strong>` : fmtD(dum * 1e-6);
      return `<tr${mark}><td>${label}</td><td class="num">${fmtNum(rr.v * 1000)} mm/s</td><td class="num">${fmtNum(rr.v * 3600)} m/h</td><td class="num"><span class="small">${rr.regime}</span></td></tr>`;
    }).join('');

    $('result-area').innerHTML = `
      <div class="result-target">終末沈降速度 v_t</div>
      <div class="result-value-big">${bigVal(v)}</div>
      <table class="unit-table"><tbody>
        <tr><td>v_t</td><td class="num">${fmtNum(v)} m/s ／ ${fmtNum(v * 1000)} mm/s ／ ${fmtNum(v * 100)} cm/s</td></tr>
        <tr><td>v_t（参考）</td><td class="num">${fmtNum(v * 60)} m/min ／ ${fmtNum(v * 3600)} m/h</td></tr>
        <tr><td>粒子レイノルズ数 Re_p</td><td class="num">${fmtNum(Re)} <span class="small">${regime}</span></td></tr>
        <tr><td>適用式</td><td class="num">${r.law}（${regime}）</td></tr>
        <tr><td>抗力係数 C_D</td><td class="num">${fmtNum(Cd)}</td></tr>
        <tr><td>密度差 ρ_p − ρ_f</td><td class="num">${fmtNum(dRho)} kg/m³</td></tr>
      </tbody></table>
      <div class="result-detail-label">粒子径による沈降速度の変化（同じ Δρ・μ・流体）</div>
      <table class="unit-table"><thead><tr><th ${thL}>粒子径 d</th><th ${thR}>v_t</th><th ${thR}>v_t</th><th ${thR}>領域</th></tr></thead><tbody>
        ${rows}
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ ストークス域では v_t ∝ d²。粒子径が 1/10 になると沈降速度は 1/100 になります。</div>
        <div class="result-note">※ 球形・単一粒子・希薄分散の前提値です。濃厚スラリーでは干渉沈降（Richardson-Zaki 等）の補正が必要です。</div>
      </div>
    `;
  }

  function reset() {
    ['d', 'rho_p', 'rho_f', 'mu'].forEach(id => { if ($(id)) $(id).value = ''; });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
