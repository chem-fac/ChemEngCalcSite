'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// 100 million yen at S1=1 scales by 2^.6, then index ratio=1.2.
const a=load('economics','six-tenths-rule');
a.set({c1:1e8,s1:1,s2:2,i1:100,i2:120}).calc().ok().big(100*Math.pow(2,.6)*1.2,1e-4);
a.set({n:1}).calc().ok().big(240);
a.set({n:.7}).calc().ok().big(100*Math.pow(2,.7)*1.2,1e-4);
a.set({n:'',i1:'',i2:'',s2:1}).calc().ok().big(100);
a.set({i1:1}).calc().fails();
for(const x of ['',0,-1]) a.set({c1:x}).calc().fails();
a.set({c1:1e308,s2:1e308}).calc().fails();
for(const field of ['c1','s1','s2']) for(const value of ['',0,-1]) a.set({c1:1e8,s1:1,s2:2,i1:'',i2:'',[field]:value}).calc().fails();
console.log('six-tenths-rule: PASS');
