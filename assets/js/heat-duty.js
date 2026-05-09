(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    mass_flow: { kgs: 1, kgh: 1 / 3600, th: 1000 / 3600 },
    vol_flow: { m3h: 1 / 3600, m3s: 1, Lmin: 0.001 / 60 },
    mass: { kg: 1, g: 0.001, t: 1000 },
    cp: { kJkgK: 1, JkgK: 0.001, kcalkgK: 4.1868 },
    latent: { kJkg: 1, Jkg: 0.001, kcalkg: 4.1868 },
    batch_time: { s: 1, min: 60, h: 3600 },
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
  function nonNegative(v) { return isFinite(v) && v >= 0; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let basis = 'continuous';
  function setBasis(next) {
    basis = next;
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => {
      const modes = row.dataset.showWhen.split(/\s+/);
      row.hidden = !modes.includes(next);
    });
    clearError();
    clearResult();
  }

  function getMassRate() {
    const mf = getSI('mass_flow');
    if (positive(mf)) return mf;
    const qv = getSI('vol_flow');
    const rho = getSI('rho');
    if (positive(qv) && positive(rho)) return qv * rho;
    return NaN;
  }

  function getHeatSign(useSensible, useLatent, dT) {
    const direction = $('heat_direction') ? $('heat_direction').value : 'auto';
    if (direction === 'heating') {
      if (useSensible && dT < 0) return { error: '加熱・蒸発側を選択した場合は、出口温度が入口温度以上になるように入力してください。' };
      return { sign: 1, label: '加熱側の熱量', batchLabel: '加熱側のバッチ熱量', note: '熱負荷の向きは入力欄の選択に基づいています。' };
    }
    if (direction === 'cooling') {
      if (useSensible && dT > 0) return { error: '除熱・凝縮側を選択した場合は、出口温度が入口温度以下になるように入力してください。' };
      return { sign: -1, label: '冷却側の除去熱量', batchLabel: '冷却側のバッチ除去熱量', note: '熱負荷の向きは入力欄の選択に基づいています。' };
    }
    if (useLatent && !useSensible) {
      return { error: '潜熱のみの場合は、熱負荷の向きで「加熱・蒸発側」または「除熱・凝縮側」を選択してください。' };
    }
    const sign = dT >= 0 ? 1 : -1;
    return {
      sign,
      label: sign >= 0 ? '加熱側の熱量' : '冷却側の除去熱量',
      batchLabel: sign >= 0 ? '加熱側のバッチ熱量' : '冷却側のバッチ除去熱量',
      note: '熱負荷の向きは温度差から自動判定しています。'
    };
  }

  function calculate() {
    clearError();
    const heatMode = $('heat_mode').value;
    const cp = getSI('cp');
    const latent = getSI('latent');
    const Tin = val('Tin');
    const Tout = val('Tout');
    const dT = isFinite(Tin) && isFinite(Tout) ? Tout - Tin : NaN;
    const useSensible = heatMode === 'sensible' || heatMode === 'both';
    const useLatent = heatMode === 'latent' || heatMode === 'both';

    if (useSensible && (!positive(cp) || !isFinite(dT))) {
      return setError('顕熱を計算する場合は、比熱・入口温度・出口温度を入力してください。');
    }
    if (useLatent && !positive(latent)) {
      return setError('潜熱を計算する場合は、潜熱を正の数値で入力してください。');
    }
    const heatSign = getHeatSign(useSensible, useLatent, dT);
    if (heatSign.error) return setError(heatSign.error);

    if (basis === 'continuous') {
      const mdot = getMassRate();
      if (!positive(mdot)) return setError('質量流量、または体積流量と密度を入力してください。');
      const qSensible = useSensible ? mdot * cp * dT : 0;
      const qLatent = useLatent ? heatSign.sign * mdot * latent : 0;
      const q = qSensible + qLatent;
      const qAbs = Math.abs(q);
      const direction = q >= 0 ? '加熱側の熱量' : '冷却側の除去熱量';
      $('result-area').innerHTML = `
        <div class="result-target">${direction} <span class="sym">Q</span></div>
        <div class="result-value-big">${fmtNum(qAbs)} <span class="unit">kW</span></div>
        <table class="unit-table"><tbody>
          <tr><td>熱量</td><td class="num">${fmtNum(qAbs * 3600)} kJ/h</td></tr>
          <tr><td>熱量</td><td class="num">${fmtNum(qAbs * 3600 / 4.1868)} kcal/h</td></tr>
          <tr><td>熱量</td><td class="num">${fmtNum(qAbs / 1000)} MW</td></tr>
          <tr><td>質量流量</td><td class="num">${fmtNum(mdot)} kg/s (= ${fmtNum(mdot * 3600)} kg/h)</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div>顕熱：${fmtNum(Math.abs(qSensible))} kW</div>
          <div>潜熱：${fmtNum(Math.abs(qLatent))} kW</div>
          <div class="result-note">※ ${heatSign.note}</div>
        </div>
      `;
      return;
    }

    const mass = getSI('mass');
    if (!positive(mass)) return setError('バッチ計算では処理量（質量）を入力してください。');
    const eSensible = useSensible ? mass * cp * dT : 0;
    const eLatent = useLatent ? heatSign.sign * mass * latent : 0;
    const e = eSensible + eLatent;
    const eAbs = Math.abs(e);
    const time = getSI('batch_time');
    const avgPower = positive(time) ? eAbs / time : NaN;
    $('result-area').innerHTML = `
      <div class="result-target">${e >= 0 ? '加熱側のバッチ熱量' : '冷却側のバッチ除去熱量'} <span class="sym">Q</span></div>
      <div class="result-value-big">${fmtNum(eAbs)} <span class="unit">kJ</span></div>
      <table class="unit-table"><tbody>
        <tr><td>熱量</td><td class="num">${fmtNum(eAbs / 1000)} MJ</td></tr>
        <tr><td>熱量</td><td class="num">${fmtNum(eAbs / 4.1868)} kcal</td></tr>
        <tr><td>処理量</td><td class="num">${fmtNum(mass)} kg</td></tr>
        ${positive(avgPower) ? `<tr><td>平均熱負荷</td><td class="num">${fmtNum(avgPower)} kW</td></tr>` : ''}
      </tbody></table>
      <div class="result-meta">
        <div>顕熱：${fmtNum(Math.abs(eSensible))} kJ</div>
        <div>潜熱：${fmtNum(Math.abs(eLatent))} kJ</div>
        <div class="result-note">※ ${heatSign.note}</div>
      </div>
    `;
  }

  function reset() {
    ['mass_flow','vol_flow','rho','mass','Tin','Tout','cp','latent','batch_time'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('heat_direction')) $('heat_direction').value = 'auto';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => btn.addEventListener('click', () => setBasis(btn.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setBasis(basis);
  });
})();
