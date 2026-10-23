const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('steam-table','heat-transfer');
const p=t.eval('lookupByT(100)');t.near(p.P,.10142);t.near(p.hg-p.hf,2256.53);t.near(p.vg,1.672);
// Independent IAPWS-IF97 values (Python iapws), allowing the page's documented table rounding.
for (const [T,P,vf,vg,hf,hg,sf,sg] of [
  [20,.002339214766776897,.0010018425795764653,57.76148280304212,83.9198962930407,2537.4694561790798,.29650312776275306,8.666124148774296],
  [100,.10141797792131013,.0010434554566105267,1.671860601094037,419.0991549977032,2675.572029220833,1.3070143278413402,7.354077050958401],
  [200,1.5546718682698253,.0011565138833287323,.12722232139614725,852.3930680834193,2792.0615640122796,2.3308007061038136,6.43029677203209],
  [300,8.587708329557278,.0014042229624885666,.02166306474645461,1344.7713390197293,2749.573742543973,3.254740550494214,5.705763616827153]
]) {
  const a=t.eval(`lookupByT(${T})`);
  for(const [key,ref] of Object.entries({P,vf,vg,hf,hg,sf,sg}))assert.ok(Math.abs(a[key]/ref-1)<.00065,`${T} ${key}`);
}
for(const [unit,value] of [['MPaA',.101325],['kPaA',101.325],['MPaG',0],['kPaG',0],['barA',1.01325],['barG',0]])t.near(t.eval(`presToMPaA(${value},"${unit}")`),.101325);
const q=t.eval('lookupByP(.101325)');t.near(q.T,99.9740786,1e-6);
for(const T of [0,100,200,373.946])t.set({T}).good('calc()');
for(const T of ['',-1,'1e308'])t.set({T}).bad('calc()');
t.eval('mode="P"');for(const P of ['',0,-1,'1e308'])t.set({P,P_unit:'MPaA'}).bad('calc()');
t.set({P:0,P_unit:'MPaG'}).good('calc()');
console.log('steam-table: reference points/interpolation, six pressure units and boundaries OK');
