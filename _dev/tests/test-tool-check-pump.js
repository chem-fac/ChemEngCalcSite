const {load,assert}=require('./tool-check-fluid-heat-helper');
const t=load('pump');
t.set({rho:1000,rho_unit:'kgm3',Q:36,Q_unit:'m3h',z1:2,z2:12,P1:0,P2:0,P1_unit:'kPaG',P2_unit:'kPaG',dPs:9.80665,dPd:9.80665,dPs_unit:'kPa',dPd_unit:'kPa',Pa:101.325,Pv:2.3392,Pv_unit:'kPaA',eta_p:.7,eta_m:.9,NPSHr:3});
let s=t.good('calc()');assert.match(s,/H = 12 /);assert.match(s,/1.177/); // rho*g*0.01*12 /1000
t.near(t.eval('qToSI(600,"Lmin")'),.01); t.near(t.eval('presDiffToPa(1,"m",1000)'),9806.65);
for(const v of ['',0,-1,'1e308']) {t.set({rho:v}).bad('calc()');}
console.log('pump: energy balance, power, units and boundaries OK');
