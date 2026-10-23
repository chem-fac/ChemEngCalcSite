'use strict';
const {load, assert} = require('./tool-check-pre-harness');
const a=load('reaction','cstr','reaction-cstr');
for(const order of [0,1,2]) {
 for(const [unit,k] of Object.entries({s:.1,min:6,h:360})) {
  const tau=2*.5/(.1*Math.pow(1,order));
  a.set({order,CA0:2,X:50,k,k_time_unit:unit,q:1,q_unit:'Ls'}).calc().ok().big(tau/1000);
 }
}
for(const [u,q] of Object.entries({Ls:1,Lmin:60,m3h:3.6,m3s:.001})) a.set({order:1,q,q_unit:u}).calc().ok().big(10/1000);
for(const x of ['',0,-1,100]) a.set({X:x}).calc().fails();
a.set({X:50,CA0:1e308,k:1e-308,order:0}).calc().fails();
for(const field of ['CA0','k','q']) for(const value of ['',0,-1]) a.set({order:1,CA0:2,k:.1,k_time_unit:'s',X:50,q:1,q_unit:'Ls',[field]:value}).calc().fails();
console.log('cstr: PASS');
