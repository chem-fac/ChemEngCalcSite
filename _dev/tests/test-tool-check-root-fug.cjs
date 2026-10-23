'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook (10.41),(10.81), independent operating-line construction at pinch.
const t=load('tools/distillation/fug/',['calculate','fug','feedPinch']);const p={xF:.5,xD:.95,xB:.05,a:2.5,q:1,rMode:'ratio',rVal:1.3};
let r=t.api.fug(p);near(r.Smin,Math.log(361)/Math.log(2.5));near(r.Rmin,1.1);near(r.S,14.423416835462199,1e-8);
for(const q of [-.5,0,.28,1,1.42,2]){r=t.api.fug({...p,q});assert.ok(!r.error);near(r.Rmin,(p.xD-r.pinch.y)/(r.pinch.y-r.pinch.x));if(q!==1)near(r.pinch.y,q/(q-1)*r.pinch.x-p.xF/(q-1));}
const ui={xF:.5,xD:.95,xB:.05,alpha:2.5,q:1,rmode:'ratio',rval:1.3};clean(t.run(ui));assert.match(clean(t.run({...ui,q:-.5})).html,/外挿/);
for(const v of ['',0,-1])error(t.run({...ui,alpha:v}));for(const q of ['',1e300])error(t.run({...ui,q}));
assert.ok(t.api.fug({...p,rVal:1}).error);assert.ok(t.api.fug({...p,rVal:Infinity}).error);

console.log('fug: PASS');
