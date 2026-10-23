'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// 解説化学工学 pp.221–222 (6.15–19); three drag regimes and SI units.
const t=load('tools/separation/settling-velocity/',['calc','terminalVelocity']);const p={d:100,d_unit:'um',rho_p:2500,rho_p_unit:'kgm3',rho_f:1000,rho_f_unit:'kgm3',mu:1,mu_unit:'mPas'};
let u=t.api.terminalVelocity(1500,.0001,.001,1000);near(u.v,.008172208333333333);near(u.Re,.8172208333333333);assert.equal(u.law,'Stokes');
u=t.api.terminalVelocity(1500,.001,.001,1000);assert.equal(u.law,'Allen');near(4*9.80665*1500*.001/(3*1000*u.v*u.v),10/Math.sqrt(u.Re));
u=t.api.terminalVelocity(1500,.002,.001,1000);assert.equal(u.law,'Newton');near(4*9.80665*1500*.002/(3*1000*u.v*u.v),4/9);
let baseline=clean(t.run(p,'calc')).html;for(const d of [{d:.1,d_unit:'mm'},{d:.0001,d_unit:'m'},{rho_p:2.5,rho_p_unit:'gcm3',rho_f:1,rho_f_unit:'gcm3'},{mu:.001,mu_unit:'Pas'},{mu:1,mu_unit:'cP'}])assert.equal(clean(t.run({...p,...d},'calc')).html,baseline);
for(const v of ['',0,-1])error(t.run({...p,d:v},'calc'));error(t.run({...p,rho_p:900},'calc'));error(t.run({...p,d:1e300},'calc'));
assert.match(clean(t.run({...p,d:1e6},'calc')).html,/10⁵/);

console.log('settling-velocity: PASS');
