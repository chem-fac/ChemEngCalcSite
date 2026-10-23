const {load,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/reynolds',['calculate','regimeOf']);
const b={rho:1000,rho_unit:'kgm3',mu:.001,mu_unit:'Pas',n:2,n_unit:'rps',d:.3,d_unit:'m'};
assert.match(clean(t.run(b)).html,/180,000|1.80×10/);
assert.match(clean(t.run({...b,d:.5})).html,/5.00×10/); // Handbook 6th ed., example 7.1, Re=500000
const out=clean(t.run(b)).html;assert.equal(clean(t.run({...b,rho:1,rho_unit:'gcm3',mu:1,mu_unit:'cP',n:120,n_unit:'rpm',d:300,d_unit:'mm'})).html,out);
for(const k of ['rho','mu','n','d'])for(const v of ['',0,-1,'1e308']){const r=t.run({...b,[k]:v});if(v==='1e308'){if(r.error)error(r);else clean(r);}else error(r);}
assert.equal(t.api.regimeOf(50).key,'laminar');assert.equal(t.api.regimeOf(1000).key,'turbulent');
console.log('mix-reynolds: Re=180000, SI/unit equivalence, regime thresholds and boundaries OK');
