'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// 解説化学工学 pp.221–222 (6.15–19), t=H/u; rigid-sphere droplet approximation.
const t=load('tools/extraction/phase-separation-time/',['calc','terminalVelocity']);const p={disp:'light',rhoH:1000,rhoL:800,mu:1,d:100,H:1};
let u=t.api.terminalVelocity(200,.0001,.001,1000);near(u.u,.0010896277777777778);near(1/u.u,917.7445916801355,1e-9);assert.equal(u.regime,'ストークス域');
assert.equal(t.api.terminalVelocity(200,.0005,.001,1000).regime,'アレン域');assert.equal(t.api.terminalVelocity(200,.01,.001,1000).regime,'ニュートン域');
clean(t.run(p,'calc'));clean(t.run({...p,disp:'heavy'},'calc'));
for(const v of ['',0,-1])error(t.run({...p,d:v},'calc'));error(t.run({...p,rhoL:1000},'calc'));
error(t.run({...p,d:1e300,H:1e300},'calc'));assert.match(clean(t.run({...p,d:1e7},'calc')).html,/10⁵/);

console.log('phase-separation-time: PASS');
