'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// Same integrated reciprocal-temperature law as van't Hoff; positive latent heat.
const a=load('properties','clausius-clapeyron'), dH=8.314462618*600*Math.log(2);
a.set({T1:300,T1_unit:'K',T2:600,T2_unit:'K',P1:1,P1_unit:'atm',P2:2,P2_unit:'atm',T3:600,T3_unit:'K'}).calc().ok().big(dH/1000).has('202.7 kPa');
for(const [u,p] of Object.entries({kPa:101.325,MPa:.101325,bar:1.01325,atm:1,mmHg:101325/133.322,Pa:101325}))
 a.set({P1:p,P1_unit:u}).calc().ok().big(dH/1000);
a.set({P2:.5}).calc().fails();
a.mode('predict').set({pT1:300,pT1_unit:'K',pP1:101.325,pP1_unit:'kPa',pdH:dH/1000,pT2:600,pT2_unit:'K'}).calc().ok().big(202.65);
for(const x of ['',0,-1]) a.set({pdH:x}).calc().fails();
a.set({pdH:1e6}).calc().fails();
a.mode('two'); for(const field of ['T1','T2','P1','P2']) for(const value of ['',0,-1]) a.set({T1:300,T2:600,T1_unit:'K',T2_unit:'K',P1:1,P2:2,P1_unit:'atm',P2_unit:'atm',[field]:value}).calc().fails();
console.log('clausius-clapeyron: PASS');
