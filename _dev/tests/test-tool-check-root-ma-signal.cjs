'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Linear span and DP sqrt: 8mA -> 25% DP -> 50% flow; Ohm law V=.25I.
// NAMUR boundaries: Vaisala PR-50021 manual: <=3.6 or >=21 mA failure.
const t=load('tools/instrumentation-control/ma-signal/',['calculate','setMode','ne43Note']);const p={I:8,LRV:0,URV:100,char:'sqrt'};
let r=clean(t.run(p));near(parseFloat(cells(r)[1]),50);near(parseFloat(cells(r)[2]),50);near(parseFloat(cells(r)[3]),2);
t.api.setMode('toma');r=clean(t.run({...p,PV:50}));near(parseFloat(cells(r)[2]),8);
t.api.setMode('toval');r=clean(t.run({...p,char:'linear',I:12,LRV:-100,URV:100}));near(parseFloat(cells(r)[1]),0);
for(const I of [3.6,21])assert.match(t.api.ne43Note(I),/故障信号/);for(const I of [3.7,20.9])assert.ok(!t.api.ne43Note(I).includes('故障信号'));
for(const I of ['',-1,0,3.9])error(t.run({...p,I}));error(t.run({...p,URV:0}));error(t.run({...p,LRV:-1e308,URV:1e308}));

console.log('ma-signal: PASS');
