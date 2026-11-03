(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = 8.314462618; // J/(mol·K)
  const P_ATM = 101325; // Pa
  const MA_LIMIT = 0.3;
  const TO_SI = {
    dP: { kPa: 1e3, MPa: 1e6 },
    K: { GPa: 1e9, MPa: 1e6 },
    rho: { kgm3: 1, gcm3: 1000 },
    dp_b: { kPa: 1e3, MPa: 1e6 },
  };
  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');

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
  function isBlank(id) { return $(id).value === ''; }
  function getSI(id) {
    const v = val(id);
    const u = $(id + '_unit') ? $(id + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[id] && u ? TO_SI[id][u] : 1) : NaN;
  }
  // 入口圧力は絶対圧 Pa に直す（ゲージ圧は大気圧を足す）
  function getP1Abs() {
    const v = val('P1');
    if (!isFinite(v)) return NaN;
    switch ($('P1_unit').value) {
      case 'kPaG': return v * 1e3 + P_ATM;
      case 'MPaG': return v * 1e6 + P_ATM;
      case 'kPaA': return v * 1e3;
      case 'MPaA': return v * 1e6;
      default: return NaN;
    }
  }
  function positive(v) { return isFinite(v) && v > 0; }

  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'gas';
  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(el => {
      el.hidden = !el.dataset.showWhen.split(/\s+/).includes(next);
    });
    clearError();
    clearResult();
  }

  function machJudge(Ma) {
    if (Ma <= MA_LIMIT) return '非圧縮性とみなせる';
    if (Ma < 1) return '圧縮性を考える';
    return '音速以上';
  }

  function pressureJudge(ratio) {
    if (ratio <= 0.1) return '入口か出口の密度で計算できる';
    if (ratio <= 0.4) return '入口と出口の平均の密度で計算する';
    return '圧縮性流体の式で計算する';
  }

  function calculate() {
    clearError();
    const vId = mode === 'gas' ? 'v' : 'v_b';
    const v = val(vId);
    if (isBlank(vId)) return setError('流速を入力してください。');
    if (!positive(v)) return setError('流速は正の数値で入力してください。');

    let a, Ma, drhoVel, soundNote;
    const pressRows = [];
    const notes = [];
    let pressJudgeRow = '';
    let skip = '';

    if (mode === 'gas') {
      const T = val('T');
      const M = val('M');
      const k = val('k');
      if (!isFinite(T) || !isFinite(M) || !isFinite(k)) return setError('温度・モル質量・比熱比を入力してください。');
      const TK = T + 273.15;
      if (TK <= 0) return setError('温度が絶対零度（-273.15 °C）以下です。温度を見直してください。');
      if (!positive(M)) return setError('モル質量は正の数値で入力してください。');
      if (!(k > 1)) return setError('比熱比は1より大きい値で入力してください。');
      if (k > 1.67) return setError('理想気体の比熱比は5/3（約1.67、単原子分子の気体）を超えません。比熱比を見直してください。');
      a = Math.sqrt(k * R * TK / (M / 1000));
      Ma = v / a;
      drhoVel = 1 - Math.pow(1 + (k - 1) / 2 * Ma * Ma, -1 / (k - 1));
      soundNote = '音速は理想気体の式 a = √(kRT/M) で求めています。';

      const hasP1 = !isBlank('P1');
      const hasDP = !isBlank('dP');
      if (hasP1 && hasDP) {
        const P1 = getP1Abs();
        const dP = getSI('dP');
        if (!positive(P1)) return setError('入口圧力が絶対圧で0以下です。ゲージ圧と絶対圧の単位を見直してください。');
        if (!isFinite(dP) || dP < 0) return setError('圧力損失は0以上の数値で入力してください。');
        if (dP >= P1) return setError('圧力損失が入口の絶対圧以上です。出口の圧力が0以下になるので、入力を見直してください。');
        const ratio = dP / P1;
        pressJudgeRow = `<tr><td>圧力損失による判定</td><td class="num">${pressureJudge(ratio)}</td></tr>`;
        pressRows.push(`<tr><td>入口圧力（絶対圧） <span class="sym">P<sub>1</sub></span></td><td class="num">${fmtNum(P1 / 1000)} kPaA</td></tr>`);
        pressRows.push(`<tr><td>圧力損失の割合 <span class="sym">ΔP/P<sub>1</sub></span></td><td class="num">${fmtNum(ratio * 100)} %</td></tr>`);
        if (Ma <= MA_LIMIT && ratio > 0.1 && ratio <= 0.4) {
          notes.push('<div class="result-note">※ 流速では非圧縮性とみなせますが、圧力損失で密度が変わります。入口と出口の平均の密度で圧力損失を計算し直してください。</div>');
        } else if (ratio > 0.4) {
          notes.push('<div class="result-note-warn">※ 圧力損失で密度が大きく変わるため、密度一定の式は使えません。等温流れなど圧縮性流体の式で計算してください。</div>');
        }
      } else if (hasP1 || hasDP) {
        skip = `<p class="result-skip">${hasP1 ? '圧力損失' : '入口圧力'}が未入力のため、圧力損失による判定はしていません。</p>`;
      } else {
        skip = '<p class="result-skip">入口圧力と圧力損失が未入力のため、圧力損失による判定はしていません。</p>';
      }
    } else {
      const K = getSI('K');
      const rho = getSI('rho');
      if (isBlank('K') || isBlank('rho')) return setError('体積弾性係数と密度を入力してください。');
      if (!positive(K)) return setError('体積弾性係数は正の数値で入力してください。');
      if (!positive(rho)) return setError('密度は正の数値で入力してください。');
      a = Math.sqrt(K / rho);
      Ma = v / a;
      drhoVel = Ma * Ma / 2;
      soundNote = '音速は a = √(K/ρ) で求めています。';

      if (!isBlank('dp_b')) {
        const dp = getSI('dp_b');
        if (!isFinite(dp) || dp < 0) return setError('圧力の変化は0以上の数値で入力してください。');
        const ratio = dp / K;
        pressRows.push(`<tr><td>圧力の変化による密度の変化 <span class="sym">Δρ/ρ</span></td><td class="num">${fmtNum(ratio * 100)} %</td></tr>`);
        if (ratio > 0.1) {
          notes.push('<div class="result-note-warn">※ 圧力の変化による密度の変化が10%を超えます。体積弾性係数を一定とした近似の範囲を外れるので、圧力ごとの物性で計算してください。</div>');
        }
      }
    }

    if (![a, Ma, drhoVel].every(isFinite)) return setError('計算結果が数値範囲を超えました。入力値の桁数を見直してください。');

    if (Ma >= 1) {
      notes.unshift(mode === 'gas'
        ? '<div class="result-note-warn">※ マッハ数が1以上です。一定断面の配管の中で、亜音速で入った気体が音速を超えることはありません。流速の値を見直してください。</div>'
        : '<div class="result-note-warn">※ マッハ数が1以上です。流速・体積弾性係数・密度の値と単位を見直してください。</div>');
    }

    $('result-area').innerHTML = `
      <div class="result-target">マッハ数 <span class="sym">Ma</span></div>
      <div class="result-value-big">${fmtNum(Ma)}</div>
      <div class="result-detail-label">判定</div>
      <table class="unit-table"><tbody>
        <tr><td>マッハ数による判定</td><td class="num">${machJudge(Ma)}</td></tr>
        ${pressJudgeRow}
      </tbody></table>
      ${skip}
      <div class="result-detail-label">途中の値</div>
      <table class="unit-table"><tbody>
        <tr><td>音速 <span class="sym">a</span></td><td class="num">${fmtNum(a)} m/s</td></tr>
        <tr><td>Ma = 0.3 となる流速</td><td class="num">${fmtNum(MA_LIMIT * a)} m/s</td></tr>
        <tr><td>流速による密度の変化</td><td class="num">${fmtNum(drhoVel * 100)} %</td></tr>
        ${pressRows.join('')}
      </tbody></table>
      <div class="result-meta">
        <div>${soundNote}</div>
        <div>流速による密度の変化は、流れを止めたときの密度との差です。</div>
      </div>
      ${notes.join('')}
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    setMode('gas');
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', () => {
      document.querySelectorAll('#calculator input').forEach(el => { el.value = ''; });
      clearError();
      clearResult();
    });
    document.querySelectorAll('#calculator input').forEach(el => {
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') calculate(); });
    });
  });
})();
