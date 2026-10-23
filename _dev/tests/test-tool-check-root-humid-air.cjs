'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Buck CR-2 Appendix1; handbook (14.1–14.8); liquid-water reference below zero.
const t=load('tools/moisture/humid-air/',['calc','Psat','dewpoint','wetBulb','W_from_Twb']);const p={Tdb:25,second_kind:'RH',second_val:60,Patm:101.325};
near(t.api.Psat(25),3168.531412275435);let r=clean(t.run(p,'calc'));assert.match(r.html,/19.47/);assert.match(r.html,/0.01189/);assert.match(r.html,/55.45/);
const pv=.6*t.api.Psat(25),w=.622*pv/(101325-pv),tw=t.api.wetBulb(25,w,101325);near(t.api.W_from_Twb(25,tw,101325),w);near(t.api.Psat(t.api.dewpoint(pv)),pv,1e-6);
for(const [second_kind,second_val] of [['Twb',tw],['Tdp',t.api.dewpoint(pv)],['W',w]])clean(t.run({...p,second_kind,second_val},'calc'));
r=clean(t.run({...p,second_val:0},'calc'));assert.match(r.html,/定義なし/);assert.ok(!r.html.includes('-100 °C'));
r=clean(t.run({...p,second_val:1e-20},'calc'));assert.match(r.html,/計算範囲外（−80 °C未満）/);
near(t.api.wetBulb(25,.622*t.api.Psat(25)/(101325-t.api.Psat(25)),101325),25);
for(const Tdb of [-40,-20,0,50]){r=clean(t.run({...p,Tdb},'calc'));}
for(const second_val of ['',-1,101])error(t.run({...p,second_val},'calc'));
for(const Patm of [0,-1,1e308])error(t.run({...p,Patm},'calc'));error(t.run({...p,second_kind:'Tdp',second_val:-300},'calc'));
error(t.run({...p,Tdb:51},'calc'));error(t.run({...p,second_kind:'Twb',second_val:26},'calc'));
assert.match(t.html,/1000R_a/);

console.log('humid-air: PASS');
