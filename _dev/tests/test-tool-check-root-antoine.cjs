'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// NIST water, 273–303 K: log10(P/bar)=5.40221−1838.675/(T/K−31.737).
const t=load('tools/distillation/antoine/',['calculate','applyMode']);
const p={A:5.40221,B:1838.675,C:-31.737,T:298.15,Tunit:'K',Punit:'bar',base:'log10'};
let r=clean(t.run(p)); near(parseFloat(cells(r)[0]),3166.74874006211,2e-4);
t.api.applyMode('TfromP'); r=clean(t.run({P:0.0316674874006211})); near(parseFloat(cells(r)[1]),298.15,2e-4);
t.api.applyMode('PfromT');
for(const [unit,f] of Object.entries({Pa:1,kPa:1000,MPa:1e6,bar:1e5,atm:101325,mmHg:133.322,Torr:133.322})){
 r=clean(t.run({...p,Punit:unit})); near(parseFloat(cells(r)[0]),0.0316674874006211*f,4e-4);
}
r=clean(t.run({...p,T:25,Tunit:'C',C:241.413})); near(parseFloat(cells(r)[0]),3166.74874006211,2e-4);
r=clean(t.run({...p,base:'ln',A:5.40221*Math.LN10,B:1838.675*Math.LN10}));near(parseFloat(cells(r)[0]),3166.74874006211,2e-4);
for(const x of [{T:''},{T:-300,Tunit:'C'},{T:31.737},{A:307,B:0,Punit:'bar'},{A:1e300}])error(t.run({...p,...x}));

console.log('antoine: PASS');
