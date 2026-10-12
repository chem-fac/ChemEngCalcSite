(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // ITS-90 polynomials (positive range only)
  // T -> E (mV)
  const FWD = {
    K: {
      range: [0, 1372],
      c: [-0.176004136860e-1, 0.389212049750e-1, 0.185587700320e-4, -0.994575928740e-7, 0.318409457190e-9, -0.560728448890e-12, 0.560750590590e-15, -0.320207200030e-18, 0.971511471520e-22, -0.121047212750e-25],
      exp: { a0: 0.118597600000, a1: -0.118343200000e-3, a2: 0.126968600000e3 },
    },
    J: {
      range: [0, 760],
      c: [0, 0.503811878150e-1, 0.304758369300e-4, -0.856810657200e-7, 0.132281952950e-9, -0.170529583370e-12, 0.209480906970e-15, -0.125383953360e-18, 0.156317256970e-22],
    },
    T: {
      range: [0, 400],
      c: [0, 0.387481063640e-1, 0.332922278800e-4, 0.206182434040e-6, -0.218822568460e-8, 0.109968809280e-10, -0.308157587720e-13, 0.454791352900e-16, -0.275129016730e-19],
    },
  };

  // E (mV) -> T (°C), per type, by E range
  const INV = {
    K: [
      { range: [0, 20.644], c: [0, 25.08355, 0.07860106, -0.2503131, 0.08315270, -0.01228034, 0.0009804036, -4.413030e-5, 1.057734e-6, -1.052755e-8] },
      { range: [20.644, 54.886], c: [-131.8058, 48.30222, -1.646031, 0.05464731, -9.650715e-4, 8.802193e-6, -3.110810e-8] },
    ],
    J: [
      { range: [0, 42.919], c: [0, 19.78425, -0.2001204, 0.01036969, -2.549687e-4, 3.585153e-6, -5.344285e-8, 5.099890e-10] },
    ],
    T: [
      { range: [0, 20.872], c: [0, 2.592800e1, -7.602961e-1, 4.637791e-2, -2.165394e-3, 6.048144e-5, -7.293422e-7] },
    ],
  };

  function poly(c, x) { let s = 0; for (let i = c.length - 1; i >= 0; i--) s = s * x + c[i]; return s; }

  function E_of_T(type, T) {
    const f = FWD[type];
    if (T < f.range[0] || T > f.range[1]) return null;
    let E = poly(f.c, T);
    if (f.exp) E += f.exp.a0 * Math.exp(f.exp.a1 * Math.pow(T - f.exp.a2, 2));
    return E;
  }

  function T_of_E(type, E) {
    const ranges = INV[type];
    for (const r of ranges) {
      if (E >= r.range[0] && E <= r.range[1] + 1e-9) {
        return poly(r.c, E);
      }
    }
    return null;
  }

  function fmtNum(v, sig = 6) { if (!isFinite(v)) return '-'; const a = Math.abs(v); if (a === 0) return '0'; if (a >= 1e5 || a < 1e-4) return v.toExponential(sig - 1); return Number(v.toPrecision(sig)).toString(); }
  function val(id) { const el = $(id); return (el && el.value !== '') ? parseFloat(el.value) : NaN; }
  const setError = (m) => { const e = $('error'); e.textContent = m; e.style.display = 'block'; const ra = $('result-area'); if (ra) ra.innerHTML = '<div class="placeholder">入力値を見直して再度計算してください</div>'; };
  const clearError = () => { const e = $('error'); e.textContent = ''; e.style.display = 'none'; };

  let mode = 't2e';

  function sensitivityAt(type, T) {
    const dE = E_of_T(type, T + 0.5);
    const dE0 = E_of_T(type, T - 0.5);
    if (dE == null || dE0 == null) return null;
    return (dE - dE0) * 1000;  // μV/°C
  }

  function calc() {
    clearError();
    const type = $('type').value;
    const Tcj = val('Tcj');
    if (!isFinite(Tcj)) return setError('冷接点温度を入力してください（標準は 0 °C）。');
    if (Tcj < 0) return setError('本ツールは冷接点 ≧ 0 °C のみ対応しています。');
    const f = FWD[type];
    if (Tcj > f.range[1]) return setError(`冷接点温度が型式の範囲（${f.range[0]}〜${f.range[1]} °C）を超えています。`);
    const E_cj = E_of_T(type, Tcj);

    if (mode === 't2e') {
      const T = val('T');
      if (!isFinite(T)) return setError('測温接点温度を入力してください。');
      if (T < f.range[0] || T > f.range[1]) return setError(`温度は ${f.range[0]}〜${f.range[1]} °C の範囲で入力してください（${type} 型）。`);
      const E_T = E_of_T(type, T);
      const E_meas = E_T - E_cj;
      const sens = sensitivityAt(type, T);
      $('result-area').innerHTML = `
        <div class="result-target">起電力（${type} 型）</div>
        <div class="result-value-big">${fmtNum(E_meas, 5)} <span class="unit">mV</span></div>
        <table class="unit-table"><tbody>
          <tr><td>測定起電力（冷接点 ${Tcj} °C）</td><td class="num">${fmtNum(E_meas, 5)} mV</td></tr>
          <tr><td>絶対起電力 E(T)（冷接点 0 °C）</td><td class="num">${fmtNum(E_T, 5)} mV</td></tr>
          <tr><td>冷接点側起電力 E(T_cj)</td><td class="num">${fmtNum(E_cj, 5)} mV</td></tr>
          <tr><td>測温接点温度 T</td><td class="num">${fmtNum(T)} °C  (${fmtNum(T + 273.15)} K)</td></tr>
          <tr><td>感度（T 近傍）</td><td class="num">${sens ? fmtNum(sens) + ' μV/°C' : '-'}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div class="result-note">※ ITS-90 NIST 多項式に基づく値。実機ではトレーサビリティ校正済み熱電対と指示計の特性を確認してください。</div>
        </div>
      `;
    } else {
      const E_meas = val('E');
      if (!isFinite(E_meas)) return setError('起電力を入力してください。');
      const E_T = E_meas + E_cj;
      const T = T_of_E(type, E_T);
      if (T == null) return setError(`起電力（補正後 ${fmtNum(E_T)} mV）が ${type} 型の有効範囲外です。`);
      const sens = sensitivityAt(type, T);
      $('result-area').innerHTML = `
        <div class="result-target">温度（${type} 型）</div>
        <div class="result-value-big">${fmtNum(T)} <span class="unit">°C</span></div>
        <table class="unit-table"><tbody>
          <tr><td>測温接点温度 T</td><td class="num">${fmtNum(T)} °C  (${fmtNum(T + 273.15)} K)</td></tr>
          <tr><td>絶対起電力 E(T)（冷接点 0 °C 基準）</td><td class="num">${fmtNum(E_T, 5)} mV</td></tr>
          <tr><td>測定起電力</td><td class="num">${fmtNum(E_meas, 5)} mV</td></tr>
          <tr><td>冷接点側起電力 E(T_cj)（補正分）</td><td class="num">${fmtNum(E_cj, 5)} mV</td></tr>
          <tr><td>感度（T 近傍）</td><td class="num">${sens ? fmtNum(sens) + ' μV/°C' : '-'}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div class="result-note">※ 冷接点が 0 °C でない場合、E_meas に E(T_cj) を加えて絶対起電力に変換してから ITS-90 逆多項式で T を求めています。</div>
        </div>
      `;
    }
  }

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === next));
    document.querySelectorAll('[data-show-when]').forEach(row => { row.hidden = !row.dataset.showWhen.split(/\s+/).includes(next); });
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「換算する」を押してください</div>';
  }

  function reset() {
    ['T', 'E'].forEach(id => { if ($(id)) $(id).value = ''; });
    if ($('Tcj')) $('Tcj').value = '0';
    clearError();
    $('result-area').innerHTML = '<div class="placeholder">入力値を入れて「換算する」を押してください</div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('calc-btn').addEventListener('click', calc);
    $('reset-btn').addEventListener('click', reset);
    setMode(mode);
  });
})();
