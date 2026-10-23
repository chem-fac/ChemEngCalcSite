const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('overall-u','heat-transfer');
t.set({hi:1000,ho:500,delta:1,delta_unit:'mm',k_wall:10,Rfi:0,Rfo:0});assert.match(t.good(),/>322.6 <span/);
t.set({delta:.001,delta_unit:'m'});assert.match(t.good(),/>322.6 <span/);
t.set({delta:0,k_wall:'',Rfi:'',Rfo:''});assert.match(t.good(),/>333.3 <span/);
for(const v of ['',0,-1,'1e-320'])t.set({hi:v}).bad();
t.set({hi:1000,Rfi:-1}).bad();
console.log('overall-u: resistance balance/zero wall/optional fouling, units and boundaries OK');
