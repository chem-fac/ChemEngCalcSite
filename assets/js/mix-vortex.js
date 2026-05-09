(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const G = 9.80665;
  const TO_SI = {
    d: { m: 1, cm: 0.01, mm: 0.001 },
    D: { m: 1, cm: 0.01, mm: 0.001 },
    rc:{ m: 1, cm: 0.01, mm: 0.001 },
    b: { m: 1, cm: 0.01, mm: 0.001 },
    n: { rps: 1, rpm: 1/60 },
  };
  const SUP_MAP = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'' };
  const toSup = s => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
  function fmtNum(v, sig=4){if(!isFinite(v))return '—';const a=Math.abs(v);if(a===0)return '0';if(a>=1e5||a<1e-3){const e=v.toExponential(sig-1);const m=e.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/);if(m)return `${m[1]}×10${toSup(m[2])}`;return e;}return Number(v.toPrecision(sig)).toString();}
  function getSI(f){const el=$(f);if(!el||el.value==='')return NaN;const v=parseFloat(el.value);const sel=$(f+'_unit');const u=sel?sel.value:'dim';return isFinite(v)?v*(TO_SI[f]?TO_SI[f][u]:1):NaN;}
  const setError = m => { const e=$('error'); e.textContent=m; e.style.display='block'; };
  const clearError = () => { const e=$('error'); e.textContent=''; e.style.display='none'; };
  const clearResult = () => { $('result-area').innerHTML='<div class="placeholder">入力値を入れて「計算する」を押してください</div>'; };

  function calculate() {
    clearError();
    const n=getSI('n'), d=getSI('d'), D=getSI('D');
    let rc=getSI('rc');
    const rcDefaulted = $('rc').value === '';
    if(![n,d,D].every(v=>isFinite(v)&&v>0))
      return setError('回転数・翼径・槽径は正の数値で入力してください。');
    if(D <= d) return setError('槽径 D は翼径 d より大きい必要があります。');
    let rcNote = '';
    if(rcDefaulted) {
      const b = getSI('b');
      const np = parseFloat($('np').value);
      const Re = parseFloat($('Re').value);
      if(![b,np,Re].every(v=>isFinite(v)&&v>0))
        return setError('固体的回転半径 rc を直接入力しない場合は、羽根幅 b・羽根枚数 np・撹拌レイノルズ数 Re を入力してください。');
      const rcRatio = 1.23 * (0.57 + 0.35 * (d/D)) * Math.pow(b/D, 0.036) * (Math.pow(np, 0.116) * Re / (1000 + 1.43 * Re));
      rc = 0.5 * d * rcRatio;
      rcNote = `（b = ${fmtNum(b*1000)} mm, n<sub>p</sub> = ${fmtNum(np)}, Re = ${fmtNum(Re)} から推算）`;
    } else {
      rcNote = '（直接入力値）';
    }
    if(!isFinite(rc)||rc<=0)
      return setError('固体的回転半径 rc が計算できません。入力値を見直してください。');
    if(2*rc >= D) return setError('固体的回転半径 rc は槽半径 D/2 未満で入力してください。');

    const Fr = (n*n*d) / G;
    const r2D = (2*rc) / D;
    const r2d = (2*rc) / d;
    const ln = Math.log(D / (2*rc));

    // 中心の液面降下：ΔH1 = π² d Fr (2rc/d)² [ 1 - (2rc/D)² { ln(D/(2rc)) + 3/4 } ]
    const dH1 = Math.PI*Math.PI * d * Fr * r2d*r2d * (1 - r2D*r2D * (ln + 3/4));
    // 槽壁の液面上昇：ΔH2 = π² d Fr (2rc/d)² (d/D)² { ln(D/(2rc)) + 1/4 }
    const dH2 = Math.PI*Math.PI * d * Fr * r2d*r2d * Math.pow(d/D, 2) * (ln + 1/4);

    if(![dH1,dH2].every(v=>isFinite(v)))
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');

    $('result-area').innerHTML = `
      <div class="result-target">中心部の液面低下量 <span class="sym">ΔH<sub>1</sub></span></div>
      <div class="result-value-big">${fmtNum(dH1*1000)} <span class="unit">mm</span></div>
      <div class="result-detail-label">他の値</div>
      <table class="unit-table"><tbody>
        <tr><td>中心部の低下 ΔH<sub>1</sub></td><td class="num">${fmtNum(dH1*1000)} mm</td></tr>
        <tr><td>槽壁部の上昇 ΔH<sub>2</sub></td><td class="num">${fmtNum(dH2*1000)} mm</td></tr>
        <tr><td>合計の落差 ΔH<sub>1</sub>+ΔH<sub>2</sub></td><td class="num">${fmtNum((dH1+dH2)*1000)} mm</td></tr>
        <tr><td>フルード数 <span class="sym">Fr</span> = n²d/g</td><td class="num">${fmtNum(Fr)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>計算式：<span class="sym">ΔH<sub>1</sub></span> = π²·<span class="sym">d</span>·Fr·(2<span class="sym">r<sub>c</sub></span>/<span class="sym">d</span>)²·[1 − (2<span class="sym">r<sub>c</sub></span>/<span class="sym">D</span>)²{ln(<span class="sym">D</span>/(2<span class="sym">r<sub>c</sub></span>)) + 3/4}]</div>
        <div>　　　　　<span class="sym">ΔH<sub>2</sub></span> = π²·<span class="sym">d</span>·Fr·(2<span class="sym">r<sub>c</sub></span>/<span class="sym">d</span>)²·(<span class="sym">d</span>/<span class="sym">D</span>)²·{ln(<span class="sym">D</span>/(2<span class="sym">r<sub>c</sub></span>)) + 1/4}</div>
        <div>入力 <span class="sym">n</span> = ${fmtNum(n)} 1/s (= ${fmtNum(n*60)} rpm), <span class="sym">d</span> = ${fmtNum(d*1000)} mm, <span class="sym">D</span> = ${fmtNum(D*1000)} mm, <span class="sym">r<sub>c</sub></span> = ${fmtNum(rc*1000)} mm ${rcNote}</div>
        <div class="result-note">※ この式は<strong>バッフルなしの撹拌槽</strong>での液面偏りを推算するものです。固体的回転半径 r<sub>c</sub> は流動条件に依存します。</div>
      </div>
    `;
  }
  function reset(){['n','d','D','rc','b','np','Re'].forEach(f=>{const el=$(f);if(el)el.value='';});clearError();clearResult();}
  document.addEventListener('DOMContentLoaded',()=>{$('calc-btn').addEventListener('click',calculate);$('reset-btn').addEventListener('click',reset);});
})();
