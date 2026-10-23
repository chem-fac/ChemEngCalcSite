const {load, assert} = require('./tool-check-fluid-heat-helper');
const t = load('flow-conversion'); t.eval('renderFlowrate=(Q,A,u,d)=>{globalThis.captured={Q,A,u,d};return "ok"}');
t.set({u:1,u_unit:'ms',D:0.05,D_unit:'m'}).good(); t.near(t.captured().Q,Math.PI*0.05**2/4);
t.set({u:100,u_unit:'cms',D:50,D_unit:'mm'}).good(); t.near(t.captured().Q,Math.PI*0.05**2/4);
t.eval('dInputMode="outer"'); t.set({Do:60,t:5,Do_unit:'mm',t_unit:'mm'}).good(); t.near(t.captured().d.D,0.05);
t.set({t:30}).bad(); t.eval('dInputMode="inner";currentMode="velocity";renderVelocity=(u)=>{globalThis.captured={u};return "ok"}');
t.set({Q:7.068583470577035,Q_unit:'m3h'}).good();t.near(t.captured().u,1);
t.eval('currentMode="diameter";renderDiameter=(D)=>{globalThis.captured={D};return "ok"}');t.good();t.near(t.captured().D,0.05);
for(const v of ['',0,-1]) {t.set({u:v,Q:v}).bad();}
t.eval('currentMode="flowrate"'); t.set({u:1,D:'1e308'}).bad();
t.set({u:'1e308',u_unit:'ms',D:.05,D_unit:'m'}).bad(); // SI is finite but L/h overflows
console.log('flow-conversion: all modes, outer diameter, units and boundaries OK');
