'use strict';
const {load,near,clean,error,cells,assert}=require('./tool-check-root-support.cjs');

// Handbook (10.12–14); alpha=2 gives W/W0=(xW/x0)*[(1−x0)/(1−xW)]^2.
const t=load('tools/distillation/simple/',['calculate','rayleighIntegral']);const p={psatA:200,psatB:100,W0:100,x0:0.5,xW:0.2};
near(t.api.rayleighIntegral(.5,.2,2),Math.log(6.4));let r=clean(t.run(p));near(parseFloat(cells(r)[0]),15.625,4e-4);near(parseFloat(cells(r)[1]),5/9,1e-4);near(parseFloat(cells(r)[2]),93.75);
// Independent midpoint quadrature of integral dx/(y−x), rather than closed form.
let sum=0,N=100000;for(let i=0;i<N;i++){let x=.2+(.3/N)*(i+.5);sum+=(.3/N)/(2*x/(1+x)-x);}near(sum,t.api.rayleighIntegral(.5,.2,2),1e-9);
for(const v of ['',0,-1])error(t.run({...p,W0:v}));
for(const xW of [0,1,.6])error(t.run({...p,xW}));
error(t.run({...p,psatA:100}));error(t.run({...p,psatA:1e300,psatB:1e-300}));error(t.run({...p,xW:5e-324}));

console.log('simple: PASS');
