const {load,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/mixing/time',['calculate']);
const b={n:.333,n_unit:'rps',d:.75,d_unit:'m',D:2,D_unit:'m',H:2,H_unit:'m',Np:8.5,Nqd:.906,rho:1000,rho_unit:'kgm3',mu:.001,mu_unit:'Pas'};
t.mode('turb');assert.match(clean(t.run(b)).html,/134\.6/);
t.mode('turbH');assert.match(clean(t.run(b)).html,/81\.75/);
t.mode('lam');assert.match(clean(t.run({...b,mu:100})).html,/36500/); // book p.31 example, 135 s
for(const mode of ['turb','turbH','lam']){t.mode(mode);const out=clean(t.run(b)).html;assert.equal(clean(t.run({...b,n:19.98,n_unit:'rpm',d:750,d_unit:'mm',D:200,D_unit:'cm',H:200,H_unit:'cm',rho:1,rho_unit:'gcm3',mu:1,mu_unit:'cP'})).html,out);}
for(const mode of ['turb','turbH','lam']){t.mode(mode);for(const k of ['n','d','D','Np'])for(const v of ['',0,-1,'1e308']){const r=t.run({...b,[k]:v});if(v==='1e308'){if(r.error)error(r);else clean(r);}else error(r);}}
console.log('mix-time: book (3.8)-(3.10), three modes, units and boundaries OK');
