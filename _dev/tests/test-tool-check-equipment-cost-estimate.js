'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// Carbon-steel tower E=100 million, F=4; extra=10m; contingency 10%, fee 5% => 471.5m.
const a=load('economics','equipment-cost-estimate');
a.calc().fails();
a.set({t1:'vv',p1:1e8,n1:1,m1:1,extra:1e7,cont:10,fee:5,stage:'c4',plant:'fluid'}).calc().ok().big(471.5,2e-4).has('474.00');
// Price includes 2x material factor, installation applies to underlying carbon steel price: 100+50*(4-1)=250m.
a.set({m1:2,extra:'',cont:'',fee:''}).calc().ok().big(250);
for(const [type,f] of Object.entries({vv:4,hv:2.97,hx:3.14,pump:3.25,comp:2.90,avg:2.95,none:1}))
 a.set({t1:type,m1:1}).calc().ok().big(100*f);
for(const x of ['',0,-1]) a.set({p1:x}).calc().fails();
a.set({p1:1e8,n1:1.5}).calc().fails();
a.set({n1:1,m1:21}).calc().fails();
a.set({m1:1,p1:1e308,n1:100}).calc().fails();
for(const field of ['n1','m1']) for(const value of [0,-1]) a.set({p1:1e8,n1:1,m1:1,[field]:value}).calc().fails(); for(const field of ['cont','fee']) for(const value of [-1,100]) a.set({p1:1e8,n1:1,m1:1,cont:0,fee:0,[field]:value}).calc().fails();
a.set({t1:'vv',p1:3e307,n1:1,m1:1,extra:0,cont:0,fee:0,stage:'c5'}).calc().fails();
console.log('equipment-cost-estimate: PASS');
