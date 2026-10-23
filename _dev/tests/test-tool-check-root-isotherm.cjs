'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook table13.7, (13.5),(13.6); exact data recover qmax=10,b=2.
const t=load('tools/adsorption/isotherm/',['calc','linReg']);
function rows(qs){for(let i=0;i<10;i++){t.els.get('c'+i).value=i<qs.length?[1,2,4,8,16][i]:'';t.els.get('q'+i).value=i<qs.length?qs[i]:'';}}
rows([20/3,8,80/9,160/17]);let r=clean(t.run({},'calc'));assert.match(r.html,/q_max = 10, b = 2/);assert.match(r.html,/Langmuir（R²_q = 1）/);
rows([3,3*Math.sqrt(2),6,3*Math.sqrt(8)]);r=clean(t.run({},'calc'));assert.match(r.html,/K_F = 3, 1\/n = 0.5/);
rows([1,1,1]);r=clean(t.run({},'calc'));assert.match(r.html,/R² は定義できません/);assert.ok(!r.html.includes('R²_q = 1'));
rows([]);error(t.run({},'calc'));rows([1,2,3]);t.els.get('q1').value='';error(t.run({},'calc'));
for(const v of ['0','-1','1e300']){rows([1,2,3]);t.els.get('c1').value=v;error(t.run({},'calc'));}

console.log('isotherm: PASS');
