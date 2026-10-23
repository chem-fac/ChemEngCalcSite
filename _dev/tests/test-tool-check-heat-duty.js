const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('heat-duty','heat-transfer');
t.set({heat_mode:'sensible',heat_direction:'auto',mass_flow:1,mass_flow_unit:'kgs',cp:4.2,cp_unit:'kJkgK',Tin:20,Tout:40});assert.match(t.good(),/>84 <span/);
t.set({mass_flow:3600,mass_flow_unit:'kgh',cp:4200,cp_unit:'JkgK'});assert.match(t.good(),/>84 <span/);
t.set({heat_mode:'both',heat_direction:'heating',latent:2000,latent_unit:'kJkg'});assert.match(t.good(),/>2084 <span/);
t.set({heat_mode:'latent',heat_direction:'cooling'});assert.match(t.good(),/>2000 <span/);
t.eval('basis="batch"');t.set({mass:100,mass_unit:'kg',batch_time:10,batch_time_unit:'s'});assert.match(t.good(),/>200 MJ/); // 200000 kJ
t.eval('basis="continuous"');t.set({heat_mode:'sensible',heat_direction:'auto',cp:4.2,cp_unit:'kJkgK'});
for(const v of ['',0,-1,'1e308'])t.set({mass_flow:v}).bad();
t.set({mass_flow:-1,vol_flow:3.6,vol_flow_unit:'m3h',rho:1000,rho_unit:'kgm3'}).bad(); // supplied invalid mass flow must not silently fall back
t.set({mass_flow:''}).good();assert.match(t.result(),/>84 <span/);
console.log('heat-duty: sensible/latent/both, continuous/batch, units and boundaries OK');
