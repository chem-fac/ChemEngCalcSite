(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = 9.80665;
  const ATM_PA = 101325;

  // gauge pressure -> Pa (magnitude)
  function gaugeToPa(value, unit) {
    if (!isFinite(value)) return NaN;
    if (unit === 'MPaG') return value * 1e6;
    if (unit === 'barG') return value * 1e5;
    return value * 1000; // kPaG (default)
  }
  // absolute pressure -> Pa
  function presToPaAbs(value, unit) {
    if (!isFinite(value)) return NaN;
    const u = unit.replace(/[GA]$/, '');
    if (u === 'kPa') return value * 1000;
    if (u === 'MPa') return value * 1e6;
    if (u === 'bar') return value * 1e5;
    if (u === 'mmHg') return value * 133.322;
    return value;
  }
  // differential pressure (loss) -> Pa
  function presDiffToPa(value, unit, rho) {
    if (!isFinite(value)) return NaN;
    if (unit === 'kPa') return value * 1000;
    if (unit === 'MPa') return value * 1e6;
    if (unit === 'bar') return value * 1e5;
    if (unit === 'm') return value * rho * G; // head -> Pa
    return value;
  }
  function atmToPa(value) { return isFinite(value) ? value * 1000 : ATM_PA; }
  function rhoToSI(value, unit) { if (!isFinite(value)) return NaN; return unit === 'gcm3' ? value * 1000 : value; }
  function qToSI(value, unit) {
    if (!isFinite(value)) return NaN;
    const map = { m3h: 1 / 3600, m3min: 1 / 60, Lmin: 1 / 60000 };
    return value * (map[unit] || 1);
  }

  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '-';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 1e5 || a < 1e-3) return Number(v.toPrecision(sig)).toExponential(sig - 1);
    return Number(v.toPrecision(sig)).toString();
  }
  function val(id) { const e = $(id); return (e && e.value !== '') ? parseFloat(e.value) : NaN; }
  function unitOf(id) { const u = $(id + '_unit'); return u ? u.value : ''; }
  function positive(v) { return isFinite(v) && v > 0; }
  function finite(v) { return isFinite(v); }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  const SEP = '<hr style="border:none;border-top:1px solid var(--border,#e4e4e7);margin:18px 0">';

  function cardOK(title, big, rows, notes) {
    const rowsHtml = (rows && rows.length) ? `<table class="unit-table"><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td></tr>`).join('')}</tbody></table>` : '';
    const notesHtml = (notes && notes.length) ? `<div class="result-meta">${notes.map(n => `※ ${n}`).join('<br>')}</div>` : '';
    return `<div class="result-target">${title}</div><div class="result-value-big">${big}</div>${rowsHtml}${notesHtml}`;
  }
  function cardPending(title, reason) {
    return `<div class="result-target">${title}</div><p style="color:#9097a1;margin:.35em 0 0;font-size:.92rem">${reason}</p>`;
  }

  function calc() {
    clearError();
    const rho = rhoToSI(val('rho'), unitOf('rho'));
    if (!positive(rho)) return setError('液体密度 ρ を正の値で入力してください。');

    const z1 = val('z1'), z2 = val('z2');
    const P1g = gaugeToPa(val('P1'), unitOf('P1'));
    const P2g = gaugeToPa(val('P2'), unitOf('P2'));
    const Pa = atmToPa(val('Pa'));
    const dPs = presDiffToPa(val('dPs'), unitOf('dPs'), rho);
    const dPd = presDiffToPa(val('dPd'), unitOf('dPd'), rho);

    if (isFinite(dPs) && dPs < 0) return setError('吸込配管摩擦損失 ΔP_s は 0 以上で入力してください。');
    if (isFinite(dPd) && dPd < 0) return setError('吐出配管摩擦損失 ΔP_d は 0 以上で入力してください。');
    if (!positive(Pa)) return setError('大気圧 Pa を正の値で入力してください（通常 101.325 kPa）。');

    const dPsOK = isFinite(dPs) && dPs >= 0;
    const dPdOK = isFinite(dPd) && dPd >= 0;

    // ===== ① 全揚程 H =====
    const hReady = [z1, z2, P1g, P2g].every(finite) && dPsOK && dPdOK;
    let H = NaN, c1;
    if (hReady) {
      const Hs = z2 - z1;
      const Hp = (P2g - P1g) / (rho * G);
      const Hf = (dPs + dPd) / (rho * G);
      H = Hs + Hp + Hf;
      c1 = cardOK('① ポンプ全揚程 H', `H = ${fmtNum(H)} <span class="unit">m</span>`, [
        ['実揚程 (z₂ − z₁)', `${fmtNum(Hs)} m`],
        ['静圧差 (P₂ − P₁)/ρg', `${fmtNum(Hp)} m`],
        ['摩擦損失 (ΔP<sub>s</sub> + ΔP<sub>d</sub>)/ρg', `${fmtNum(Hf)} m`],
      ], null);
    } else {
      c1 = cardPending('① ポンプ全揚程 H', '基本条件（液面高さ・タンク圧）と配管損失を入力すると計算します。');
    }

    // ===== ② 利用可能NPSH（NPSHa）=====
    let c2;
    const Pv = presToPaAbs(val('Pv'), unitOf('Pv'));
    if (finite(P1g) && finite(z1) && dPsOK && finite(Pv) && Pv >= 0) {
      const P1abs = P1g + Pa;
      const NPSHa = (P1abs - Pv) / (rho * G) + z1 - dPs / (rho * G);
      const rows = [
        ['吸込絶対圧 (P₁ + P<sub>a</sub>)', `${fmtNum(P1abs / 1000)} kPa abs`],
        ['(P₁ + P<sub>a</sub> − P<sub>v</sub>)/ρg', `${fmtNum((P1abs - Pv) / (rho * G))} m`],
        ['液面高さ z₁', `${fmtNum(z1)} m`],
        ['吸込摩擦損失 ΔP<sub>s</sub>/ρg', `${fmtNum(dPs / (rho * G))} m`],
      ];
      const notes = [];
      if (NPSHa < 0) notes.push('NPSH<sub>a</sub> が負です。このままではキャビテーションが発生します。');
      const NPSHr = val('NPSHr');
      if (positive(NPSHr)) {
        const m = NPSHa - NPSHr;
        rows.push(['NPSH 余裕 (NPSH<sub>a</sub> − NPSH<sub>r</sub>)', `${fmtNum(m)} m`]);
        if (m < 0) notes.push('NPSH<sub>a</sub> が NPSH<sub>r</sub> を下回っています（キャビテーション領域）。');
        else if (m < 1) notes.push('NPSH 余裕が 1 m 未満です。');
      }
      c2 = cardOK('② 利用可能NPSH（NPSH<sub>a</sub>）', `NPSH<sub>a</sub> = ${fmtNum(NPSHa)} <span class="unit">m</span>`, rows, notes);
    } else {
      c2 = cardPending('② 利用可能NPSH（NPSH<sub>a</sub>）', '吸込側（液面高さ z₁・タンク圧 P₁）・吸込配管損失・飽和蒸気圧 P<sub>v</sub> を入力すると計算します。');
    }

    // ===== ③④⑤ 動力 =====
    const Q = qToSI(val('Q'), unitOf('Q'));
    const etaP = val('eta_p'), etaM = val('eta_m');
    let Pw = NaN, Ps = NaN, c3, c4, c5;

    // ③ 水動力 Pw = ρgQH
    if (!positive(Q)) {
      c3 = cardPending('③ 水動力 P<sub>w</sub>', '流量 Q が未入力のため未計算です。');
    } else if (!hReady) {
      c3 = cardPending('③ 水動力 P<sub>w</sub>', '全揚程 H が必要です（基本条件・配管損失を入力）。');
    } else if (!(H > 0)) {
      c3 = cardPending('③ 水動力 P<sub>w</sub>', `全揚程 H = ${fmtNum(H)} m（0 以下）のため動力は計算しません。`);
    } else {
      Pw = rho * G * Q * H;
      c3 = cardOK('③ 水動力 P<sub>w</sub>', `${fmtNum(Pw / 1000)} <span class="unit">kW</span>`,
        [['P<sub>w</sub> = ρgQH', `${fmtNum(Pw / 1000)} kW`]],
        ['全揚程 H = ' + fmtNum(H) + ' m（①の値）を使用しています。']);
    }

    // ④ 軸動力 Ps = Pw/ηp
    if (!isFinite(Pw)) {
      c4 = cardPending('④ 軸動力 P<sub>s</sub>', '水動力 P<sub>w</sub> が必要です（流量 Q と全揚程 H を入力）。');
    } else if (!(positive(etaP) && etaP <= 1)) {
      c4 = cardPending('④ 軸動力 P<sub>s</sub>', 'ポンプ効率 η<sub>p</sub> を 0〜1 で入力すると計算します。');
    } else {
      Ps = Pw / etaP;
      c4 = cardOK('④ 軸動力 P<sub>s</sub>', `${fmtNum(Ps / 1000)} <span class="unit">kW</span>`,
        [['P<sub>s</sub> = P<sub>w</sub> / η<sub>p</sub>', `${fmtNum(Ps / 1000)} kW`]], null);
    }

    // ⑤ モーター入力 Pm = Ps/ηm
    if (!isFinite(Ps)) {
      c5 = cardPending('⑤ モーター入力 P<sub>m</sub>', '軸動力 P<sub>s</sub> が必要です（ポンプ効率 η<sub>p</sub> を入力）。');
    } else if (!(positive(etaM) && etaM <= 1)) {
      c5 = cardPending('⑤ モーター入力 P<sub>m</sub>', 'モーター効率 η<sub>m</sub> を 0〜1 で入力すると計算します。');
    } else {
      const Pm = Ps / etaM;
      c5 = cardOK('⑤ モーター入力 P<sub>m</sub>', `${fmtNum(Pm / 1000)} <span class="unit">kW</span>`,
        [['P<sub>m</sub> = P<sub>s</sub> / η<sub>m</sub>', `${fmtNum(Pm / 1000)} kW`]], null);
    }

    $('result-area').innerHTML = [c1, c2, c3, c4, c5].join(SEP);
  }

  function reset() {
    ['rho', 'Q', 'z1', 'z2', 'P1', 'P2', 'dPs', 'dPd', 'Pv', 'NPSHr'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('Pa')) $('Pa').value = '101.325';
    if ($('eta_p')) $('eta_p').value = '0.70';
    if ($('eta_m')) $('eta_m').value = '0.90';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
  });
})();
