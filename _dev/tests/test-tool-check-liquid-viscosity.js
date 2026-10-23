'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// nu=mu/rho; 1 mPa.s at rho=1000 kg/m3 = 1 cSt.
const a=load('properties','liquid-viscosity');
for(const [u,mu] of Object.entries({'Pa-s':.001,'mPa-s':1,cP:1,P:.01}))
 for(const [r,rho] of Object.entries({'kg-m3':1000,'g-cm3':1,'kg-L':1}))
  a.set({mu,'mu-unit':u,'rho-mu':rho,'rho-mu-unit':r}).calc().ok().big(1);
for(const x of ['',0,-1]) a.set({mu:x}).calc().fails();
a.mode('nu-to-mu');
for(const [u,nu] of Object.entries({'m2-s':1e-6,'mm2-s':1,cSt:1,St:.01}))
 a.set({nu,'nu-unit':u,'rho-nu':1000,'rho-nu-unit':'kg-m3'}).calc().ok().big(1);
a.set({nu:1e308,'rho-nu':1e308}).calc().fails();
a.mode('mu-to-nu'); for(const field of ['mu','rho-mu']) for(const value of ['',0,-1]) a.set({mu:1,'rho-mu':1000,[field]:value}).calc().fails(); a.mode('nu-to-mu'); for(const field of ['nu','rho-nu']) for(const value of ['',0,-1]) a.set({nu:1,'rho-nu':1000,[field]:value}).calc().fails();
console.log('liquid-viscosity: PASS');
