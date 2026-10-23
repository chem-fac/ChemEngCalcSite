'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook 10.4.1: Z=N*HETP, excluding the equilibrium reboiler.
const t=load('tools/distillation/packed-column/',['calculate','toHeight','toStages','totalReflux']);
let r=t.api.toHeight({nR:4,nS:5,hetpR:.5,hetpS:NaN});near(r.ZR+r.ZS,4.5);
r=t.api.toStages({zR:2,zS:2.5,hetpR:.5,hetpS:NaN});near(r.NR+r.NS,9);
r=t.api.totalReflux({a:2,xTop:.8,xBot:.2,Z:3});near(r.Smin,4);near(r.N,3);near(r.HETP,1);
clean(t.run({nR:4,nS:5,hetpR:.5,hetpS:''}));
for(const p of [{nR:-1,hetpR:.5},{nR:1,hetpR:0},{nR:NaN,nS:NaN,hetpR:.5},{nR:1e300,hetpR:1e300}])assert.ok(t.api.toHeight(p).error);
assert.ok(t.api.toStages({zR:1e300,hetpR:1e-300}).error);
assert.ok(t.api.totalReflux({a:1,xTop:.8,xBot:.2,Z:3}).error);
assert.ok(t.api.totalReflux({a:2,xTop:.2,xBot:.8,Z:3}).error);
near(t.api.toHeight({nR:0,nS:0,hetpR:.5}).ZR,0);

console.log('packed-column: PASS');
