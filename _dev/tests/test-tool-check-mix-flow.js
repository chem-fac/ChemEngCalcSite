const {load,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/flow',['calculate']);
const b={Np:4,np:4,n:2,n_unit:'rps',d:.5,d_unit:'m',D:1,D_unit:'m',b:.1,b_unit:'m',H:1,H_unit:'m'};
const out=clean(t.run(b)).html;assert.match(out,/919\.7/); // qc = 0.2554758742342416 m3/s, rounded in m3/h
assert.equal(clean(t.run({...b,n:120,n_unit:'rpm',d:500,d_unit:'mm',D:100,D_unit:'cm',b:100,b_unit:'mm',H:100,H_unit:'cm'})).html,out);
for(const k of ['Np','np','n','d','D','b'])for(const v of ['',0,-1,'1e308']){const r=t.run({...b,[k]:v});if(v==='1e308'){if(r.error)error(r);else clean(r);}else error(r);}
clean(t.run({...b,H:''}));for(const H of [0,-1,'1e309'])error(t.run({...b,H}));error(t.run({...b,d:1}));
console.log('mix-flow: book (1.12)-(1.17), units and boundaries OK');
