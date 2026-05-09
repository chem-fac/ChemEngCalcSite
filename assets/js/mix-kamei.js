(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    d: { m: 1, cm: 0.01, mm: 0.001 },
    D: { m: 1, cm: 0.01, mm: 0.001 },
    H: { m: 1, cm: 0.01, mm: 0.001 },
    b: { m: 1, cm: 0.01, mm: 0.001 },
    rho: { kgm3: 1, gcm3: 1000 },
    n: { rps: 1, rpm: 1 / 60 },
    mu: { Pas: 1, mPas: 0.001, cP: 0.001 },
  };

  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig = 4) {
    if (!isFinite(v)) return '—';
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
  function fmtRe(v) {
    if (!isFinite(v)) return '—';
    if (Math.abs(v) >= 1e5) return fmtNum(v, 3);
    if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
    return Number(v.toPrecision(4)).toString();
  }
  function getSI(field) {
    const el = $(field);
    if (!el || el.value === '') return NaN;
    const v = parseFloat(el.value);
    const unit = $(field + '_unit') ? $(field + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[field] && unit ? TO_SI[field][unit] : 1) : NaN;
  }
  function setValue(id, value) {
    const el = $(id);
    if (el && value !== undefined && value !== null) el.value = value;
  }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  const PRESETS = {
    paddle: { label: 'パドル翼', model: 'standard', np: 4, theta: 90, bRatio: 0.20 },
    pitched_paddle: { label: '傾斜パドル翼', model: 'standard', np: 4, theta: 45, bRatio: 0.20 },
    turbine: { label: 'タービン翼', model: 'standard', np: 6, theta: 90, bRatio: 0.20 },
    propeller: { label: 'プロペラ翼', model: 'propeller', np: 3, theta: 45, bRatio: 0.18 },
    retreat: { label: '三枚後退翼', model: 'propeller', np: 3, theta: 45, bRatio: 0.18 },
    hr320: { label: 'スーパーミックスHR320', model: 'hr320', np: 2, theta: 45, bRatio: 0.20 },
    hr320s: { label: 'スーパーミックスHR320S', model: 'hr320s', np: 2, theta: 45, bRatio: 0.20 },
    anchor: { label: 'アンカー翼', model: 'standard', np: 2, theta: 90, bRatio: 0.12 },
    helical: { label: 'ヘリカルリボン翼', model: 'helical', np: 2, theta: 90, bRatio: 0.10 },
    maxblend_dished: { label: 'マックスブレンド／MR205（皿底槽）', model: 'large', np: 2, theta: 90, bRatio: 0.12, ctA: 0.27, ctExp: 0.4 },
    maxblend_flat: { label: 'マックスブレンド／MR205（平底槽）', model: 'large', np: 2, theta: 90, bRatio: 0.12, ctA: 0.30, ctExp: 0.4 },
    fullzone_dished: { label: 'フルゾーン（皿底槽）', model: 'large', np: 2, theta: 90, bRatio: 0.12, ctA: 0.22, ctExp: 0.4 },
    fullzone_flat: { label: 'フルゾーン（平底槽）', model: 'large', np: 2, theta: 90, bRatio: 0.12, ctA: 0.30, ctExp: 0.5 },
  };

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    setValue('np', p.np);
    setValue('theta', p.theta);
    const d = getSI('d');
    if (isFinite(d) && d > 0 && p.bRatio) {
      const unit = $('b_unit') ? $('b_unit').value : 'mm';
      const factor = TO_SI.b[unit] || 1;
      setValue('b', fmtNum((d * p.bRatio) / factor, 4));
    }
    const hint = $('preset-note');
    if (hint) {
      hint.textContent = `${p.label}用の代表的な羽根枚数・角度を入力しました。翼幅 b は必要に応じて実機値に合わせてください。`;
    }
  }

  function commonGeometry(d, D, H, np) {
    const lnDd = Math.log(D / d);
    const beta = 2 * lnDd / ((D / d) - (d / D));
    const eta = 0.711 * (0.157 + np * Math.pow(lnDd, 0.611)) /
      (Math.pow(np, 0.52) * (1 - Math.pow(d / D, 2)));
    const gamma = Math.pow((eta * lnDd) / Math.pow(beta * D / d, 5), 1 / 3);
    return { lnDd, beta, eta, gamma };
  }

  function calcStandard({ d, D, H, b, np, thetaRad, Red, preset }) {
    const geom = commonGeometry(d, D, H, np);
    const sinTheta = Math.max(Math.sin(thetaRad), 1e-8);
    const bEff = preset.model === 'hr320s' ? 1.74 * b : b;
    const x = geom.gamma * Math.pow(np, 0.7) * (bEff / H) * Math.pow(sinTheta, 1.6);
    const CL = 0.215 * geom.eta * np * (d / H) * (1 - Math.pow(d / D, 2)) +
      1.83 * (bEff * sinTheta / H) * Math.pow(np / (2 * sinTheta), 1 / 3);

    let ctA = 1.96;
    let ctExp = 1.19;
    let mA = 0.71;
    let ctrA = 23.8;
    if (preset.model === 'propeller') {
      ctA = 3.0;
      ctExp = 1.5;
      mA = 0.8;
    } else if (preset.model === 'hr320') {
      ctA = 36.7;
      ctExp = 1.73;
    } else if (preset.model === 'hr320s') {
      ctA = 25.0;
      ctExp = 1.73;
      mA = 1.01;
      ctrA = 0.2;
    }

    const Ct = Math.pow(Math.pow(ctA * Math.pow(x, ctExp), -7.8) + Math.pow(0.25, -7.8), -1 / 7.8);
    const m = Math.pow(Math.pow(mA * Math.pow(x, 0.373), -7.8) + Math.pow(0.333, -7.8), -1 / 7.8);
    const Ctr = ctrA * Math.pow(d / D, -3.24) * Math.pow((bEff * sinTheta) / D, -1.18) * Math.pow(x, -0.74);
    const finf = 0.0151 * (d / D) * Math.pow(Ct, 0.308);
    const ReG = (Math.PI * geom.eta * geom.lnDd * geom.beta * D / (4 * d)) * Red;
    const prefactor = (1.2 * Math.pow(Math.PI, 4) * geom.beta * geom.beta * D * D * H) / (8 * Math.pow(d, 3));
    return finishNp0({ ...geom, x, CL, Ct, m, Ctr, finf, ReG, prefactor, modelNote: preset.label });
  }

  function calcLarge({ d, D, H, b, np, Red, preset }) {
    const geom = commonGeometry(d, D, H, np);
    const x = geom.gamma * Math.pow(np, 0.7) * (b / H);
    const CL = 0.215 * geom.eta * np * (d / H) * (1 - Math.pow(d / D, 2)) +
      1.83 * (b / H) * Math.pow(np / 2, 1 / 3);
    const Ct = Math.pow(Math.pow(preset.ctA * Math.pow(x, preset.ctExp), -7.8) + Math.pow(0.25, -7.8), -1 / 7.8);
    const m = 0.333;
    const Ctr = 1000 * Math.pow(d / D, -3.24) * Math.pow(b / D, -1.18) * Math.pow(x, -0.74);
    const finf = 0.0151 * (d / D) * Math.pow(Ct, 0.308);
    const ReG = (Math.PI * geom.eta * geom.lnDd * geom.beta * D / (4 * d)) * Red;
    const prefactor = (1.2 * Math.pow(Math.PI, 4) * geom.beta * geom.beta * D * D * H) / (8 * Math.pow(d, 3));
    return finishNp0({ ...geom, x, CL, Ct, m, Ctr, finf, ReG, prefactor, modelNote: preset.label });
  }

  function calcHelical({ Red }) {
    const CL = 1.0;
    const Ct = 0.100;
    const m = 0.333;
    const Ctr = 2500;
    const finf = 0.00683;
    const ReG = 0.0388 * Red;
    const inner = 1 / (Ctr / ReG + ReG) + Math.pow(finf / Ct, 1 / m);
    const f = CL / ReG + Ct * Math.pow(inner, m);
    const Np0 = 16.0 * f;
    return {
      Np0, f, ReG, beta: 0.999, eta: 0.538, x: NaN,
      CL, Ct, m, Ctr, finf, prefactor: 16.0,
      modelNote: 'ヘリカルリボン翼',
    };
  }

  function finishNp0(c) {
    const inner = 1 / (c.Ctr / c.ReG + c.ReG) + Math.pow(c.finf / c.Ct, 1 / c.m);
    const f = c.CL / c.ReG + c.Ct * Math.pow(inner, c.m);
    return { ...c, f, Np0: c.prefactor * f };
  }

  function calculate() {
    clearError();
    const presetKey = $('preset').value;
    const preset = PRESETS[presetKey];
    if (!preset) return setError('翼種プリセットを選択してください。');

    const d = getSI('d');
    const D = getSI('D');
    const H = getSI('H');
    const b = getSI('b');
    const rho = getSI('rho');
    const n = getSI('n');
    const mu = getSI('mu');
    const np = parseFloat($('np').value);
    const thetaDeg = parseFloat($('theta').value);
    const baseVals = { d, D, H, rho, n, mu, np, thetaDeg };
    for (const k in baseVals) {
      if (!isFinite(baseVals[k]) || baseVals[k] <= 0) return setError('すべての入力値を正の数値で入力してください。');
    }
    if (D <= d) return setError('槽径 D は翼径 d より大きい必要があります。');
    if (preset.model !== 'helical' && (!isFinite(b) || b <= 0)) return setError('翼幅 b を正の数値で入力してください。');

    const Red = rho * n * d * d / mu;
    const thetaRad = thetaDeg * Math.PI / 180;
    let calc;
    if (preset.model === 'helical') {
      calc = calcHelical({ Red });
    } else if (preset.model === 'large') {
      calc = calcLarge({ d, D, H, b, np, Red, preset });
    } else {
      calc = calcStandard({ d, D, H, b, np, thetaRad, Red, preset });
    }

    const P = calc.Np0 * rho * Math.pow(n, 3) * Math.pow(d, 5);
    const T = P / (2 * Math.PI * n);
    if (![calc.Np0, calc.f, calc.ReG, P, T].every(v => isFinite(v) && v > 0)) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。寸法比や翼幅を見直してください。');
    }

    const xRow = isFinite(calc.x)
      ? `<tr><td>形状変数 <span class="sym">X</span></td><td class="num">${fmtNum(calc.x)}</td></tr>`
      : '';
    $('result-area').innerHTML = `
      <div class="result-target">バッフル無し撹拌所要動力 <span class="sym">P</span></div>
      <div class="result-value-big">${fmtNum(P)} <span class="unit">W</span></div>
      <div class="result-detail-label">主要結果</div>
      <table class="unit-table"><tbody>
        <tr><td>所要動力</td><td class="num">${fmtNum(P / 1000)} kW</td></tr>
        <tr><td>バッフル無し動力数 <span class="sym">N<sub>p0</sub></span></td><td class="num">${fmtNum(calc.Np0)} ［-］</td></tr>
        <tr><td>トルク <span class="sym">T</span></td><td class="num">${fmtNum(T)} N·m</td></tr>
        <tr><td>翼レイノルズ数 <span class="sym">Re<sub>d</sub></span></td><td class="num">${fmtRe(Red)} ［-］</td></tr>
      </tbody></table>

      <div class="result-detail-label">中間量</div>
      <table class="unit-table"><tbody>
        <tr><td>適用モデル</td><td class="num">${calc.modelNote}</td></tr>
        ${xRow}
        <tr><td>流れレイノルズ数 <span class="sym">Re<sub>G</sub></span></td><td class="num">${fmtRe(calc.ReG)}</td></tr>
        <tr><td><span class="sym">C<sub>L</sub></span></td><td class="num">${fmtNum(calc.CL)}</td></tr>
        <tr><td><span class="sym">C<sub>t</sub></span></td><td class="num">${fmtNum(calc.Ct)}</td></tr>
        <tr><td><span class="sym">C<sub>tr</sub></span></td><td class="num">${fmtNum(calc.Ctr)}</td></tr>
        <tr><td><span class="sym">f<sub>∞</sub></span></td><td class="num">${fmtNum(calc.finf)}</td></tr>
        <tr><td><span class="sym">m</span></td><td class="num">${fmtNum(calc.m)}</td></tr>
        <tr><td><span class="sym">f</span> 関数値</td><td class="num">${fmtNum(calc.f)}</td></tr>
      </tbody></table>

      <div class="result-meta">
        <div>計算式：<span class="sym">P</span> = <span class="sym">N<sub>p0</sub></span>·<span class="sym">ρ</span>·<span class="sym">n</span>³·<span class="sym">d</span>⁵</div>
        <div>入力：<span class="sym">d</span> = ${fmtNum(d * 1000)} mm, <span class="sym">D</span> = ${fmtNum(D * 1000)} mm, <span class="sym">H</span> = ${fmtNum(H * 1000)} mm, <span class="sym">n</span> = ${fmtNum(n)} 1/s, <span class="sym">ρ</span> = ${fmtNum(rho)} kg/m³, <span class="sym">μ</span> = ${fmtNum(mu)} Pa·s</div>
        <div class="result-note">※ 亀井・平岡の式はバッフル無し条件の相関式です。バッフル付きの推算には「バッフルあり撹拌所要動力」を使用してください。</div>
      </div>
    `;
  }

  function reset() {
    ['d','D','H','b','rho','n','mu','np','theta'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    const sel = $('preset');
    if (sel) sel.value = '';
    const note = $('preset-note');
    if (note) note.textContent = 'プリセットで代表的な羽根枚数・角度を入力します。翼幅や物性値は実機条件に合わせて入力してください。';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    const sel = $('preset');
    if (sel) sel.addEventListener('change', () => applyPreset(sel.value));
    const d = $('d');
    if (d) d.addEventListener('change', () => applyPreset(sel.value));
  });
})();
