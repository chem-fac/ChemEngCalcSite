'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Solute-free balances: G'=90; absorbed=100−1000/11=100/11;
// Xeq=1/49; Lmin=(100/11)/(1/49)=4900/11 kmol/h.
const t=load('tools/absorption/minimum-solvent-flow/',['calculate','updateCompositionLabels']);const p={'gas-flow':100,'gas-flow-unit':'kmol-h','gas-flow-basis':'total','composition-unit':'percent','y-in':10,'y-out':1,'x-in':0,'x-equilibrium':2,'operating-factor':1.5};
let r=clean(t.run(p));near(parseFloat(cells(r)[3]),4900/11,2e-6);near(parseFloat(cells(r)[7]),1000/11,2e-6);
const baseline=r.html;assert.equal(clean(t.run({...p,'gas-flow':90,'gas-flow-basis':'solute-free'})).html,baseline);
assert.equal(clean(t.run({...p,'composition-unit':'fraction','y-in':.1,'y-out':.01,'x-equilibrium':.02})).html,baseline);
for(const [unit,amount] of [['mol-h',100000],['mol-s',100/3.6]])clean(t.run({...p,'gas-flow':amount,'gas-flow-unit':unit}));
t.set(p);t.api.updateCompositionLabels();t.set({'composition-unit':'fraction'});t.api.updateCompositionLabels(true);near(+t.els.get('y-in').value,.1);
for(const v of ['',0,-1])error(t.run({...p,'gas-flow':v}));error(t.run({...p,'y-out':0}));error(t.run({...p,'x-in':2}));error(t.run({...p,'operating-factor':1}));error(t.run({...p,'gas-flow':1e300,'operating-factor':1e300}));

console.log('minimum-solvent-flow: PASS');
