const {load, assert} = require('./tool-check-fluid-heat-helper');
const t=load('continuity'); t.eval('render=(u2,Q)=>{globalThis.captured={u2,Q};return "ok"}');
t.set({u1:1,D1:0.1,D2:0.05,u1_unit:'ms',D1_unit:'m',D2_unit:'m'}).good();t.near(t.captured().u2,4);t.near(t.captured().Q,Math.PI*.1**2/4);
t.set({u1:100,D1:100,D2:50,u1_unit:'cms',D1_unit:'mm',D2_unit:'mm'}).good();t.near(t.captured().u2,4);
for(const v of ['',0,-1,'1e308'])t.set({D2:v}).bad();
t.set({D1:1,D2:1,D1_unit:'m',D2_unit:'m',u1:'1e308',u1_unit:'ms'}).bad();
console.log('continuity: mass balance, units and boundaries OK');
