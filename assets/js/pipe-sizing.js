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
  // JIS G 3454 圧力配管用炭素鋼鋼管（STPG）Sch.40：[呼び径, 外径 mm, 厚さ mm]。内径 = 外径 − 2×厚さ
  const NOM = [
    ['6A (1/8B)', 10.5, 1.7], ['8A (1/4B)', 13.8, 2.2], ['10A (3/8B)', 17.3, 2.3],
    ['15A (1/2B)', 21.7, 2.8], ['20A (3/4B)', 27.2, 2.9], ['25A (1B)', 34.0, 3.4],
    ['32A (1-1/4B)', 42.7, 3.6], ['40A (1-1/2B)', 48.6, 3.7], ['50A (2B)', 60.5, 3.9],
    ['65A (2-1/2B)', 76.3, 5.2], ['80A (3B)', 89.1, 5.5], ['90A (3-1/2B)', 101.6, 5.7],
    ['100A (4B)', 114.3, 6.0], ['125A (5B)', 139.8, 6.6], ['150A (6B)', 165.2, 7.1],
    ['200A (8B)', 216.3, 8.2], ['250A (10B)', 267.4, 9.3], ['300A (12B)', 318.5, 10.3],
    ['350A (14B)', 355.6, 11.1], ['400A (16B)', 406.4, 12.7], ['450A (18B)', 457.2, 14.3],
    ['500A (20B)', 508.0, 15.1], ['600A (24B)', 609.6, 17.5],
  ].map(([name, od, t]) => [name, od, Math.round((od - 2 * t) * 10) / 10]);
  function qToSI(value, unit) { const map = { m3h: 1 / 3600, m3min: 1 / 60, Lmin: 1e-3 / 60, m3s: 1 }; return value * (map[unit] || NaN); }
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
    } else {
      const k = rows.findIndex(r => r.u < uMin);  // 推奨範囲より遅くなる最初の呼び径
      if (k > 0) displayRows = rows.slice(k - 1, k + 1);
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
        <p class="result-note" style="margin-top:6px;">${candidates.length
          ? '緑色行が推奨流速範囲内の呼び径です。'
          : (rows[0].u > uMax && rows[rows.length - 1].u < uMin
              ? '推奨流速範囲に入る呼び径がありません（隣り合う呼び径の間に範囲が収まっています）。前後の呼び径の流速を見て選んでください。'
              : '6A〜600A の範囲に推奨流速を満たす呼び径がありません。流量の単位と値を確認してください。')}</p>
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
