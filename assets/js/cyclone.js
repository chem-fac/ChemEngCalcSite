(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const TO_SI = {
    B: { mm: 1e-3, cm: 1e-2, m: 1 },
    H: { mm: 1e-3, cm: 1e-2, m: 1 },
    Q: { m3h: 1 / 3600, m3min: 1 / 60, Nm3h: 1 / 3600 },
    mu: { mPas: 1e-3, cP: 1e-3, Pas: 1 },
    rho_p: { kgm3: 1, gcm3: 1000 },
    rho_g: { kgm3: 1, gcm3: 1000 },
  };

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  function getSI(id) {
    const v = val(id);
    const u = $(id + '_unit') ? $(id + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[id] && u ? TO_SI[id][u] : 1) : NaN;
  }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function calc() {
    clearError();
    const B = getSI('B'), H = getSI('H');
    let vi = val('vi');
    const Q = getSI('Q');
    const Ne = val('Ne');
    const mu = getSI('mu');
    const rho_p = getSI('rho_p'), rho_g = getSI('rho_g');
    const K = val('K');
    if (!(B > 0)) return setError('入口幅 B を正の値で入力してください。');
    if (!(H > 0)) return setError('入口高さ H を正の値で入力してください。');
    if (!(vi > 0) && !(Q > 0)) return setError('入口流速 v_i または処理ガス流量 Q のどちらかを入力してください。');
    if (!isFinite(vi) || vi <= 0) {
      vi = Q / (B * H);
    }
    if (!(Ne > 0)) return setError('有効旋回回数 N_e を正の値で入力してください。');
    if (!(mu > 0)) return setError('ガス粘度を正の値で入力してください。');
    if (!(rho_p > 0)) return setError('粒子密度を正の値で入力してください。');
    if (!(rho_g >= 0)) return setError('ガス密度を 0 以上で入力してください。');
    if (rho_p <= rho_g) return setError('粒子密度はガス密度より大きくしてください。');
    if (!(K > 0)) return setError('圧損係数 K を正の値で入力してください。');

    const dpc = Math.sqrt(9 * mu * B / (2 * Math.PI * Ne * vi * (rho_p - rho_g)));   // m
    const dpc_um = dpc * 1e6;
    const dP = K * rho_g * vi * vi / 2;  // Pa
    const Qcalc = (isFinite(Q) && Q > 0) ? Q : vi * B * H;

    // efficiency at common particle sizes
    const dp_um_list = [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 30, 50, 75, 100];
    const rows = dp_um_list.map(dp => {
      const eta = 1 / (1 + Math.pow(dpc_um / dp, 2));
      return `<tr><td class="num">${dp}</td><td class="num">${fmtNum(eta * 100)}</td></tr>`;
    }).join('');

    let viNote = '';
    if (vi < 10) viNote = '※ 入口流速が低めです（< 10 m/s）。カット径が悪化し、効率も落ちます。';
    else if (vi > 25) viNote = '※ 入口流速が高めです（> 25 m/s）。摩耗・再飛散のリスクが上がります。';

    $('result-area').innerHTML = `
      <div class="result-target">カット径 d_pc（50% 分離径）</div>
      <div class="result-value-big">${fmtNum(dpc_um)} <span class="unit">μm</span></div>
      <table class="unit-table"><tbody>
        <tr><td>カット径 d_pc</td><td class="num">${fmtNum(dpc_um)} μm  /  ${fmtNum(dpc * 1000)} mm</td></tr>
        <tr><td>入口流速 v_i</td><td class="num">${fmtNum(vi)} m/s</td></tr>
        <tr><td>処理ガス流量 Q</td><td class="num">${fmtNum(Qcalc * 3600)} m³/h  /  ${fmtNum(Qcalc * 60)} m³/min</td></tr>
        <tr><td>圧損 ΔP</td><td class="num">${fmtNum(dP)} Pa  /  ${fmtNum(dP / 1000)} kPa  /  ${fmtNum(dP / 9.80665)} mmH₂O</td></tr>
        <tr><td>動圧 ρ_g·v_i²/2</td><td class="num">${fmtNum(rho_g * vi * vi / 2)} Pa</td></tr>
      </tbody></table>
      <div style="margin-top:12px;">
        <div class="result-target" style="font-size:13px;">粒径ごとの分離効率（Lapple 分級曲線）</div>
        <table class="eff-table">
          <thead><tr><th class="num">粒径 d_p [μm]</th><th class="num">分離効率 η [%]</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="result-meta">
        ${viNote ? `<div class="result-note">${viNote}</div>` : ''}
        <div class="result-note">※ 全体回収率は粒径分布によって決まります。粉体側の粒径分布を別途与えて積算してください。</div>
      </div>
    `;
  }

  function reset() {
    ['B', 'H', 'vi', 'Q', 'mu', 'rho_p'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('Ne')) $('Ne').value = '5';
    if ($('rho_g')) $('rho_g').value = '1.2';
    if ($('K')) $('K').value = '8';
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
