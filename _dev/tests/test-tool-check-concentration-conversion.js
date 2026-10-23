'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// 100 g A (M=100), 900 g B (M=10), V=1 L: w=.1, x=1/91, m=1/.9.
const a=load('properties','concentration-conversion');
for(const [unit,conc] of Object.entries({masspct:10,ppm:1e5,xfrac:1/91,molkg:1/.9,molL:1,gL:100,mgL:1e5}))
 for(const [u,rho] of Object.entries({gcm3:1,kgL:1,kgm3:1000,gL:1000}))
  a.set({MA:100,MB:10,rho,rho_unit:u,conc,conc_unit:unit}).calc().ok().big(10).has('1 mol/L');
a.set({rho:'',conc:10,conc_unit:'masspct'}).calc().ok().has('密度未入力');
a.set({conc_unit:'molL'}).calc().fails();
a.set({rho:1,conc:0,conc_unit:'masspct'}).calc().ok().big(0);
for(const x of ['',-1,100]) a.set({conc:x}).calc().fails();
a.set({MA:1e-308,conc:99}).calc().fails();
for(const field of ['MA','MB']) for(const value of ['',0,-1]) a.set({MA:100,MB:10,conc:10,conc_unit:'masspct',[field]:value}).calc().fails(); for(const value of [0,-1]) a.set({MA:100,MB:10,rho:value}).calc().fails();
console.log('concentration-conversion: PASS');
