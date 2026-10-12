(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const VEL_TABLE = {
    liquid_disch: [1.5, 3.0, '液体・吐出側'],
    liquid_suct: [0.5, 1.5, '液体・吸込側'],
    liquid_grav: [0.5, 1.0, '液体・自然流下'],
    gas_lp: [10, 20, 'ガス・低圧'],
    gas_mp: [15, 25, 'ガス・中圧'],
    gas_hp: [20, 30, 'ガス・高圧'],
    steam_sat: [20, 40, '飽和蒸気'],
    steam_sh: [40, 60, '過熱蒸気'],
  };
  // JIS B 2311 配管用炭素鋼鋼管 (STPG Sch.40) 呼び径と内径
  // [呼び径, 外径 mm, 内径 Sch.40 mm]
  const NOM = [
    ['6A (1/8")', 10.5, 7.1], ['8A (1/4")', 13.8, 9.2], ['10A (3/8")', 17.3, 12.7],
    ['15A (1/2")', 21.7, 16.1], ['20A (3/4")', 27.2, 21.6], ['25A (1")', 34.0, 27.6],
    ['32A (1-1/4")', 42.7, 35.7], ['40A (1-1/2")', 48.6, 41.6], ['50A (2")', 60.5, 52.7],
    ['65A (2-1/2")', 76.3, 65.9], ['80A (3")', 89.1, 78.1], ['90A (3-1/2")', 101.6, 90.1],
    ['100A (4")', 114.3, 102.3], ['125A (5")', 139.8, 126.6], ['150A (6")', 165.2, 151.0],
    ['200A (8")', 216.3, 199.9], ['250A (10")', 267.4, 248.8], ['300A (12")', 318.5, 297.9],
    ['350A (14")', 355.6, 333.3], ['400A (16")', 406.4, 381.0], ['450A (18")', 457.2, 428.7],
    ['500A (20")', 508.0, 478.0], ['600A (24")', 609.6, 574.7],
  ];
  function qToSI(value, unit) { const map = { m3h: 1 / 3600, m3min: 1 / 60, Lmin: 1e-3 / 60, m3s: 1, Nm3h: 1 / 3600 }; return value * (map[unit] || 1); }
  function fmtNum(v, sig = 4) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e5 || a < 1e-3) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function toggleCustom() {
    const t = $('fluid_type').value;
    $('row-uminmax').hidden = (t !== 'custom');
  }

  function calc() {
    clearError();
    const type = $('fluid_type').value;
    let uMin, uMax, label;
    if (type === 'custom') {
      uMin = val('u_min'); uMax = val('u_max');
      if (!(uMin > 0)) return setError('推奨流速の下限を正の値で入力してください。');
      if (!(uMax > 0) || uMax < uMin) return setError('推奨流速の上限を下限以上で入力してください。');
      label = 'カスタム';
    } else {
      const t = VEL_TABLE[type];
      uMin = t[0]; uMax = t[1]; label = t[2];
    }
    const Q_unit = $('Q_unit').value;
    const Q = qToSI(val('Q'), Q_unit);
    if (!(Q > 0)) return setError('体積流量を正の値で入力してください。');

    const D_max_required = Math.sqrt(4 * Q / (Math.PI * uMin)) * 1000;  // mm (低い流速→大きい径)
    const D_min_required = Math.sqrt(4 * Q / (Math.PI * uMax)) * 1000;  // mm
    const D_mid = Math.sqrt(D_min_required * D_max_required);

    // Find nominal candidates that fit
    const rows = NOM.map(([name, od, id]) => {
      const A = Math.PI / 4 * Math.pow(id / 1000, 2);
      const u = Q / A;
      const inRange = (u >= uMin && u <= uMax);
      const cls = inRange ? ' class="sel"' : '';
      return { name, od, id, u, inRange, cls };
    });
    const candidates = rows.filter(r => r.inRange);
    // 上下に隣接1個ずつも見せる
    const firstIdx = rows.findIndex(r => r.inRange);
    const lastIdx = rows.length - 1 - [...rows].reverse().findIndex(r => r.inRange);
    let displayRows = rows;
    if (firstIdx >= 0) {
      const lo = Math.max(0, firstIdx - 1);
      const hi = Math.min(rows.length, lastIdx + 2);
      displayRows = rows.slice(lo, hi);
    }
    const body = displayRows.map(r => `<tr${r.cls}><td>${r.name}</td><td class="num">${r.od}</td><td class="num">${r.id}</td><td class="num">${fmtNum(r.u)}</td></tr>`).join('');

    $('result-area').innerHTML = `
      <div class="result-target">必要管内径（${label}, u = ${uMin}〜${uMax} m/s）</div>
      <div class="result-value-big">D ≒ ${fmtNum(D_min_required)} 〜 ${fmtNum(D_max_required)} <span class="unit">mm</span></div>
      <table class="unit-table"><tbody>
        <tr><td>流量 Q</td><td class="num">${fmtNum(Q * 3600)} m³/h  /  ${fmtNum(Q)} m³/s</td></tr>
        <tr><td>必要管内径（u_max基準・最小）</td><td class="num">${fmtNum(D_min_required)} mm</td></tr>
        <tr><td>必要管内径（u_min基準・最大）</td><td class="num">${fmtNum(D_max_required)} mm</td></tr>
        <tr><td>幾何平均（目安）</td><td class="num">${fmtNum(D_mid)} mm</td></tr>
        <tr><td>候補呼び径数</td><td class="num">${candidates.length} 件</td></tr>
      </tbody></table>
      <div style="margin-top:12px;">
        <div class="result-target" style="font-size:13px;">JIS 呼び径と通過流速（Sch.40 STPG）</div>
        <table class="size-table">
          <thead><tr><th>呼び径</th><th class="num">外径 [mm]</th><th class="num">内径 [mm]</th><th class="num">流速 [m/s]</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
        <p class="result-note" style="margin-top:6px;">緑色行が推奨流速範囲内の呼び径です。</p>
      </div>
      <div class="result-meta">
        <div class="result-note">※ Sch.40 STPG（炭素鋼鋼管）を前提とした内径。Sch.80・SUS・PVC・グラスライニングなど他仕様では内径が異なります。</div>
        <div class="result-note">※ 配管全圧損・キャビテーション余裕・NPSH・水撃・サポート設計などは別途検討してください。</div>
      </div>
    `;
  }

  function reset() {
    ['Q', 'u_min', 'u_max'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('fluid_type')) $('fluid_type').value = 'liquid_disch';
    clearError(); toggleCustom();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('fluid_type').addEventListener('change', toggleCustom);
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    toggleCustom();
  });
})();
