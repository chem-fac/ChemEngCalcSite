(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const R = 8.314462618; // J/(mol·K) ガス定数

  // Ea 単位 → J/mol への換算
  const EA_TO_J = { Jmol: 1, kJmol: 1000, calmol: 4.184, kcalmol: 4184 };
  function T_to_K(v, unit){ return unit === 'C' ? v + 273.15 : v; }

  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig=4){if(!isFinite(v))return '—';const a=Math.abs(v);if(a===0)return '0';if(a>=1e5||a<1e-3){const e=v.toExponential(sig-1);const m=e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);if(m)return `${m[1]}×10${toSup(m[2])}`;return e;}return Number(v.toPrecision(sig)).toString();}

  let currentMode = 'kCalc';

  function applyMode(mode){
    currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
    document.querySelectorAll('.input-row[data-show-when]').forEach(row => {
      row.hidden = !row.dataset.showWhen.split(/\s+/).includes(mode);
    });
    clearError();
  }

  const setError = m => { const e=$('error'); e.textContent=m; e.style.display='block'; };
  const clearError = () => { const e=$('error'); e.textContent=''; e.style.display='none'; };
  const clearResult = () => { $('result-area').innerHTML='<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };
  function updateTemperaturePlaceholders() {
    const isCelsius = $('T_unit') && $('T_unit').value === 'C';
    const examples = isCelsius
      ? { T: '例：25', T1: '例：25', T2: '例：75' }
      : { T: '例：298', T1: '例：298', T2: '例：348' };
    Object.keys(examples).forEach(id => {
      const el = $(id);
      if (el) el.placeholder = examples[id];
    });
  }

  function calculate() {
    clearError();
    if(currentMode === 'kCalc'){
      const A = parseFloat($('A').value);
      const Ea_in = parseFloat($('Ea').value);
      const T_in = parseFloat($('T').value);
      const Ea_unit = $('Ea_unit').value;
      const T_unit = $('T_unit').value;
      if(!isFinite(A) || A <= 0) return setError('頻度因子 A を正の数値で入力してください。');
      if(!isFinite(Ea_in) || Ea_in < 0) return setError('活性化エネルギー Ea を非負の数値で入力してください。');
      if(!isFinite(T_in)) return setError('温度 T を数値で入力してください。');
      const Ea = Ea_in * EA_TO_J[Ea_unit];   // J/mol
      const T  = T_to_K(T_in, T_unit);        // K
      if(T <= 0) return setError('温度が絶対零度以下です。値を見直してください。');
      const k = A * Math.exp(-Ea / (R * T));
      if(!isFinite(k) || k <= 0) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      const exponent = -Ea / (R * T);
      $('result-area').innerHTML = `
        <div class="result-target">反応速度定数 <span class="sym">k</span></div>
        <div class="result-value-big">${fmtNum(k)} <span class="unit">（A と同じ単位系）</span></div>
        <div class="result-detail-label">途中値</div>
        <table class="unit-table"><tbody>
          <tr><td>絶対温度 T</td><td class="num">${fmtNum(T)} K (= ${fmtNum(T - 273.15)} °C)</td></tr>
          <tr><td>活性化エネルギー Ea</td><td class="num">${fmtNum(Ea / 1000)} kJ/mol (= ${fmtNum(Ea)} J/mol)</td></tr>
          <tr><td>Ea / (R·T)</td><td class="num">${fmtNum(Ea / (R * T))}</td></tr>
          <tr><td>exp(−Ea/RT)</td><td class="num">${fmtNum(Math.exp(exponent))}</td></tr>
          <tr><td>頻度因子 A</td><td class="num">${fmtNum(A)}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div>計算式：<span class="sym">k</span> = <span class="sym">A</span>·exp(−<span class="sym">E<sub>a</sub></span>/(<span class="sym">R</span>·<span class="sym">T</span>))</div>
          <div>R = 8.314 J/(mol·K)。k の単位は反応次数によって決まり、A の単位と一致します（1次反応なら 1/s）。</div>
        </div>
      `;
    } else {
      // EaCalc: 2点の (k1,T1) と (k2,T2) から Ea, A を求める
      const k1 = parseFloat($('k1').value);
      const k2 = parseFloat($('k2').value);
      const T1_in = parseFloat($('T1').value);
      const T2_in = parseFloat($('T2').value);
      const T_unit = $('T_unit').value;
      if(![k1,k2].every(v => isFinite(v) && v > 0)) return setError('反応速度定数 k1, k2 を正の数値で入力してください。');
      if(![T1_in,T2_in].every(v => isFinite(v))) return setError('温度 T1, T2 を数値で入力してください。');
      const T1 = T_to_K(T1_in, T_unit);
      const T2 = T_to_K(T2_in, T_unit);
      if(T1 <= 0 || T2 <= 0) return setError('温度が絶対零度以下です。値を見直してください。');
      if(T1 === T2) return setError('T1 と T2 が同じ値です。異なる温度を入力してください。');
      // Ea = R · ln(k2/k1) / (1/T1 - 1/T2)
      const Ea = R * Math.log(k2 / k1) / (1/T1 - 1/T2);
      // A = k1 · exp(Ea / (R T1))
      const A = k1 * Math.exp(Ea / (R * T1));
      if(![Ea,A].every(v => isFinite(v))) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      const Ea_kJ = Ea / 1000;
      const Ea_kcal = Ea / 4184;
      $('result-area').innerHTML = `
        <div class="result-target">活性化エネルギー <span class="sym">E<sub>a</sub></span></div>
        <div class="result-value-big">${fmtNum(Ea_kJ)} <span class="unit">kJ/mol</span></div>
        <div class="result-detail-label">他単位での値</div>
        <table class="unit-table"><tbody>
          <tr><td>kJ/mol</td><td class="num">${fmtNum(Ea_kJ)}</td></tr>
          <tr><td>J/mol</td><td class="num">${fmtNum(Ea)}</td></tr>
          <tr><td>kcal/mol</td><td class="num">${fmtNum(Ea_kcal)}</td></tr>
          <tr><td>cal/mol</td><td class="num">${fmtNum(Ea / 4.184)}</td></tr>
        </tbody></table>
        <div class="result-detail-label">頻度因子 A（k1, T1 から逆算）</div>
        <table class="unit-table"><tbody>
          <tr><td>A</td><td class="num">${fmtNum(A)}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div>計算式：<span class="sym">E<sub>a</sub></span> = R·ln(k<sub>2</sub>/k<sub>1</sub>) / (1/T<sub>1</sub> − 1/T<sub>2</sub>)、 <span class="sym">A</span> = k<sub>1</sub>·exp(E<sub>a</sub>/(R·T<sub>1</sub>))</div>
          <div>入力 T<sub>1</sub> = ${fmtNum(T1)} K, T<sub>2</sub> = ${fmtNum(T2)} K, k<sub>1</sub> = ${fmtNum(k1)}, k<sub>2</sub> = ${fmtNum(k2)}</div>
          <div class="result-note">※ 2点法は誤差が出やすい簡易計算です。重要案件では複数温度のアレニウスプロット（ln k vs 1/T の直線フィット）で評価してください。</div>
        </div>
      `;
    }
  }

  function reset(){
    ['A','Ea','T','k1','k2','T1','T2'].forEach(f => { const el=$(f); if(el) el.value=''; });
    clearError(); clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.addEventListener('click', () => applyMode(t.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    $('T_unit').addEventListener('change', updateTemperaturePlaceholders);
    updateTemperaturePlaceholders();
    applyMode('kCalc');
  });
})();
