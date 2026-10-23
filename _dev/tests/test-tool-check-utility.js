const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('utility','heat-transfer','utility-requirement');
t.set({Q:100,Q_unit:'kW',cp:4,cp_unit:'kJkgK',Tin:20,Tout:30,rho:1000,rho_unit:'kgm3',allowance:10});assert.match(t.good(),/>9900 <span/);
t.eval('mode="oil"');t.set({Tin:150,Tout:140});assert.match(t.good(),/>9900 <span/);
t.eval('mode="steam"');t.set({latent:2000,latent_unit:'kJkg'});assert.match(t.good(),/>198 <span/);
t.set({Q:100000,Q_unit:'W',latent:2000000,latent_unit:'Jkg'});assert.match(t.good(),/>198 <span/);
for(const v of ['',0,-1,'1e-308']) t.set({latent:v,Q:'1e308'}).bad();
t.set({Q:100,latent:2000,allowance:-1}).bad();
t.set({allowance:'1e309'}).bad();
console.log('utility: water/oil/steam, allowances, units and boundaries OK');
