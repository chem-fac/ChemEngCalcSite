const {load,near,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/baffled-power',['calculate','autoNpmax','calcX','MODELS']);
const b={model:'pitched',d:.5,d_unit:'m',D:1,D_unit:'m',H:1,H_unit:'m',b:.1,b_unit:'m',B:.1,B_unit:'m',hB:.5,hB_unit:'m',rho:1000,rho_unit:'kgm3',n:2,n_unit:'rps',nB:4,np:4,theta:45,Np0:.3,Npmax:''};
// Furukawa (2012), Table 2 and equation (2), independently evaluated reference case.
t.set(b);near(t.api.autoNpmax(t.api.MODELS.pitched,4,.1,.5,Math.PI/4),1.3483389779513513);
near(t.api.calcX(t.api.MODELS.pitched,{B:.1,D:1,H:1,hB:.5,nB:4,thetaRad:Math.PI/4,Np0:.3},1.3483389779513513),1.2808044927580227);
assert.match(clean(t.run(b)).html,/1\.184/);
for(const model of ['paddle','pitched','large','hr320','hr320s'])clean(t.run({...b,model,Npmax:model==='large'?2:''}));
const first=clean(t.run(b)).html;
assert.equal(clean(t.run({...b,d:500,d_unit:'mm',D:100,D_unit:'cm',H:100,H_unit:'cm',b:10,b_unit:'cm',B:100,B_unit:'mm',hB:50,hB_unit:'cm',n:120,n_unit:'rpm',rho:1,rho_unit:'gcm3'})).html,first);
for(const v of ['',0,-1,'1e308'])error(t.run({...b,n:v}));
for(const hB of [-.1,0,1.1])error(t.run({...b,hB}));
clean(t.run({...b,hB:''}));clean(t.run({...b,theta:90}));for(const Npmax of [0,-1,'1e309'])error(t.run({...b,Npmax}));error(t.run({...b,theta:91}));error(t.run({...b,d:1}));
assert.ok(!t.html.includes('傾斜パドル翼／プロペラ翼'));
console.log('baffled-power: Table 2/eq (2), five models, units and invalid hB OK');
