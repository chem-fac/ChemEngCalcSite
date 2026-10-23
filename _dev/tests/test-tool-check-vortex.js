const {load,near,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/vortex',['calculate']);
const base={n:2,n_unit:'rps',d:.3,d_unit:'m',D:1,D_unit:'m',rc:.1,rc_unit:'m'};
const out=clean(t.run(base)).html;
assert.match(out,/145\.8/);assert.match(out,/11\.98/);
// Integrate v_theta^2/(g r), then the surface volume: independent of the calculator formulas.
const g=9.80665,w=4*Math.PI,c=.1,R=.5;
const N=200000;let mean=0;
const shape=r=>r<=c?w*w*r*r/(2*g):w*w*c*c/g-w*w*c**4/(2*g*r*r);
for(let i=0;i<N;i++){const r=(i+.5)*R/N;mean+=shape(r)*2*r*(R/N)/(R*R);}
near(mean,.14582978935971966,1e-9);near(shape(R)-mean,.01197679801627639,1e-9);
const si=out;
assert.equal(clean(t.run({...base,n:120,n_unit:'rpm',d:300,d_unit:'mm',D:100,D_unit:'cm',rc:10,rc_unit:'cm'})).html.replace(/入力[\s\S]*/,''),si.replace(/入力[\s\S]*/,''));
for(const value of ['',0,-1,'1e308'])error(t.run({...base,n:value}));
error(t.run({...base,rc:.5}));error(t.run({...base,d:1}));
clean(t.run({...base,rc:'',b:.06,b_unit:'m',np:4,Re:10000}));
error(t.run({...base,rc:'',b:0,b_unit:'m',np:4,Re:10000}));
console.log('vortex: volume integral, baseline, automatic rc, units and boundaries OK');
