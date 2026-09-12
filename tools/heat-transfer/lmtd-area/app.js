'use strict';
const $ = id => document.getElementById(id);
const form = $('form');
const inputIds = ['mode','temperatureUnit','hotIn','hotOut','coldIn','coldOut','heat','heatUnit','coefficient','coefficientUnit','correction'];
const numberFields = ['hotIn','hotOut','coldIn','coldOut','heat','coefficient','correction'];
let previousTemperatureUnit = 'C', lastState = null;
const format = value => !Number.isFinite(value) ? '—' : value!==0&&(Math.abs(value)>=1e7||Math.abs(value)<1e-3) ? value.toExponential(5) : new Intl.NumberFormat('ja-JP',{maximumSignificantDigits:6}).format(value);
function input() { return {...Object.fromEntries(inputIds.map(id => [id,$(id).value])), withArea:$('withArea').checked}; }
function svgText(x,y,text,color='#29484d',size=16,anchor='middle') { return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-family="Yu Gothic,Meiryo,sans-serif">${text}</text>`; }
function diagram(r) {
  const t = r.temperaturesC, unit = $('temperatureUnit').value, label = unit==='C'?'°C':unit==='F'?'°F':'K';
  const val = n => format(LMTD.fromCelsius(n,unit))+' '+label;
  const parallel = r.mode === 'parallel';
  const left = parallel?t.coldIn:t.coldOut, right=parallel?t.coldOut:t.coldIn;
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 290" role="img" aria-label="高温側入口を左にした端温度の対応図"><title>同じ端で高温側と低温側の温度を引きます</title>';
  s+='<rect x="115" y="55" width="370" height="164" rx="20" fill="#f3f5ed"/>';
  s+='<path d="M80 86H510 M501 79l10 7-10 7" stroke="#c75c30" fill="none" stroke-width="4" stroke-linecap="round"/>';
  s+= parallel?'<path d="M80 189H510 M501 182l10 7-10 7" stroke="#286e9d" fill="none" stroke-width="4" stroke-linecap="round"/>':'<path d="M90 189H520 M100 182l-10 7 10 7" stroke="#286e9d" fill="none" stroke-width="4" stroke-linecap="round"/>';
  s+=svgText(90,31,'高温側 入口','#a7421e',14)+svgText(510,31,'高温側 出口','#a7421e',14)+svgText(90,60,val(t.hotIn),'#a7421e',20)+svgText(510,60,val(t.hotOut),'#a7421e',20);
  s+=svgText(90,236,parallel?'低温側 入口':'低温側 出口','#286e9d',14)+svgText(510,236,parallel?'低温側 出口':'低温側 入口','#286e9d',14)+svgText(90,264,val(left),'#286e9d',20)+svgText(510,264,val(right),'#286e9d',20);
  for (const [x,d,k] of [[160,r.d1,'端1'],[440,r.d2,'端2']]) {
    s+=`<path d="M${x} 100v77 M${x-7} 100h14 M${x-7} 177h14" stroke="#78988b" stroke-width="2" fill="none"/>`;
    s+=svgText(x+(x<300?65:-65),131,k,'#5e7a6d',12)+svgText(x+(x<300?65:-65),155,format(d)+' K','#087b70',19);
  }
  return s+'</svg>'+`<div class="diagram-readout"><div><b>端1</b><span>高温側入口 ${val(t.hotIn)}<br>− 低温側${parallel?'入口':'出口'} ${val(left)}</span><strong>${format(r.d1)} K</strong></div><div><b>端2</b><span>高温側出口 ${val(t.hotOut)}<br>− 低温側${parallel?'出口':'入口'} ${val(right)}</span><strong>${format(r.d2)} K</strong></div></div>`;
}
function update() {
  $('correction-section').hidden = $('mode').value !== 'corrected';
  $('area-section').hidden = !$('withArea').checked;
  $('flow-note').textContent = {counter:'高温側と低温側が、逆の方向に流れます。',parallel:'高温側と低温側が、同じ方向に流れます。',corrected:'向流の端温度差を基準に、装置配置に対応する F で補正します。'}[$('mode').value];
  numberFields.forEach(id => $(id).removeAttribute('aria-invalid'));
  const state=LMTD.calculate(input());lastState=state;
  $('copy-status').textContent='';
  $('errors').replaceChildren();
  if (!state.ok) {
    $('result').hidden=true;$('errors').hidden=false;$('state').textContent='入力を確認';$('state').classList.add('error');
    const list=document.createElement('ul');
    state.errors.forEach(e=>{const item=document.createElement('li');item.textContent=e.text;list.append(item);if($(e.field))$(e.field).setAttribute('aria-invalid','true');});
    $('errors').append(list);$('diagram').replaceChildren();
    const empty=document.createElement('p');empty.className='hint';empty.textContent='温度条件を入力すると、端温度の対応図を表示します。';$('diagram').append(empty);
    return;
  }
  const r=state.result;
  $('result').hidden=false;$('errors').hidden=true;$('state').textContent='入力から自動計算';$('state').classList.remove('error');
  $('lmtd').textContent=format(r.lmtd);$('area').textContent=format(r.area);$('area-metric').hidden=r.area===null;
  $('d1').textContent=format(r.d1)+' K';$('d2').textContent=format(r.d2)+' K';$('f-value').textContent=format(r.correction);
  $('corrected-result').hidden=r.mode!=='corrected';$('corrected-result').textContent='補正後の温度差 F × LMTD = '+format(r.effective)+' K';
  $('notes').replaceChildren();r.notes.forEach(note=>{const p=document.createElement('p');p.className='note';p.textContent=note;$('notes').append(p);});
  $('diagram-caption').textContent=r.mode==='corrected'?'向流を基準にした両端の対応です。実際の多パス流路を示す図ではありません。':'図の左端を端1、右端を端2としています。';
  $('diagram').innerHTML=diagram(r);
}
const examples={standard:{hotIn:120,hotOut:70,coldIn:25,coldOut:60,heat:500,coefficient:800},equal:{hotIn:100,hotOut:60,coldIn:20,coldOut:60,heat:100,coefficient:500},cross:{hotIn:100,hotOut:40,coldIn:20,coldOut:80,heat:100,coefficient:500}};
document.querySelectorAll('[data-example]').forEach(button=>button.addEventListener('click',()=>{const values=examples[button.dataset.example];Object.entries(values).forEach(([id,value])=>{$(id).value=value;});$('mode').value='counter';$('temperatureUnit').value='C';previousTemperatureUnit='C';$('heatUnit').value='kW';previousHeatUnit='kW';$('coefficientUnit').value='W';previousCoefficientUnit='W';$('withArea').checked=true;update();}));
$('temperatureUnit').addEventListener('change',()=>{const target=$('temperatureUnit').value;['hotIn','hotOut','coldIn','coldOut'].forEach(id=>{const n=LMTD.number($(id).value);if(n!==null)$(id).value=Number(LMTD.fromCelsius(LMTD.toCelsius(n,previousTemperatureUnit),target).toPrecision(14));});previousTemperatureUnit=target;update();});
let previousHeatUnit='kW',previousCoefficientUnit='W';
$('heatUnit').addEventListener('change',()=>{const f={W:1,kW:1000,MW:1e6},n=LMTD.number($('heat').value);if(n!==null)$('heat').value=Number((n*f[previousHeatUnit]/f[$('heatUnit').value]).toPrecision(14));previousHeatUnit=$('heatUnit').value;update();});
$('coefficientUnit').addEventListener('change',()=>{const f={W:1,kW:1000},n=LMTD.number($('coefficient').value);if(n!==null)$('coefficient').value=Number((n*f[previousCoefficientUnit]/f[$('coefficientUnit').value]).toPrecision(14));previousCoefficientUnit=$('coefficientUnit').value;update();});
form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('submit',event=>{
  event.preventDefault();update();
  if(location.hostname==='tools.chem-fac.com'&&lastState?.ok&&typeof window.gtag==='function'){
    window.gtag('event','calculate',{tool_id:'lmtd-area',flow_mode:lastState.result.mode,calculation_type:lastState.result.area===null?'lmtd':'area'});
  }
});
$('reset').addEventListener('click',()=>{numberFields.filter(id=>id!=='correction').forEach(id=>{$(id).value='';});update();$('hotIn').focus();});
$('copy').addEventListener('click',async()=>{
  if(!lastState?.ok)return;const r=lastState.result,x=input();const name={counter:'向流',parallel:'並流',corrected:'多パス等・向流基準＋F'}[r.mode];
  const text=['LMTD・伝熱面積',name,`温度単位: ${x.temperatureUnit}`,`高温側 ${x.hotIn} → ${x.hotOut}`,`低温側 ${x.coldIn} → ${x.coldOut}`,`端温度差: ${format(r.d1)} / ${format(r.d2)} K`,`LMTD: ${format(r.lmtd)} K`,`F: ${format(r.correction)}`,...(r.area===null?[]:[`Q: ${format(r.heatW)} W`,`U: ${format(r.coefficientW)} W/(m²·K)`,`A: ${format(r.area)} m²`]),'定常・一定物性の概算。両流体の熱収支とFの適用性は別途確認。'].join('\n');
  try{await navigator.clipboard.writeText(text);$('copy-status').textContent='コピーしました';}catch{const box=document.createElement('textarea');box.value=text;box.setAttribute('aria-label','コピー用の条件と結果');$('copy-status').replaceChildren(box);box.select();}
});
update();
