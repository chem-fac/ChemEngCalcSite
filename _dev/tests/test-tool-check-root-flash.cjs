'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook (10.17–22), exactly beta=1/2 at K=(2,1/2), z=1/2.
const t=load('tools/distillation/flash/',['calculate','rr','bisect']);const p={psatA:200,psatB:50,P:100,F:100,zA:.5};
let r=clean(t.run(p));near(parseFloat(cells(r)[0]),50);near(parseFloat(cells(r)[1]),50);near(parseFloat(cells(r)[2]),1/3,1e-4);near(parseFloat(cells(r)[4]),2/3,1e-4);near(t.api.rr(.5,.5,2,.5),0);
r=clean(t.run({...p,P:300}));assert.match(r.html,/全液相/);r=clean(t.run({...p,P:20}));assert.match(r.html,/全気相/);
for(const zA of [0,1])clean(t.run({...p,zA}));
for(const v of ['',0,-1])error(t.run({...p,F:v}));for(const zA of [-.01,1.01])error(t.run({...p,zA}));
error(t.run({...p,psatA:1e300,P:1e-300}));error(t.run({...p,psatA:1e-300,P:1e300}));

console.log('flash: PASS');
