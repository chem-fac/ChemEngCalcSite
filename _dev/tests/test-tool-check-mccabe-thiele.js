const {load,near,clean,error,assert}=require('./tool-check-mixing-support.cjs');
const t=load('tools/distillation/mccabe-thiele',['calculate','buildStages','feedIntersection','calculateRmin','eqY','invEqX']);
const base={alpha:2.5,zF:.5,xD:.95,xB:.05,R:2,q:1,eff:50};
const f=t.api.feedIntersection(2,.95,1,.5);near(f.x,.5);near(f.y,.65);
const strip={m:(f.y-.05)/(f.x-.05),b:.05-(f.y-.05)/(f.x-.05)*.05};
const s=t.api.buildStages({alpha:2.5,xD:.95,xB:.05,R:2,xFeed:f.x,strip});
assert.ok(s.ok);near(s.theoreticalStages,10.388001475872354,1e-10);
let out=clean(t.run(base)).html;assert.match(out,/塔内の実段数[\s\S]*?19 段/); // ceil((10.38800148-1)/.5)
clean(t.run({...base,eff:100}));clean(t.run({...base,eff:''}));
for(const key of ['alpha','R'])for(const value of ['',0,-1,'1e308']){const r=t.run({...base,[key]:value});if(value==='1e308'){if(r.error)error(r);else clean(r);}else error(r);}
for(const q of [0,.5,1,1.2])clean(t.run({...base,q}));
for(const eff of [0,-1,101,'1e309'])error(t.run({...base,eff}));error(t.run({...base,xB:.7}));error(t.run({...base,zF:-.1}));
near(t.api.invEqX(t.api.eqY(.3,2.5),2.5),.3);
console.log('mccabe-thiele: hand stages, q modes, efficiency/reboiler exclusion and boundaries OK');
