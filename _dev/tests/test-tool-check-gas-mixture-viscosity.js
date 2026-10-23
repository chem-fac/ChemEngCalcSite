'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// Wilke phi12/phi21 computed independently for N2/O2; handbook (1.350)-(1.351).
const a=load('properties','gas-mixture-viscosity');
a.calc().fails();
a.component(0,{name:'N2',x:.79,mu:17.81,mw:28.0134}).component(1,{name:'O2',x:.21,mu:20.18,mw:31.9988}).calc().ok().big(18.3147032,3e-5);
a.set({'composition-unit':'percent'}).component(0,{x:79}).component(1,{x:21}).calc().ok().big(18.3147032,3e-5);
a.component(0,{mu:10,mw:20}).component(1,{mu:10,mw:20}).calc().ok().big(10);
for(const x of ['',0,-1]) a.component(0,{mu:x}).calc().fails();
a.component(0,{x:1e308,mu:10,mw:20}).component(1,{x:1e308,mu:10,mw:20}).calc().fails();
console.log('gas-mixture-viscosity: PASS');
