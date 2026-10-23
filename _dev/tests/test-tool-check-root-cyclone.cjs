'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Lapple cut diameter (EPA APTI 413 eq.6.2); deltaP=K*rho*v^2/2.
const t=load('tools/dust-collection/cyclone/',['calc']);const p={B:200,B_unit:'mm',H:400,H_unit:'mm',vi:15,Q:'',Ne:6,mu:.018,mu_unit:'mPas',rho_p:2500,rho_p_unit:'kgm3',rho_g:1.2,rho_g_unit:'kgm3',K:8};
let r=clean(t.run(p,'calc'));near(parseFloat(cells(r)[0]),4.788,1e-4);near(parseFloat(cells(r)[3]),1080);const baseline=r.html;
for(const d of [{B:.2,B_unit:'m',H:.4,H_unit:'m'},{mu:.000018,mu_unit:'Pas'},{rho_p:2.5,rho_p_unit:'gcm3',rho_g:.0012,rho_g_unit:'gcm3'},{vi:'',Q:4320,Q_unit:'m3h'},{vi:'',Q:72,Q_unit:'m3min'}])assert.equal(clean(t.run({...p,...d},'calc')).html,baseline);
for(const v of ['',0,-1])error(t.run({...p,B:v},'calc'));error(t.run({...p,vi:-1,Q:4320},'calc'));error(t.run({...p,vi:1e300},'calc'));error(t.run({...p,rho_p:1},'calc'));

console.log('cyclone: PASS');
