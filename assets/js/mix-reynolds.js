(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    rho: { kgm3: 1, gcm3: 1000 },
    mu:  { Pas: 1, mPas: 0.001, cP: 0.001 },
    d:   { m: 1, cm: 0.01, mm: 0.001 },
    n:   { rps: 1, rpm: 1/60 },
  };
  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig=4){if(!isFinite(v))return '—';const a=Math.abs(v);if(a===0)return '0';if(a>=1e5||a<1e-3){const e=v.toExponential(sig-1);const m=e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);if(m)return `${m[1]}×10${toSup(m[2])}`;return e;}return Number(v.toPrecision(sig)).toString();}
  function fmtRe(R){if(!isFinite(R))return '—';if(R>=1e5){const e=R.toExponential(2);const m=e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);if(m)return `${m[1]}×10${toSup(m[2])}`;}if(R>=1000)return Math.round(R).toLocaleString('en-US');return R.toFixed(1);}
  function getSI(f){const el=$(f);if(!el||el.value==='')return NaN;const v=parseFloat(el.value);const u=$(f+'_unit').value;return isFinite(v)?v*TO_SI[f][u]:NaN;}
  const setError = m => { const e=$('error'); e.textContent=m; e.style.display='block'; };
  const clearError = () => { const e=$('error'); e.textContent=''; e.style.display='none'; };
  const clearResult = () => { $('result-area').innerHTML='<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  function regimeOf(Re){
    if(Re<=50) return {key:'laminar', label:'層流', desc:'粘性力が支配的。バッフルなしでも流れは安定するが、混合性能は低い。'};
    if(Re<1000) return {key:'transition', label:'遷移流', desc:'層流と乱流の中間。槽径と翼径の比 D/d によって挙動が変わる領域。'};
    return {key:'turbulent', label:'乱流', desc:'慣性力が支配的。バッフル設置で混合性能が大きく向上する領域。'};
  }

  function calculate() {
    clearError();
    const rho=getSI('rho'), n=getSI('n'), d=getSI('d'), mu=getSI('mu');
    if(![rho,n,d,mu].every(v=>isFinite(v)&&v>0))
      return setError('密度・回転数・翼径・粘度はすべて正の数値で入力してください。');
    const Re = (rho*n*d*d)/mu;
    if(!isFinite(Re)||Re<=0)
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');
    const r = regimeOf(Re);
    $('result-area').innerHTML = `
      <div class="result-target">撹拌レイノルズ数 <span class="sym">Re</span></div>
      <div class="result-value-big">${fmtRe(Re)} <span class="unit">［-］</span></div>
      <div class="result-detail-label">流れの状態</div>
      <table class="unit-table"><tbody>
        <tr><td>判定</td><td class="num"><span class="regime-badge ${r.key}">${r.label}</span></td></tr>
        <tr><td>説明</td><td class="num" style="text-align:left;font-weight:500;">${r.desc}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>判定基準：Re ≤ 50 層流／50 &lt; Re &lt; 1,000 遷移流／Re ≥ 1,000 乱流</div>
        <div>入力 <span class="sym">ρ</span> = ${fmtNum(rho)} kg/m³, <span class="sym">n</span> = ${fmtNum(n)} 1/s (= ${fmtNum(n*60)} rpm), <span class="sym">d</span> = ${fmtNum(d*1000)} mm, <span class="sym">μ</span> = ${fmtNum(mu*1000)} mPa·s</div>
      </div>
    `;
  }
  function reset(){['rho','n','d','mu'].forEach(f=>{const el=$(f);if(el)el.value='';});clearError();clearResult();}
  document.addEventListener('DOMContentLoaded',()=>{$('calc-btn').addEventListener('click',calculate);$('reset-btn').addEventListener('click',reset);});
})();
