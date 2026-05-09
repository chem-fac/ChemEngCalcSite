(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    d: { m: 1, cm: 0.01, mm: 0.001 },
    D: { m: 1, cm: 0.01, mm: 0.001 },
    H: { m: 1, cm: 0.01, mm: 0.001 },
    b: { m: 1, cm: 0.01, mm: 0.001 },
    B: { m: 1, cm: 0.01, mm: 0.001 },
    hB: { m: 1, cm: 0.01, mm: 0.001 },
    rho: { kgm3: 1, gcm3: 1000 },
    n: { rps: 1, rpm: 1 / 60 },
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
  function getSI(field) {
    const el = $(field);
    if (!el || el.value === '') return NaN;
    const v = parseFloat(el.value);
    const unit = $(field + '_unit') ? $(field + '_unit').value : null;
    return isFinite(v) ? v * (TO_SI[field] && unit ? TO_SI[field][unit] : 1) : NaN;
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  const MODELS = {
    paddle: { label: 'パドル翼', np: 4, theta: 90, baffle: 'paddle' },
    pitched: { label: '傾斜パドル翼／プロペラ翼', np: 4, theta: 45, baffle: 'pitched' },
    large: { label: '大型翼', np: 2, theta: 90, baffle: 'large' },
    hr320: { label: 'スーパーミックスHR320', np: 2, theta: 45, baffle: 'hr', npmax: 0.46 },
    hr320s: { label: 'スーパーミックスHR320S', np: 2, theta: 45, baffle: 'hr', npmax: 0.67 },
  };

  function applyModel(key) {
    const m = MODELS[key];
    if (!m) return;
    if ($('np')) $('np').value = m.np;
    if ($('theta')) $('theta').value = m.theta;
    if (m.npmax && $('Npmax')) $('Npmax').value = m.npmax;
    if (!m.npmax && $('Npmax')) $('Npmax').value = '';
    const note = $('model-note');
    if (note) {
      note.textContent = m.npmax
        ? `${m.label}の完全邪魔板条件動力数を入力しました。`
        : `${m.label}用の代表的な羽根枚数・角度を入力しました。必要に応じて実機値に変更してください。`;
    }
  }

  function autoNpmax(model, np, b, d, thetaRad) {
    if (positive(parseFloat($('Npmax').value))) return parseFloat($('Npmax').value);
    if (model.npmax) return model.npmax;
    if (model.baffle === 'paddle') {
      const phi = Math.pow(np, 0.7) * b / d;
      if (phi <= 0.54) return 10 * Math.pow(phi, 1.3);
      if (phi <= 1.6) return 8.3 * phi;
      return 10 * Math.pow(phi, 0.6);
    }
    if (model.baffle === 'pitched') {
      const angleTerm = 2 * thetaRad / Math.PI;
      const sinTheta = Math.sin(thetaRad);
      return 8.3 * Math.pow(angleTerm, 0.9) * (Math.pow(np, 0.3) * b * Math.pow(sinTheta, 1.6) / d);
    }
    return NaN;
  }

  function calcX(model, vals, Npmax) {
    const { B, D, H, hB, nB, thetaRad, Np0 } = vals;
    if (model.baffle === 'paddle') {
      return 4.5 * (B / D) * Math.pow(nB, 0.8) * ((H / D) / Math.pow(Npmax, 0.2)) + Np0 / Npmax;
    }
    if (model.baffle === 'pitched') {
      const angleTerm = Math.pow(2 * thetaRad / Math.PI, 0.72);
      return 4.5 * (B / D) * Math.pow(nB, 0.8) * (hB / H) / Math.pow(angleTerm * Npmax, 0.2) + Np0 / Npmax;
    }
    if (model.baffle === 'large') {
      return 3.8 * (B / D) * Math.pow(nB, 0.8) * ((H / D) / Math.pow(Npmax, 0.2));
    }
    if (model.baffle === 'hr') {
      const angleTerm = Math.pow(2 * thetaRad / Math.PI, 0.72);
      return 1.8 * (B / D) * Math.pow(nB, 0.8) * ((H / D) / angleTerm) + Np0 / Npmax;
    }
    return NaN;
  }

  function calculate() {
    clearError();
    const model = MODELS[$('model').value];
    if (!model) return setError('翼種・推算式を選択してください。');

    const vals = {
      d: getSI('d'),
      D: getSI('D'),
      H: getSI('H'),
      b: getSI('b'),
      B: getSI('B'),
      hB: getSI('hB'),
      rho: getSI('rho'),
      n: getSI('n'),
      nB: parseFloat($('nB').value),
      np: parseFloat($('np').value),
      thetaRad: parseFloat($('theta').value) * Math.PI / 180,
      Np0: parseFloat($('Np0').value),
    };
    if (!positive(vals.hB)) vals.hB = vals.H;

    for (const k of ['d','D','H','B','rho','n','nB','Np0']) {
      if (!positive(vals[k])) return setError('槽・バッフル・物性・Np0 の入力値を正の数値で入力してください。');
    }
    if (vals.D <= vals.d) return setError('槽径 D は翼径 d より大きい必要があります。');
    if ((model.baffle === 'paddle' || model.baffle === 'pitched') && (!positive(vals.b) || !positive(vals.np))) {
      return setError('この推算式では翼幅 b と羽根枚数 np が必要です。');
    }
    if ((model.baffle === 'pitched' || model.baffle === 'hr') && (!positive(vals.thetaRad) || vals.thetaRad >= Math.PI / 2 + 1e-8)) {
      return setError('羽根取り付け角度 θ は 0〜90 deg の範囲で入力してください。');
    }

    const Npmax = autoNpmax(model, vals.np, vals.b, vals.d, vals.thetaRad);
    if (!positive(Npmax)) return setError('完全邪魔板条件の動力数 Npmax を入力してください。大型翼では手入力が必要です。');

    const x = calcX(model, vals, Npmax);
    if (!positive(x)) return setError('バッフル条件から補正変数 x を計算できませんでした。');

    const NpCandidate = Math.pow(1 + Math.pow(x, -3), -1 / 3) * Npmax;
    const Np = Math.max(vals.Np0, NpCandidate);
    const P = Np * vals.rho * Math.pow(vals.n, 3) * Math.pow(vals.d, 5);
    const T = P / (2 * Math.PI * vals.n);
    if (![NpCandidate, Np, P, T].every(positive)) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');

    const boundNote = Np === vals.Np0
      ? '<div class="result-note">※ 補正式の計算値がバッフル無し動力数を下回ったため、下限として Np0 を採用しました。</div>'
      : '';
    $('result-area').innerHTML = `
      <div class="result-target">バッフルあり撹拌所要動力 <span class="sym">P</span></div>
      <div class="result-value-big">${fmtNum(P)} <span class="unit">W</span></div>
      <div class="result-detail-label">主要結果</div>
      <table class="unit-table"><tbody>
        <tr><td>所要動力</td><td class="num">${fmtNum(P / 1000)} kW</td></tr>
        <tr><td>バッフルあり動力数 <span class="sym">N<sub>p</sub></span></td><td class="num">${fmtNum(Np)} ［-］</td></tr>
        <tr><td>完全邪魔板条件動力数 <span class="sym">N<sub>Pmax</sub></span></td><td class="num">${fmtNum(Npmax)} ［-］</td></tr>
        <tr><td>トルク <span class="sym">T</span></td><td class="num">${fmtNum(T)} N·m</td></tr>
      </tbody></table>
      <div class="result-detail-label">中間量</div>
      <table class="unit-table"><tbody>
        <tr><td>適用モデル</td><td class="num">${model.label}</td></tr>
        <tr><td>バッフル補正変数 <span class="sym">x</span></td><td class="num">${fmtNum(x)}</td></tr>
        <tr><td>補正式のみの動力数</td><td class="num">${fmtNum(NpCandidate)} ［-］</td></tr>
        <tr><td>バッフル無し動力数 <span class="sym">N<sub>p0</sub></span></td><td class="num">${fmtNum(vals.Np0)} ［-］</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>計算式：<span class="sym">N<sub>p</sub></span> = (1 + x<sup>-3</sup>)<sup>-1/3</sup><span class="sym">N<sub>Pmax</sub></span></div>
        <div>　　　　　<span class="sym">P</span> = <span class="sym">N<sub>p</sub></span>·<span class="sym">ρ</span>·<span class="sym">n</span>³·<span class="sym">d</span>⁵</div>
        <div>入力：<span class="sym">B</span>/<span class="sym">D</span> = ${fmtNum(vals.B / vals.D)}, <span class="sym">n<sub>B</sub></span> = ${fmtNum(vals.nB)}, <span class="sym">H</span>/<span class="sym">D</span> = ${fmtNum(vals.H / vals.D)}, <span class="sym">n</span> = ${fmtNum(vals.n)} 1/s</div>
        ${boundNote}
      </div>
    `;
  }

  function reset() {
    ['d','D','H','b','B','hB','rho','n','nB','np','theta','Np0','Npmax'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    const model = $('model');
    if (model) model.value = '';
    const note = $('model-note');
    if (note) note.textContent = '翼種を選ぶと一部の代表値を入力します。Np0 は亀井・平岡の式などで求めたバッフル無し動力数を入力してください。';
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    $('model').addEventListener('change', () => applyModel($('model').value));
  });
})();
