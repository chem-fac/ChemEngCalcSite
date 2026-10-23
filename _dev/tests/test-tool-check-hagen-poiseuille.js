const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('hagen-poiseuille');
t.set({d:.01,d_unit:'m',basis:'U',U:.01,U_unit:'ms',mu:.001,mu_unit:'Pas',L:10,L_unit:'m',rho:1000,rho_unit:'kgm3',r:.5,r_unit:'ratio'});
let s=t.good('calc()');assert.match(s,/0.02 m\/s/);assert.match(s,/32 Pa/);assert.match(s,/0.015 m\/s/);
t.near(t.eval('uAt(.02,.005,.0025)'),.015);
t.set({basis:'Q',Q:Math.PI*.005**2*.01,Q_unit:'m3s'}).good('calc()');assert.match(t.result(),/0.02 m\/s/);
t.set({d:10,d_unit:'mm'}).good('calc()');
for(const v of ['',0,-1,'1e308']) t.set({d:v}).bad('calc()');
t.set({d:10,mu:-1}).bad('calc()');
console.log('hagen-poiseuille: both bases, velocity and pressure, units and boundaries OK');
