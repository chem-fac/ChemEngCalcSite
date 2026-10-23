const {load,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/power',['calculate','setMode']);
const b={rho:1000,rho_unit:'kgm3',n:2,n_unit:'rps',d:.5,d_unit:'m',Np:4,P:1000,P_unit:'W',T:1000/(4*Math.PI),T_unit:'Nm'};
for(const mode of ['fromNp','fromPower','fromTorque']){t.api.setMode(mode);assert.match(clean(t.run(b)).html,/1000 W/);}
t.api.setMode('fromNp');const out=clean(t.run(b)).html;
assert.equal(clean(t.run({...b,rho:1,rho_unit:'gcm3',n:120,n_unit:'rpm',d:50,d_unit:'cm'})).html,out);
t.api.setMode('fromPower');assert.match(clean(t.run({...b,P:1,P_unit:'kW'})).html,/1000 W/);
t.api.setMode('fromTorque');assert.match(clean(t.run({...b,T:b.T/9.80665,T_unit:'kgfm'})).html,/1000 W/);
for(const k of ['rho','n','d'])for(const v of ['',0,-1,'1e308'])error(t.run({...b,[k]:v}));
console.log('mix-power: 1000 W / 79.577 Nm, three directions, units and boundaries OK');
