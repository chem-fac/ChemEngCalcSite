(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const TO_SI = {
    rho: { kgm3: 1, gcm3: 1000 },
    u:   { ms: 1, cms: 0.01 },
    D:   { m: 1, cm: 0.01, mm: 0.001, inch: 0.0254 },
    L:   { m: 1, km: 1000 },
    mu:  { Pas: 1, mPas: 0.001, cP: 0.001 },
    eps: { mm: 0.001, um: 1e-6, m: 1 },
  };

  const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
  const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');

  // 単位はメートル。値はページの「管内壁粗さ ε の目安」の表と同じ
  const ROUGHNESS_PRESETS = {
    drawn:      0.0015e-3, // 引抜管（銅管・黄銅管など）：専門書の値
    plastic:    0.0015e-3, // 樹脂管 PVC・PE など：専門書に値は無いが平滑な管とされるので引抜管と同じ値
    commercial: 0.05e-3,   // 市販鋼管：専門書の値
    asphalt:    0.12e-3,   // アスファルト塗り鋳鉄管：専門書の値
    galvan:     0.15e-3,   // 亜鉛引き鉄管：専門書の値
    cast_new:   0.26e-3,   // 鋳鉄管：専門書の値
  };

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

  function fmtRe(Re) {
    if (!isFinite(Re)) return '—';
    if (Re >= 1e5) {
      const exp = Re.toExponential(2);
      const m = exp.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);
      if (m) return `${m[1]}×10${toSup(m[2])}`;
    }
    if (Re >= 1000) return Math.round(Re).toLocaleString('en-US');
    return Re.toFixed(1);
  }

  function readSI(field) {
    const el = $(field);
    if (!el || el.value.trim() === '') return { value: NaN, blank: true, invalid: false };
    const v = Number(el.value.trim());
    const unit = $(field + '_unit').value;
    if (!isFinite(v)) return { value: NaN, blank: false, invalid: true };
    return { value: v * TO_SI[field][unit], blank: false, invalid: false };
  }

  function getSI(field) {
    return readSI(field).value;
  }

  function setError(msg) {
    const e = $('error');
    e.textContent = msg;
    e.style.display = 'block';
    const _ra = $('result-area'); if (_ra) _ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; 
  }
  function clearError() {
    const e = $('error');
    e.textContent = '';
    e.style.display = 'none';
  }
  function clearResult() {
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>';
  }

  // ======== Friction factor ========
  // Returns { f, formula, regime }
  // Colebrook (Fanning form): 1/√(4f) = -2 log10[(ε/D)/3.7 + 2.51/(Re·√(4f))]
  function frictionFactor(Re, epsOverD) {
    if (Re <= 2300) {
      return { f: 16 / Re, formula: '層流の式  f = 16 / Re', regime: 'laminar' };
    }
    // initial guess via Haaland (Darcy form), then iterate Colebrook
    const haaland = 1 / Math.pow(-1.8 * Math.log10(Math.pow(epsOverD / 3.7, 1.11) + 6.9 / Re), 2);
    let lambda = isFinite(haaland) && haaland > 0 ? haaland : 0.02;
    let X = 1 / Math.sqrt(lambda);
    for (let i = 0; i < 80; i++) {
      const Xn = -2 * Math.log10(epsOverD / 3.7 + 2.51 * X / Re);
      if (Math.abs(Xn - X) < 1e-12) { X = Xn; break; }
      X = Xn;
    }
    lambda = 1 / (X * X);
    const f = lambda / 4;
    const regime = (Re < 4000) ? 'transition' : 'turbulent';
    const formula = epsOverD > 0
      ? 'コールブルック (Colebrook) の式（粗面管・反復解）'
      : 'プラントル・カルマン (Prandtl–Kármán) の式（平滑管・反復解）';
    return { f, formula, regime };
  }

  function regimeLabel(key) {
    return { laminar: '層流', transition: '遷移域', turbulent: '乱流' }[key] || '—';
  }

  // 未入力時の既定値：市販鋼管（新しい管）ε = 0.05 mm = 5e-5 m
  const EPS_DEFAULT = 5e-5;

  // 相対粗さ ε/D の上限（コールブルック式・Moody線図の適用範囲）
  const EPS_OVER_D_MAX = 0.05;

  function calculate() {
    clearError();
    const rho = getSI('rho');
    const u = getSI('u');
    const D = getSI('D');
    const L = getSI('L');
    const mu = getSI('mu');
    const epsInfo = readSI('eps');
    const epsBlank = epsInfo.blank;
    if (epsInfo.invalid) {
      return setError('管内壁粗さは数値で入力してください。未入力の場合は既定値、平滑管の場合は0を入力してください。');
    }
    const eps = epsBlank ? EPS_DEFAULT : epsInfo.value;
    const epsDefaulted = epsBlank;

    const fields = { rho, u, D, L, mu };
    for (const k in fields) {
      if (!isFinite(fields[k]) || fields[k] <= 0) {
        return setError('密度・流速・管内径・直管の長さ・粘度は正の数値で入力してください。');
      }
    }
    if (eps < 0) return setError('管内壁粗さは0以上で入力してください。');

    const Re = (rho * u * D) / mu;
    const A = Math.PI * D * D / 4;
    const epsOverD = eps / D;

    if (!isFinite(Re) || Re <= 0) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }
    if (!isFinite(epsOverD) || epsOverD > EPS_OVER_D_MAX) {
      if (epsBlank) {
        return setError('粗さが空欄なので市販鋼管の 0.05 mm を使いますが、この管内径には大きすぎます（ε/D が0.05を超えます）。細い管では、粗さに0（平滑管）か、その管の値を入力してください。');
      }
      return setError('管内壁粗さが管内径に対して大きすぎます。コールブルック式の適用目安として ε/D は0.05以下にしてください。小径の平滑管として計算する場合は粗さに0を入力してください。');
    }

    const { f, formula, regime } = frictionFactor(Re, epsOverD);
    if (!isFinite(f) || f <= 0) {
      return setError('管摩擦係数の収束計算に失敗しました。入力値を見直してください。');
    }

    const lambda = 4 * f;                                     // Darcy–Weisbach
    const dynamicHead = 0.5 * rho * u * u;                    // ρu²/2
    const dPstraight = lambda * (L / D) * dynamicHead;        // 直管の摩擦損失 [Pa]
    const fit = readFittings();
    if (fit.error) return setError(fit.error);
    const dPfit = fit.kSum * dynamicHead;                     // 継手・弁の損失 [Pa]
    const dP = dPstraight + dPfit;                            // ΔP [Pa]
    const dPperL = dPstraight / L;                            // 直管1 mあたり [Pa/m]
    const headLoss = dP / (rho * 9.80665);                    // [m of fluid head]

    if (!isFinite(dP) || dP <= 0) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }

    $('result-area').innerHTML = render({
      Re, regime, f, lambda, dP, dPperL, headLoss, A, formula,
      epsOverD, rho, u, D, L, mu, eps, epsDefaulted,
      dPstraight, dPfit, kSum: fit.kSum, items: fit.items,
    });
  }

  // 継手・弁の表（個数×K）と、その他の K の合計
  function readFittings() {
    const items = [];
    let kSum = 0;
    for (const inp of document.querySelectorAll('#fittings input[data-k]')) {
      const s = inp.value.trim();
      if (s === '') continue;
      const n = Number(s);
      const label = document.querySelector(`label[for="${inp.id}"]`).textContent.trim();
      if (!isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return { error: `${label}の個数は0以上の整数で入力してください。` };
      }
      if (n === 0) continue;
      const k = Number(inp.dataset.k);
      items.push({ label, n, k, sub: n * k });
      kSum += n * k;
    }
    const otherEl = $('k_other');
    const other = otherEl ? otherEl.value.trim() : '';
    if (other !== '') {
      const v = Number(other);
      if (!isFinite(v) || v < 0) return { error: 'その他の K の合計は0以上で入力してください。' };
      if (v > 0) {
        items.push({ label: 'その他の K の合計', n: null, k: v, sub: v });
        kSum += v;
      }
    }
    return { items, kSum };
  }

  function render(r) {
    return `
      <div class="result-target">圧力損失 <span class="sym">ΔP</span></div>
      <div class="result-value-big">${fmtNum(r.dP / 1000)} <span class="unit">kPa</span></div>
      ${r.kSum > 0 ? `
      <div class="result-detail-label">損失の内訳</div>
      <table class="unit-table"><tbody>
        <tr><td>直管の摩擦損失</td><td class="num">${fmtNum(r.dPstraight / 1000)} kPa（${fmtNum(r.dPstraight / r.dP * 100, 3)} %）</td></tr>
        <tr><td>継手・弁の損失</td><td class="num">${fmtNum(r.dPfit / 1000)} kPa（${fmtNum(r.dPfit / r.dP * 100, 3)} %）</td></tr>
        <tr><td>直管の損失 <span class="sym">4fL/D</span></td><td class="num">${fmtNum(r.lambda * r.L / r.D)}</td></tr>
        <tr><td>損失係数の合計 <span class="sym">ΣK</span></td><td class="num">${fmtNum(r.kSum)}</td></tr>
      </tbody></table>
      <div class="result-detail-label">継手・弁の K</div>
      <table class="unit-table"><tbody>
        ${r.items.map(it => `<tr><td>${it.label}</td><td class="num">${it.n === null ? '' : `${it.n} 個 × ${fmtNum(it.k)} = `}${fmtNum(it.sub)}</td></tr>`).join('')}
      </tbody></table>` : ''}

      <div class="result-detail-label">他単位での値</div>
      <table class="unit-table"><tbody>
        <tr><td>Pa</td><td class="num">${fmtNum(r.dP)}</td></tr>
        <tr><td>kPa</td><td class="num">${fmtNum(r.dP / 1000)}</td></tr>
        <tr><td>MPa</td><td class="num">${fmtNum(r.dP / 1e6)}</td></tr>
        <tr><td>bar</td><td class="num">${fmtNum(r.dP / 1e5)}</td></tr>
        <tr><td>kgf/cm²</td><td class="num">${fmtNum(r.dP / 98066.5)}</td></tr>
        <tr><td>流体ヘッド m</td><td class="num">${fmtNum(r.headLoss)}</td></tr>
      </tbody></table>

      <div class="result-detail-label">管摩擦係数・流れの状態</div>
      <table class="unit-table"><tbody>
        <tr><td>レイノルズ数 <span class="sym">Re</span></td><td class="num">${fmtRe(r.Re)}</td></tr>
        <tr><td>流れの状態</td><td class="num"><span class="regime-badge ${r.regime}">${regimeLabel(r.regime)}</span></td></tr>
        <tr><td>管摩擦係数 <span class="sym">f</span>（ファニング定義）</td><td class="num">${fmtNum(r.f)}</td></tr>
        <tr><td>管摩擦係数 <span class="sym">λ</span>（ダルシー定義、= 4f）</td><td class="num">${fmtNum(r.lambda)}</td></tr>
        <tr><td>使用した式</td><td>${r.formula}</td></tr>
      </tbody></table>

      <div class="result-meta">
        <div>直管1 mあたりの摩擦損失 = ${fmtNum(r.dPperL)} Pa/m (= ${fmtNum(r.dPperL / 1000)} kPa/m)</div>
        <div>動圧 <span class="sym">ρu²/2</span> = ${fmtNum(0.5 * r.rho * r.u * r.u)} Pa</div>
        <div>断面積 <span class="sym">A</span> = ${fmtNum(r.A * 10000)} cm² (= ${fmtNum(r.A)} m²)</div>
        ${r.epsDefaulted
            ? `<div>管内壁粗さ：未入力のため市販鋼管（新しい管）として計算（ε = ${fmtNum(r.eps * 1000)} mm、ε/D = ${fmtNum(r.epsOverD)}）</div>`
            : (r.eps > 0
                ? `<div>相対粗さ <span class="sym">ε/D</span> = ${fmtNum(r.epsOverD)} （ε = ${fmtNum(r.eps * 1000)} mm）</div>`
                : '<div>管内壁粗さ：0（平滑管として計算）</div>')}
        <div>入力 <span class="sym">ρ</span> = ${fmtNum(r.rho)} kg/m³, <span class="sym">u</span> = ${fmtNum(r.u)} m/s, <span class="sym">D</span> = ${fmtNum(r.D * 1000)} mm, <span class="sym">L</span> = ${fmtNum(r.L)} m, <span class="sym">μ</span> = ${fmtNum(r.mu * 1000)} mPa·s</div>
        ${r.kSum > 0 && r.Re < 4000 ? '<div class="result-note result-note-warn">※ Re が 4,000 未満です。継手・弁の K は乱流の値なので、継手・弁の損失はずれます。</div>' : ''}
        ${r.regime === 'transition' ? '<div class="result-note">※ レイノルズ数が遷移域（2,300〜4,000）にあります。このツールでは乱流側の式で参考計算していますが、実際の摩擦係数は条件により変動しやすいため、設計値として使う場合は安全側の評価や実測値を確認してください。</div>' : ''}
      </div>
    `;
  }

  function reset() {
    ['rho', 'u', 'D', 'L', 'mu', 'eps', 'k_other'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    document.querySelectorAll('#fittings input').forEach(el => { el.value = ''; });
    const sel = $('eps_preset'); if (sel) sel.value = '';
    clearError();
    clearResult();
  }

  function applyEpsPreset(key) {
    if (!key) return;
    const v = ROUGHNESS_PRESETS[key];
    if (v == null) return;
    $('eps_unit').value = 'mm';
    $('eps').value = (v * 1000).toString();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    const sel = $('eps_preset');
    if (sel) {
      // 共有リンクなどで粗さの値が入っているときは、プリセットで上書きしない（値が違えば選択を外す）
      sel.addEventListener('change', (e) => {
        if (e.isTrusted || $('eps').value.trim() === '') { applyEpsPreset(sel.value); return; }
        const p = ROUGHNESS_PRESETS[sel.value];
        const cur = readSI('eps').value;
        if (p == null || !(Math.abs(cur - p) <= p * 1e-9)) sel.value = '';
      });
      // 粗さを手で入力したら、プリセットの選択を外す
      $('eps').addEventListener('input', (e) => { if (e.isTrusted) sel.value = ''; });
    }
  });
})();
