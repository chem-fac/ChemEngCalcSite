'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook 10.1.1: K_i=P_i^sat/P, y=alpha*x/[1+(alpha−1)x].
const t=load('tools/distillation/vle/',['calculate']); const p={psatA:200,psatB:100,P:150,xA:0.5};
let r=clean(t.run(p)); near(parseFloat(cells(r)[0]),1/3,1e-4);near(parseFloat(cells(r)[3]),2);near(parseFloat(cells(r)[5]),1);
for(const xA of [0,1])clean(t.run({...p,xA}));
r=clean(t.run({...p,P:1000}));assert.match(r.html,/沸騰平衡条件を満たして/);
for(const v of ['',0,-1])error(t.run({...p,psatA:v}));
for(const xA of [-0.01,1.01])error(t.run({...p,xA}));
error(t.run({...p,psatA:1e300,psatB:1e-300}));
error(t.run({...p,psatA:1e-300,P:1e300}));

console.log('vle: PASS');
