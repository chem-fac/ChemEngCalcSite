'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// ln K2/K1 = -dH/R (1/T2-1/T1), dH=R*300*ln 2 at 300 -> 600 K.
const a=load('properties','vant-hoff'), dH=8.314462618*600*Math.log(2);
a.set({T1:300,K1:1,T2:600,K2:2}).calc().ok().big(dH/1000);
a.set({T1:26.85,T1_unit:'C',T2:326.85,T2_unit:'C'}).calc().ok().big(dH/1000);
a.set({T2:26.85}).calc().fails();
a.mode('predict').set({pT1:300,pK1:1,pdH:dH/1000,pT2:600}).calc().ok().big(2);
a.set({pdH:0}).calc().ok().big(1);
a.set({pdH:-dH/1000}).calc().ok().big(.5);
for(const x of ['',0,-1]) a.set({pT1:x}).calc().fails();
a.set({pT1:300,pdH:1e6}).calc().fails();
a.mode('two').set({T1:300,T1_unit:'K',T2:600,T2_unit:'K',K1:1e-300,K2:1e300}).calc().ok();
a.mode('two'); for(const field of ['T1','T2','K1','K2']) for(const value of ['',0,-1]) a.set({T1:300,T2:600,T1_unit:'K',T2_unit:'K',K1:1,K2:2,[field]:value}).calc().fails();
console.log('vant-hoff: PASS');
