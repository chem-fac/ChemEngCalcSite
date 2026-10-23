const {load, assert} = require('./tool-check-fluid-heat-helper');
const t = load('reynolds'); t.capture();
t.set({rho:1000,u:1,D:0.05,mu:0.001,rho_unit:'kgm3',u_unit:'ms',D_unit:'m',mu_unit:'Pas'}).good();
t.near(t.captured().Re,50000);
t.set({rho:1,u:100,D:50,mu:1,rho_unit:'gcm3',u_unit:'cms',D_unit:'mm',mu_unit:'cP'}).good(); t.near(t.captured().Re,50000);
t.eval('currentMode="flowrate"'); t.set({Q:7.068583470577035,Q_unit:'m3h'}).good(); t.near(t.captured().Re,50000);
t.eval('currentMode="kinematic"'); t.set({nu:1,nu_unit:'cSt'}).good(); t.near(t.captured().Re,50000);
for(const v of ['',0,-1,'1e308']) {t.set({D:v}).bad();}
console.log('reynolds: velocity/flowrate/kinematic, SI/unit equivalence, blank/zero/negative/overflow OK');
