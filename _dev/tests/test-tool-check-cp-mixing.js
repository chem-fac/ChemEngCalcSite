const {load,assert}=require('./tool-check-fluid-heat-helper');const t=load('cp-mixing','heat-transfer');
const w=i=>`[data-w="${i}"]`,c=i=>`[data-cp="${i}"]`;
t.set({cp_unit:'kJkgK',[w(0)]:.25,[c(0)]:4,[w(1)]:.75,[c(1)]:2});assert.match(t.good('calc()'),/>2.5 <span/);
for(const unit of ['JkgK','JmolK','kJmolK']) {t.set({cp_unit:unit}).good('calc()');assert.match(t.result(),/>2.5 <span/);}
for(const v of ['',0,-1,'1e308'])t.set({[w(0)]:v,[c(0)]:'1e308'}).bad('calc()');
console.log('cp-mixing: independent weighted sum, four units and boundaries OK');
