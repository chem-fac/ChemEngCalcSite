(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const TO_SI = {
    d: { m: 1, cm: 0.01, mm: 0.001 },
    D: { m: 1, cm: 0.01, mm: 0.001 },
    H: { m: 1, cm: 0.01, mm: 0.001 },
    n: { rps: 1, rpm: 1/60 },
    rho: { kgm3: 1, gcm3: 1000 },
    mu:  { Pas: 1, mPas: 0.001, cP: 0.001 },
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
    const mode = document.querySelector('.mode-tab.active').dataset.mode;
    const n=getSI('n'), d=getSI('d'), D=getSI('D');
    const Np=parseFloat($('Np').value);
    if(![n,d,D,Np].every(v=>isFinite(v)&&v>0))
      return setError('回転数・翼径・槽径・動力数 Np はすべて正の数値で入力してください。');
    if(D <= d) return setError('槽径 D は翼径 d より大きい必要があります。');

    let theta, formula, extra='';
    if(mode === 'turb') {
      const Nqd=parseFloat($('Nqd').value);
      if(!isFinite(Nqd)||Nqd<=0) return setError('吐出流量数 Nqd を正の値で入力してください。');
      const dD = d/D;
      // 1/(n·θM) = 0.092 { (d/D)³·Nqd + 0.21·(d/D)·(Np/Nqd)^0.5 } { 1 - exp(-13·(d/D)²) }
      const inv = 0.092 * (Math.pow(dD,3) * Nqd + 0.21 * dD * Math.pow(Np/Nqd, 0.5)) * (1 - Math.exp(-13 * dD * dD));
      if(!isFinite(inv)||inv<=0) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      theta = 1 / (n * inv);
      formula = '乱流・基本式：1/(n·θ<sub>M</sub>) = 0.092·{ (d/D)³·N<sub>qd</sub> + 0.21·(d/D)·(N<sub>p</sub>/N<sub>qd</sub>)<sup>0.5</sup> }·{ 1 - e<sup>-13(d/D)²</sup> }';
      extra = `<div>無次元混合時間 <span class="sym">n·θ<sub>M</sub></span> = ${fmtNum(n*theta)}</div>`;
    } else if(mode === 'turbH') {
      const H=getSI('H');
      if(!isFinite(H)||H<=0) return setError('液深さ H を正の値で入力してください。');
      // n·θM = 6.7·(D/d)²·(Np/Nqd)^(-0.25)·(H/D)^0.5
      const Nqd=parseFloat($('Nqd').value);
      if(!isFinite(Nqd)||Nqd<=0) return setError('吐出流量数 Nqd を正の値で入力してください。');
      const ntheta = 6.7 * Math.pow(D/d, 2) * Math.pow(Np/Nqd, -0.25) * Math.pow(H/D, 0.5);
      if(!isFinite(ntheta)||ntheta<=0) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      theta = ntheta / n;
      formula = '液深さを加味した式：n·θ<sub>M</sub> = 6.7·(D/d)²·(N<sub>p</sub>/N<sub>qd</sub>)<sup>-0.25</sup>·(H/D)<sup>0.5</sup>';
      extra = `<div>無次元混合時間 <span class="sym">n·θ<sub>M</sub></span> = ${fmtNum(ntheta)}</div>`;
    } else { // laminar
      const H=getSI('H'), rho=getSI('rho'), mu=getSI('mu');
      if(![H,rho,mu].every(v=>isFinite(v)&&v>0))
        return setError('液深さ H・密度・粘度を正の数値で入力してください。');
      const Re = (rho * n * d * d) / mu;
      // 1/(n·θM) = 9.8e-5 · (d³/(D²·H))·Np·Re
      const inv = 9.8e-5 * (Math.pow(d,3) / (D*D*H)) * Np * Re;
      if(!isFinite(inv)||inv<=0) return setError('入力値の組み合わせで計算結果が数値範囲を超えました。');
      theta = 1 / (n * inv);
      formula = '層流域の式：1/(n·θ<sub>M</sub>) = 9.8×10<sup>-5</sup>·(d³/(D²H))·N<sub>p</sub>·Re';
      extra = `<div>撹拌レイノルズ数 <span class="sym">Re</span> = ${fmtNum(Re)}</div><div>無次元混合時間 <span class="sym">n·θ<sub>M</sub></span> = ${fmtNum(n*theta)}</div>`;
    }
    if(!isFinite(theta)||theta<=0)
      return setError('入力値の組み合わせで計算結果が数値範囲を超えました。各値の桁数を見直してください。');

    $('result-area').innerHTML = `
      <div class="result-target">混合時間 <span class="sym">θ<sub>M</sub></span></div>
      <div class="result-value-big">${fmtNum(theta)} <span class="unit">s</span></div>
      <div class="result-detail-label">他単位での値</div>
      <table class="unit-table"><tbody>
        <tr><td>秒</td><td class="num">${fmtNum(theta)}</td></tr>
        <tr><td>分</td><td class="num">${fmtNum(theta/60)}</td></tr>
        <tr><td>時間</td><td class="num">${fmtNum(theta/3600)}</td></tr>
      </tbody></table>
      <div class="result-meta">
        <div>使用した式：${formula}</div>
        ${extra}
        <div class="result-note">※ 係数 0.092 は混合完了の判定条件、投入位置、バッフル条件、翼位置に依存する実験相関の値です。実機適用前に翼ごとの実測データで確認してください。</div>
      </div>
    `;
  }

  function applyMode(mode){
    document.querySelectorAll('.mode-tab').forEach(t=>t.classList.toggle('active', t.dataset.mode===mode));
    document.querySelectorAll('.input-row[data-show-when]').forEach(row=>{
      const modes = row.dataset.showWhen.split(/\s+/);
      row.hidden = !modes.includes(mode);
    });
    clearError();
  }
  function reset(){['n','d','D','H','Np','Nqd','rho','mu'].forEach(f=>{const el=$(f);if(el)el.value='';});clearError();clearResult();}
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.mode-tab').forEach(t=>{t.addEventListener('click',()=>applyMode(t.dataset.mode));});
    $('calc-btn').addEventListener('click',calculate);
    $('reset-btn').addEventListener('click',reset);
    applyMode('turb');
  });
})();
