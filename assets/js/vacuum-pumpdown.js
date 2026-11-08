(function(root) {
'use strict';
function calculate({V,S,p0,p1,q=0}) {
 if (![V,S,p0,p1,q].every(Number.isFinite)) throw new RangeError('すべての欄に有限の数値を入力してください。');
 if (![V,S,p0,p1].every(x=>x>0)) throw new RangeError('容積・排気速度・絶対圧は0より大きい値を入力してください。');
 if(q<0)throw new RangeError('総ガス負荷は0以上にしてください。');
 if(p0<p1)throw new RangeError('初期圧力を目標圧力以上にしてください。');
 if(p1<=1)throw new RangeError('この近似の目標圧力は1 PaAより高い範囲です。');
 const floor=q/S;
 if(!Number.isFinite(floor))throw new RangeError('計算範囲を超えました。入力値の桁を確認してください。');
 if(p1===floor)throw new RangeError('目標圧力がq/Sと等しいため、漸近しても有限時間では到達しません。');
 if(p1<floor)throw new RangeError('目標圧力がq/Sより低いため、この排気モデルでは到達できません。');
 const t=p0===p1?0:V/S*Math.log1p((p0-p1)/(p1-floor));
 if(!Number.isFinite(t)||(p0>p1&&t<=0)||(q>0&&floor===0))throw new RangeError('計算結果が数値範囲を超えました。入力値の桁を確認してください。');
 return {t,floor};
}
function pressure({V,S,p0,q=0},t) {
 if(![V,S,p0,q,t].every(Number.isFinite)||V<=0||S<=0||p0<=0||q<0||t<0)throw new RangeError('容積・排気速度・初期圧力は正、ガス負荷・時間は0以上の有限値にしてください。');
 const floor=q/S,decay=S*(t/V),p=t===0?p0:p0*Math.exp(-decay)+floor*(-Math.expm1(-decay));
 if(!Number.isFinite(p))throw new RangeError('圧力が数値範囲を超えました。');return p;
}
const factors={volume:{m3:1,L:0.001},speed:{m3s:1,m3h:1/3600,Ls:0.001},start:{Pa:1,kPa:1000},target:{Pa:1,kPa:1000}};
function toSI(a) {
 const out={};const keys={volume:'V',speed:'S',start:'p0',target:'p1'};
 for(const key of Object.keys(keys)) {const f=factors[key][a[key+'_unit']];if(f===undefined||typeof a[key]!=='number')throw new RangeError('単位と入力値を確認してください。');out[keys[key]]=a[key]*f;}
 out.q=a.load;return out;
}
const api={calculate,pressure,toSI};root.VacuumPumpdown=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(typeof document==='undefined')return;
const ids=['volume','speed','start','target','load'];const units=['volume','speed','start','target'];const area=document.getElementById('result-area'),error=document.getElementById('error');
const SUP_MAP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '' };
const toSup = (s) => String(s).split('').map(c => SUP_MAP[c] !== undefined ? SUP_MAP[c] : c).join('');
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
function clearResult() {error.style.display='none';area.innerHTML='<div class="placeholder">入力値を入れて「計算する」を押してください</div>';}
function run() {clearResult();try {const a={};ids.forEach(k=>{const v=document.getElementById(k).value.trim();a[k]=v===''?NaN:Number(v);});units.forEach(k=>{a[k+'_unit']=document.getElementById(k+'_unit').value;});const si=toSI(a),r=calculate(si),zero=calculate({...si,q:0});area.innerHTML='<div class="result-target">目標絶対圧までの排気時間 <span class="sym">t</span></div><div class="result-value-big">'+fmtNum(r.t)+' <span class="unit">s</span></div><div class="result-detail-label">計算の内訳</div><table class="unit-table"><tbody><tr><td>このモデルの漸近圧力 p<sub>∞</sub>＝q/S</td><td class="num">'+fmtNum(r.floor)+' PaA</td></tr><tr><td>排気時間（分）</td><td class="num">'+fmtNum(r.t/60)+' min</td></tr><tr><td>同じ圧力区間でq＝0の時間</td><td class="num">'+fmtNum(zero.t)+' s</td></tr></tbody></table><div class="result-meta"><div>ポンプ固有の到達圧力は含みません。一定の容器側有効排気速度と一定総ガス負荷による計算値です。</div></div>';}catch(e){error.textContent=e.message;error.style.display='block';}}
document.getElementById('calc-btn').addEventListener('click',run);
document.getElementById('reset-btn').addEventListener('click',()=>{ids.forEach(k=>document.getElementById(k).value='');clearResult();});
ids.forEach(k=>document.getElementById(k).addEventListener('input',clearResult));units.forEach(k=>document.getElementById(k+'_unit').addEventListener('change',clearResult));
function example(loaded) {const a={volume:1,speed:0.01,start:loaded?1000:100000,target:loaded?200:1000,load:loaded?1:0};ids.forEach(k=>document.getElementById(k).value=a[k]);const u={volume:'m3',speed:'m3s',start:'Pa',target:'Pa'};units.forEach(k=>document.getElementById(k+'_unit').value=u[k]);document.getElementById('calc-btn').click();}
document.getElementById('ideal-example').addEventListener('click',()=>example(false));document.getElementById('load-example').addEventListener('click',()=>example(true));
})(typeof globalThis!=='undefined'?globalThis:this);
