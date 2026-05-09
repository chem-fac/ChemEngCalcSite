(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    rho: { kgm3: 1, gcm3: 1000 },
    d: { m: 1, cm: 0.01, mm: 0.001 },
    n: { rps: 1, rpm: 1 / 60 },
    P: { W: 1, kW: 1000, HP: 745.7 },
    T: { Nm: 1, kgfm: 9.80665 },
  };
  const MODE_LABEL = {
    fromNp: '動力数から変換',
    fromPower: '所要動力から変換',
    fromTorque: 'トルクから変換',
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
    const sel = $(field + '_unit');
    const unit = sel ? sel.value : null;
    return isFinite(v) ? v * (TO_SI[field] && unit ? TO_SI[field][unit] : 1) : NaN;
  }
  function positive(v) { return isFinite(v) && v > 0; }
  const setError = m => { const e = $('error'); e.textContent = m; e.style.display = 'block'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };
  const clearResult = () => { $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  let mode = 'fromNp';

  function setMode(nextMode) {
    mode = nextMode;
    document.querySelectorAll('.mode-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(mode);
    });
    clearError();
    clearResult();
  }

  function calculate() {
    clearError();
    const rho = getSI('rho');
    const n = getSI('n');
    const d = getSI('d');
    if (![rho, n, d].every(positive)) {
      return setError('密度・回転数・翼径はすべて正の数値で入力してください。');
    }

    let Np;
    let P;
    let T;
    if (mode === 'fromNp') {
      Np = parseFloat($('Np').value);
      if (!positive(Np)) return setError('動力数 Np を正の数値で入力してください。');
      P = Np * rho * Math.pow(n, 3) * Math.pow(d, 5);
      T = P / (2 * Math.PI * n);
    } else if (mode === 'fromPower') {
      P = getSI('P');
      if (!positive(P)) return setError('所要動力 P を正の数値で入力してください。');
      Np = P / (rho * Math.pow(n, 3) * Math.pow(d, 5));
      T = P / (2 * Math.PI * n);
    } else {
      T = getSI('T');
      if (!positive(T)) return setError('トルク T を正の数値で入力してください。');
      P = 2 * Math.PI * n * T;
      Np = P / (rho * Math.pow(n, 3) * Math.pow(d, 5));
    }

    if (![Np, P, T].every(positive)) {
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    }

    const primaryLabel = mode === 'fromPower' ? '動力数 Np' : '撹拌所要動力 P';
    const primaryValue = mode === 'fromPower' ? fmtNum(Np) : fmtNum(P);
    const primaryUnit = mode === 'fromPower' ? '［-］' : 'W';
    $('result-area').innerHTML = `
      <div class="result-target">${primaryLabel}</div>
      <div class="result-value-big">${primaryValue} <span class="unit">${primaryUnit}</span></div>
      <div class="result-detail-label">変換結果</div>
      <table class="unit-table"><tbody>
        <tr><td>撹拌所要動力 <span class="sym">P</span></td><td class="num">${fmtNum(P)} W</td></tr>
        <tr><td>撹拌所要動力 <span class="sym">P</span></td><td class="num">${fmtNum(P / 1000)} kW</td></tr>
        <tr><td>撹拌所要動力 <span class="sym">P</span></td><td class="num">${fmtNum(P / 745.7)} HP</td></tr>
        <tr><td>動力数 <span class="sym">N<sub>p</sub></span></td><td class="num">${fmtNum(Np)} ［-］</td></tr>
        <tr><td>トルク <span class="sym">T</span></td><td class="num">${fmtNum(T)} N·m</td></tr>
        <tr><td>トルク <span class="sym">T</span></td><td class="num">${fmtNum(T / 9.80665)} kgf·m</td></tr>
      </tbody></table>
      <div class="result-detail-label">入力条件</div>
      <table class="unit-table"><tbody>
        <tr><td>変換モード</td><td class="num">${MODE_LABEL[mode]}</td></tr>
        <tr><td>密度 <span class="sym">ρ</span></td><td class="num">${fmtNum(rho)} kg/m³</td></tr>
        <tr><td>回転数 <span class="sym">n</span></td><td class="num">${fmtNum(n)} 1/s (= ${fmtNum(n * 60)} rpm)</td></tr>
        <tr><td>翼径 <span class="sym">d</span></td><td class="num">${fmtNum(d * 1000)} mm</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>計算式：<span class="sym">P</span> = <span class="sym">N<sub>p</sub></span>·<span class="sym">ρ</span>·<span class="sym">n</span>³·<span class="sym">d</span>⁵</div>
        <div>　　　　　<span class="sym">P</span> = 2π<span class="sym">n</span>·<span class="sym">T</span></div>
        <div class="result-note">※ 動力数 N<sub>p</sub> は撹拌レイノルズ数、翼形状、バッフル条件で変わります。実測値・カタログ値、または相関式から求めた値を使用してください。</div>
      </div>
    `;
  }

  function reset() {
    ['rho','n','d','Np','P','T'].forEach(f => { const el = $(f); if (el) el.value = ''; });
    clearError();
    clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
