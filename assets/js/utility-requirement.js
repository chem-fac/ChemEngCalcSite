(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    Q: { kW: 1, W: 0.001, MJh: 1000 / 3600, kcalh: 4.1868 / 3600 },
    cp: { kJkgK: 1, JkgK: 0.001, kcalkgK: 4.1868 },
    latent: { kJkg: 1, Jkg: 0.001, kcalkg: 4.1868 },
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
  let mode = 'cooling';
  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      const modes = row.dataset.showWhen.split(/\s+/);
      row.hidden = !modes.includes(next);
    });
    if ($('Tin') && $('Tout') && $('cp')) {
      if (next === 'oil') {
        $('Tin').placeholder = '例：180';
        $('Tout').placeholder = '例：160';
        $('cp').placeholder = '例：2.2';
      } else {
        $('Tin').placeholder = '例：25';
        $('Tout').placeholder = '例：35';
        $('cp').placeholder = '例：4.18';
      }
    }
    clearError();
    clearResult();
  }
  function calculate() {
    clearError();
    const Q = getSI('Q');
    const allowance = val('allowance');
    if (!positive(Q)) return setError('熱量 Q を正の数値で入力してください。');
    if (isFinite(allowance) && allowance < 0) return setError('余裕率は 0 以上の値で入力してください。');
    const factor = 1 + (isFinite(allowance) ? allowance : 0) / 100;
    const Qreq = Q * factor;
    if (mode === 'steam') {
      const latent = getSI('latent');
      if (!positive(latent)) return setError('蒸気潜熱を正の数値で入力してください。');
      const mdot = Qreq / latent;
      $('result-area').innerHTML = `
        <div class="result-target">必要蒸気量</div>
        <div class="result-value-big">${fmtNum(mdot * 3600)} <span class="unit">kg/h</span></div>
        <table class="unit-table"><tbody>
          <tr><td>必要蒸気量</td><td class="num">${fmtNum(mdot)} kg/s</td></tr>
          <tr><td>必要蒸気量</td><td class="num">${fmtNum(mdot * 3.6)} t/h</td></tr>
          <tr><td>計算熱量</td><td class="num">${fmtNum(Qreq)} kW</td></tr>
        </tbody></table>
        <div class="result-note">※ 蒸気潜熱は圧力で変わります。蒸気表や現場のユーティリティ条件に合わせて入力してください。</div>
      `;
      return;
    }
    const cp = getSI('cp');
    const Tin = val('Tin');
    const Tout = val('Tout');
    const rho = getSI('rho');
    if (!positive(cp) || !isFinite(Tin) || !isFinite(Tout) || Tin === Tout) {
      return setError('比熱と入口・出口温度を入力し、温度差が 0 にならないようにしてください。');
    }
    if (mode === 'cooling' && Tout <= Tin) {
      return setError('冷却水は出口温度が入口温度より高くなるように入力してください。');
    }
    if (mode === 'oil' && Tin <= Tout) {
      return setError('熱媒油は入口温度が出口温度より高くなるように入力してください。');
    }
    const dT = mode === 'cooling' ? Tout - Tin : Tin - Tout;
    const mdot = Qreq / (cp * dT);
    const volumeRows = positive(rho)
      ? `<tr><td>体積流量</td><td class="num">${fmtNum(mdot / rho * 3600)} m³/h</td></tr><tr><td>体積流量</td><td class="num">${fmtNum(mdot / rho * 60000)} L/min</td></tr>`
      : '';
    $('result-area').innerHTML = `
      <div class="result-target">${mode === 'cooling' ? '必要冷却水量' : '必要熱媒油量'}</div>
      <div class="result-value-big">${fmtNum(mdot * 3600)} <span class="unit">kg/h</span></div>
      <table class="unit-table"><tbody>
        <tr><td>質量流量</td><td class="num">${fmtNum(mdot)} kg/s</td></tr>
        ${volumeRows}
        <tr><td>温度差</td><td class="num">${fmtNum(dT)} K</td></tr>
        <tr><td>計算熱量</td><td class="num">${fmtNum(Qreq)} kW</td></tr>
      </tbody></table>
      <div class="result-note">※ 密度を入力すると体積流量も表示します。物性は運転温度での値を使ってください。</div>
    `;
  }
  function reset() {
    ['Q','cp','Tin','Tout','rho','latent','allowance'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('steam_pressure_preset')) $('steam_pressure_preset').value = '';
    clearError();
    clearResult();
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    if ($('steam_pressure_preset')) {
      $('steam_pressure_preset').addEventListener('change', () => {
        const v = $('steam_pressure_preset').value;
        if (!v) return;
        $('latent').value = v;
        $('latent_unit').value = 'kJkg';
      });
    }
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
