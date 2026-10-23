'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// Choose Ea=R*300 ln 2 so k=A/2 at 300 K and A/sqrt(2) at 600 K.
const a=load('reaction','arrhenius'), ea=8.314462618*300*Math.log(2);
for(const [u,Ea] of Object.entries({Jmol:ea,kJmol:ea/1000,calmol:ea/4.184,kcalmol:ea/4184}))
 a.set({A:10,Ea,Ea_unit:u,T:300,T_unit:'K'}).calc().ok().big(5);
a.set({T:26.85,T_unit:'C'}).calc().ok().big(5);
a.set({Ea:0}).calc().ok().big(10);
for(const x of ['',-1]) a.set({Ea:x}).calc().fails();
a.set({Ea:1e308}).calc().fails();
a.mode('EaCalc').set({k1:5,k2:10/Math.sqrt(2),T1:300,T2:600,T_unit:'K'}).calc().ok().big(ea/1000);
a.set({T2:300}).calc().fails();
a.mode('kCalc'); for(const field of ['A','T']) for(const value of ['',0,-1]) a.set({A:10,T:300,T_unit:'K',Ea:1,Ea_unit:'kJmol',[field]:value}).calc().fails();
a.mode('EaCalc').set({k1:1e-100,k2:1e-300,T1:300,T2:600,T_unit:'K'}).calc().fails();
console.log('arrhenius: PASS');
