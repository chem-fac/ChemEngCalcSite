(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);

  // 圧力 SI（Pa）への換算
  const P_TO_PA = { Pa: 1, kPa: 1000, MPa: 1e6, bar: 1e5, atm: 101325, mmHg: 133.322, Torr: 133.322 };
  // 温度 → K への換算
  function T_to_K(v, unit){ return unit === 'C' ? v + 273.15 : v; }
  function T_from_K(K, unit){ return unit === 'C' ? K - 273.15 : K; }

  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig=4){if(!isFinite(v))return '—';const a=Math.abs(v);if(a===0)return '0';if(a>=1e5||a<1e-3){const e=v.toExponential(sig-1);const m=e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);if(m)return `${m[1]}×10${toSup(m[2])}`;return e;}return Number(v.toPrecision(sig)).toString();}

  let currentMode = 'PfromT';

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
  function updateTemperaturePlaceholder() {
    const T = $('T');
    if (!T) return;
    T.placeholder = $('Tunit').value === 'K' ? '例：298' : '例：25';
  }

  function calculate() {
    clearError();
    const A = parseFloat($('A').value);
    const B = parseFloat($('B').value);
    const C = parseFloat($('C').value);
    const Punit = $('Punit').value;
    const Tunit = $('Tunit').value;
    const base = $('base').value;
    if(![A,B,C].every(v => isFinite(v)))
      return setError('係数 A・B・C を数値で入力してください。');

    if(currentMode === 'PfromT'){
      const T = parseFloat($('T').value);
      if(!isFinite(T)) return setError('温度 T を数値で入力してください。');
      // x = A - B/(T+C)（T は係数定義側の単位そのまま）
      const denom = T + C;
      if(denom === 0) return setError('T + C = 0 になり計算できません。係数または温度を見直してください。');
      const x = A - B / denom;
      const P = base === 'log10' ? Math.pow(10, x) : Math.exp(x);
      if(!isFinite(P) || P <= 0) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      const P_Pa = P * P_TO_PA[Punit];
      $('result-area').innerHTML = `
        <div class="result-target">蒸気圧 <span class="sym">P</span>（${Punit} 単位）</div>
        <div class="result-value-big">${fmtNum(P)} <span class="unit">${Punit}</span></div>
        <div class="result-detail-label">他単位での値</div>
        <table class="unit-table"><tbody>
          <tr><td>Pa</td><td class="num">${fmtNum(P_Pa)}</td></tr>
          <tr><td>kPa</td><td class="num">${fmtNum(P_Pa/1000)}</td></tr>
          <tr><td>MPa</td><td class="num">${fmtNum(P_Pa/1e6)}</td></tr>
          <tr><td>bar</td><td class="num">${fmtNum(P_Pa/1e5)}</td></tr>
          <tr><td>atm</td><td class="num">${fmtNum(P_Pa/101325)}</td></tr>
          <tr><td>mmHg (Torr)</td><td class="num">${fmtNum(P_Pa/133.322)}</td></tr>
          <tr><td>kgf/cm²</td><td class="num">${fmtNum(P_Pa/98066.5)}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div>計算式：${base === 'log10' ? 'log<sub>10</sub>' : 'ln'}(<span class="sym">P</span>) = ${fmtNum(A)} − ${fmtNum(B)}/(${fmtNum(T)} + ${fmtNum(C)}) = ${fmtNum(x)}</div>
          <div>入力 <span class="sym">T</span> = ${fmtNum(T)} ${Tunit === 'C' ? '°C' : 'K'}, 係数定義の P 単位 = ${Punit}, 対数底 = ${base === 'log10' ? '10' : 'e'}</div>
        </div>
      `;
    } else {
      // TfromP: T = B/(A - x) - C, where x = log(P)
      const P = parseFloat($('P').value);
      if(!isFinite(P) || P <= 0) return setError('蒸気圧 P を正の数値で入力してください。');
      const x = base === 'log10' ? Math.log10(P) : Math.log(P);
      const denom = A - x;
      if(denom === 0) return setError('A − log(P) = 0 となり T を求められません。');
      const T = B / denom - C;
      if(!isFinite(T)) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      const Tcoef_unit_label = Tunit === 'C' ? '°C' : 'K';
      const T_C = Tunit === 'C' ? T : T - 273.15;
      const T_K = Tunit === 'K' ? T : T + 273.15;
      $('result-area').innerHTML = `
        <div class="result-target">沸点 <span class="sym">T<sub>sat</sub></span>（${Tcoef_unit_label}）</div>
        <div class="result-value-big">${fmtNum(T)} <span class="unit">${Tcoef_unit_label}</span></div>
        <div class="result-detail-label">他単位での値</div>
        <table class="unit-table"><tbody>
          <tr><td>°C</td><td class="num">${fmtNum(T_C)}</td></tr>
          <tr><td>K</td><td class="num">${fmtNum(T_K)}</td></tr>
          <tr><td>°F</td><td class="num">${fmtNum(T_C * 9/5 + 32)}</td></tr>
        </tbody></table>
        <div class="result-meta">
          <div>計算式：<span class="sym">T</span> = ${fmtNum(B)}/(${fmtNum(A)} − ${base === 'log10' ? 'log<sub>10</sub>' : 'ln'}(${fmtNum(P)})) − ${fmtNum(C)} = ${fmtNum(T)} ${Tcoef_unit_label}</div>
          <div>入力 <span class="sym">P</span> = ${fmtNum(P)} ${Punit}, 係数定義の T 単位 = ${Tcoef_unit_label}, 対数底 = ${base === 'log10' ? '10' : 'e'}</div>
        </div>
      `;
    }
  }

  function reset(){
    ['A','B','C','T','P'].forEach(f => { const el=$(f); if(el) el.value=''; });
    clearError(); clearResult();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mode-tab').forEach(t => t.addEventListener('click', () => applyMode(t.dataset.mode)));
    $('calc-btn').addEventListener('click', calculate);
    $('reset-btn').addEventListener('click', reset);
    $('Tunit').addEventListener('change', updateTemperaturePlaceholder);
    updateTemperaturePlaceholder();
    applyMode('PfromT');
  });
})();
