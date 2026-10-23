const {load,near,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/kamei-hiraoka',['calculate','calcStandard','calcLarge','calcHelical','PRESETS']);
const b={d:.5,d_unit:'m',D:1,D_unit:'m',H:1,H_unit:'m',b:.1,b_unit:'m',rho:1000,rho_unit:'kgm3',n:2,n_unit:'rps',mu:.001,mu_unit:'Pas',np:4,theta:90,preset:'paddle'};
// Independent Table 1 reference: Re_d=500000; compute the unbaffled paddle power number.
const p=t.api.calcStandard({d:.5,D:1,H:1,b:.1,np:4,thetaRad:Math.PI/2,Red:500000,preset:t.api.PRESETS.paddle});
near(p.beta,.9241962407465937);near(p.Np0,.40600886799945496,1e-10);
const expected={paddle:'101.5',pitched_paddle:'101.5',turbine:'101.5',propeller:'84.81',retreat:'84.81',hr320:'191.4',hr320s:'134.3',anchor:'101.5',helical:'28.94',maxblend_dished:'93.8',maxblend_flat:'97.2',fullzone_dished:'87.66',fullzone_flat:'89.4'};
for(const [preset,value] of Object.entries(expected)){assert.match(clean(t.run({...b,preset})).html,new RegExp('result-value-big">'+value.replace('.','\\.')));}
const out=clean(t.run(b)).html;assert.equal(clean(t.run({...b,n:120,n_unit:'rpm',d:500,d_unit:'mm',D:100,D_unit:'cm',H:100,H_unit:'cm',b:100,b_unit:'mm',rho:1,rho_unit:'gcm3',mu:1,mu_unit:'cP'})).html,out);
for(const k of ['n','d','D','H','b','rho','mu','np'])for(const v of ['',0,-1,'1e308']){const r=t.run({...b,[k]:v});if(v==='1e308'){if(r.error)error(r);else clean(r);}else error(r);}
error(t.run({...b,theta:91}));error(t.run({...b,d:1}));
console.log('kamei-hiraoka: Table 1/4, 13 presets, units and boundaries OK');
