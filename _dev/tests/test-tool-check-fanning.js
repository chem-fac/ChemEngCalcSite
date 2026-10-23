const {load, assert}=require('./tool-check-fluid-heat-helper');
const t=load('fanning'); t.eval('render=value=>{globalThis.captured=value;return "ok"}');
t.set({rho:1000,u:.01,D:.01,L:10,mu:.001,eps:0,rho_unit:'kgm3',u_unit:'ms',D_unit:'m',L_unit:'m',mu_unit:'Pas',eps_unit:'mm'}).good();
let r=t.captured(); t.near(r.Re,100); t.near(r.dP,32*.001*10*.01/.01**2);
for(const rough of [0,.001,.05]) {const f=t.eval(`frictionFactor(100000,${rough}).f`);t.near(1/Math.sqrt(4*f),-2*Math.log10(rough/3.7+2.51/(100000*Math.sqrt(4*f))),1e-8);}
t.set({rho:1,u:1,D:10,mu:1,rho_unit:'gcm3',u_unit:'cms',D_unit:'mm',mu_unit:'cP'}).good();t.near(t.captured().dP,32);
for(const v of ['',0,-1,'1e308'])t.set({D:v}).bad();
t.set({D:10,eps:-1}).bad();t.set({eps:1}).bad();
console.log('fanning: Poiseuille and independent Colebrook residual, units and boundaries OK');
