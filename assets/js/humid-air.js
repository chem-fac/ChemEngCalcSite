(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const Ra = 0.287;   // kJ/(kg dry air · K)

  // Buck equation (T °C → Pa)
  function Psat(T) {
    return 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T)));
  }

  function W_from_Pv(Pv, Patm) {
    if (Pv >= Patm) return Infinity;
    return 0.622 * Pv / (Patm - Pv);
  }

  function Pv_from_W(W, Patm) {
    return W * Patm / (0.622 + W);
  }

  // dewpoint via bisection: solve Psat(Tdp) = Pv
  function dewpoint(Pv) {
    if (Pv <= 0) return -100;
    let lo = -80, hi = 200;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (Psat(mid) > Pv) hi = mid; else lo = mid;
      if (hi - lo < 1e-5) break;
    }
    return (lo + hi) / 2;
  }

  // h_fg of water at T °C [kJ/kg]
  function h_fg(T) { return 2501 - 2.381 * T; }

  // Iterate wet bulb temp
  function wetBulb(Tdb, W, Patm) {
    let Twb = Tdb - 5;
    for (let i = 0; i < 200; i++) {
      const Pv_s = Psat(Twb);
      const Ws = W_from_Pv(Pv_s, Patm);
      const hfg = h_fg(Twb);
      const cpm = 1.006 + W * 1.86;  // moist air specific heat per kg dry air
      // Adiabatic sat: Ws - W = (cpm/hfg)·(Tdb - Twb)
      const f = (Ws - W) * hfg - cpm * (Tdb - Twb);
      // numerical derivative
      const eps = 1e-3;
      const Pv_s2 = Psat(Twb + eps);
      const Ws2 = W_from_Pv(Pv_s2, Patm);
      const hfg2 = h_fg(Twb + eps);
      const f2 = (Ws2 - W) * hfg2 - cpm * (Tdb - (Twb + eps));
      const df = (f2 - f) / eps;
      if (Math.abs(df) < 1e-12) break;
      const TwbNew = Twb - f / df;
      if (Math.abs(TwbNew - Twb) < 1e-6) { Twb = TwbNew; break; }
      Twb = TwbNew;
      if (Twb > Tdb) Twb = Tdb - 0.001;
      if (Twb < -50) Twb = -50;
    }
    return Twb;
  }

  // Given Twb and Tdb, find W (inverse): iterate
  function W_from_Twb(Tdb, Twb, Patm) {
    const Pvs = Psat(Twb);
    const Ws = W_from_Pv(Pvs, Patm);
    const hfg = h_fg(Twb);
    // W from: (Ws - W)·hfg = (1.006 + W·1.86)(Tdb - Twb)
    // W·hfg + W·1.86·(Tdb-Twb) = Ws·hfg - 1.006·(Tdb-Twb)
    const num = Ws * hfg - 1.006 * (Tdb - Twb);
    const den = hfg + 1.86 * (Tdb - Twb);
    return num / den;
  }

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }

  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  function updateUnit() {
    const k = $('second_kind').value;
    const lab = $('second_unit_label');
    if (k === 'RH') lab.textContent = '%';
    else if (k === 'Twb' || k === 'Tdp') lab.textContent = '°C';
    else lab.textContent = 'kg/kg乾';
  }

  function calc() {
    clearError();
    const Tdb = val('Tdb');
    const kind = $('second_kind').value;
    const v2 = val('second_val');
    const Patm_kPa = val('Patm');
    if (!isFinite(Tdb)) return setError('乾球温度を入力してください。');
    if (!isFinite(v2)) return setError('2番目の状態量の値を入力してください。');
    if (!(Patm_kPa > 0)) return setError('大気圧を正の値で入力してください。');
    const Patm = Patm_kPa * 1000;  // Pa

    const Pvs_db = Psat(Tdb);

    // 乾球温度が大気圧での沸点以上なら、湿り空気の概念が適用できない
    if (Pvs_db >= Patm) {
      const Tboil = dewpoint(Patm);
      return setError(`乾球温度 ${Tdb} °C は大気圧 ${Patm_kPa} kPa での沸点（${fmtNum(Tboil)} °C）以上です。この条件では湿り空気の概念（乾燥空気＋水蒸気）が適用できません。大気圧を上げるか乾球温度を下げてください。`);
    }
    const Wsat_db = W_from_Pv(Pvs_db, Patm);   // 飽和絶対湿度（Tdb, Patm）

    let W, Pv, RH, Twb, Tdp;
    if (kind === 'RH') {
      if (v2 < 0 || v2 > 100) return setError('相対湿度は 0〜100% の範囲で入力してください。');
      RH = v2;
      Pv = (RH / 100) * Pvs_db;
      W = W_from_Pv(Pv, Patm);
    } else if (kind === 'Tdp') {
      if (v2 > Tdb + 1e-6) return setError('露点温度は乾球温度以下にしてください。');
      Tdp = v2;
      Pv = Psat(Tdp);
      if (Pv >= Patm) return setError(`露点 ${Tdp} °C の飽和蒸気圧（${fmtNum(Pv / 1000)} kPa）が大気圧（${Patm_kPa} kPa）以上です。露点を下げてください。`);
      W = W_from_Pv(Pv, Patm);
      RH = Pv / Pvs_db * 100;
    } else if (kind === 'W') {
      if (v2 < 0) return setError('絶対湿度を 0 以上で入力してください。');
      if (v2 > Wsat_db + 1e-9) {
        return setError(`絶対湿度 W = ${v2} kg/kg乾 は、乾球 ${Tdb} °C・${Patm_kPa} kPa における飽和絶対湿度 W_sat = ${fmtNum(Wsat_db)} kg/kg乾 を超えています（過飽和は物理的に存在しません）。RH ≦ 100% に収まる W を入力してください。`);
      }
      W = v2;
      Pv = Pv_from_W(W, Patm);
      RH = Pv / Pvs_db * 100;
    } else { // Twb
      if (v2 > Tdb + 1e-6) return setError('湿球温度は乾球温度以下にしてください。');
      Twb = v2;
      W = W_from_Twb(Tdb, Twb, Patm);
      if (!(W >= 0)) return setError('入力条件から物理的に正しい絶対湿度を導出できませんでした。値を見直してください。');
      if (W > Wsat_db + 1e-9) {
        return setError(`入力された湿球温度から導出される絶対湿度（${fmtNum(W)} kg/kg乾）が、乾球温度での飽和（${fmtNum(Wsat_db)} kg/kg乾）を超えました。湿球温度・大気圧を見直してください。`);
      }
      Pv = Pv_from_W(W, Patm);
      RH = Pv / Pvs_db * 100;
    }
    if (!(W >= 0) || !isFinite(W)) return setError('絶対湿度が負または無限大になりました。入力値を見直してください。');
    if (Pv >= Patm) return setError(`水蒸気分圧 P_v（${fmtNum(Pv / 1000)} kPa）が大気圧（${Patm_kPa} kPa）以上です。入力条件を見直してください。`);

    if (Twb === undefined) Twb = wetBulb(Tdb, W, Patm);
    if (Tdp === undefined) Tdp = dewpoint(Pv);

    const h = 1.006 * Tdb + W * (2501 + 1.86 * Tdb);  // kJ/kg dry
    const v_m3kg = Ra * (Tdb + 273.15) * (1 + 1.6078 * W) / Patm_kPa;
    const rho_moist = (1 + W) / v_m3kg;  // kg moist air / m³
    const dewMargin = Tdb - Tdp;

    $('result-area').innerHTML = `
      <div class="result-target">湿り空気の状態量</div>
      <table class="unit-table"><tbody>
        <tr><td>乾球温度 T_db</td><td class="num">${fmtNum(Tdb)} °C</td></tr>
        <tr><td>湿球温度 T_wb</td><td class="num">${fmtNum(Twb)} °C</td></tr>
        <tr><td>露点温度 T_dp</td><td class="num">${fmtNum(Tdp)} °C</td></tr>
        <tr><td>露点までの余裕 (T_db - T_dp)</td><td class="num">${fmtNum(dewMargin)} K</td></tr>
        <tr><td>相対湿度 RH</td><td class="num">${fmtNum(RH)} %</td></tr>
        <tr><td>絶対湿度（混合比）W</td><td class="num">${fmtNum(W)} kg/kg乾  /  ${fmtNum(W * 1000)} g/kg乾</td></tr>
        <tr><td>水蒸気分圧 P_v</td><td class="num">${fmtNum(Pv / 1000)} kPa  /  ${fmtNum(Pv)} Pa</td></tr>
        <tr><td>飽和蒸気圧 P_sat(T_db)</td><td class="num">${fmtNum(Pvs_db / 1000)} kPa</td></tr>
        <tr><td>比エンタルピー h</td><td class="num">${fmtNum(h)} kJ/kg乾</td></tr>
        <tr><td>比容積 v</td><td class="num">${fmtNum(v_m3kg)} m³/kg乾</td></tr>
        <tr><td>湿り空気密度 ρ</td><td class="num">${fmtNum(rho_moist)} kg/m³</td></tr>
        <tr><td>大気圧 P_atm</td><td class="num">${fmtNum(Patm_kPa)} kPa</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div class="result-note">※ Buck式に基づく飽和蒸気圧（−40〜+50 °C で誤差±0.5%程度）。</div>
        <div class="result-note">※ 比エンタルピー基準：乾燥空気 0 °C で h = 0、液体水 0 °C で h_w = 0。</div>
      </div>
    `;
  }

  function reset() {
    ['Tdb', 'second_val'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('Patm')) $('Patm').value = '101.325';
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('second_kind').addEventListener('change', updateUnit);
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    updateUnit();
  });
})();
