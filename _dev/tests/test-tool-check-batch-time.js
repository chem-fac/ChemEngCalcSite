'use strict';
const {load, assert} = require('./tool-check-pre-harness');
const a=load('reaction','batch-time','reaction-batch-time');
for(const order of [0,1,2]) {
 for(const [unit,k] of Object.entries({s:.1,min:6,h:360})) {
  const tau=order===0?10:order===1?Math.log(2)/.1:5;
  a.set({order,CA0:2,X:50,k,k_time_unit:unit,q:1,q_unit:'Ls'}).calc().ok().big(tau/60);
 }
}
for(const x of ['',0,-1,100]) a.set({X:x}).calc().fails();
a.set({X:50,CA0:1e308,k:1e-308,order:0}).calc().fails();
for(const field of ['CA0','k']) for(const value of ['',0,-1]) a.set({order:1,CA0:2,k:.1,k_time_unit:'s',X:50,q:1,q_unit:'Ls',[field]:value}).calc().fails();
console.log('batch-time: PASS');
