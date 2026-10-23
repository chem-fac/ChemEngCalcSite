'use strict';
const {load, assert} = require('./tool-check-pre-harness');
// PV=nRT; M=28 g/mol, T=300 K, P=1 atm gives rho=1.1374156 kg/m3.
const a=load('properties','ideal-gas-law');
for(const [u,p] of Object.entries({kPaA:101.325,MPaA:.101325,barA:1.01325,atm:1}))
 a.set({Td:300,Td_unit:'K',Pd:p,Pd_unit:u,Md:28}).calc().ok().big(101325*.028/(8.314462618*300));
a.set({Td:26.85,Td_unit:'C'}).calc().ok().big(101325*.028/(8.314462618*300));
for(const x of ['',0,-1]) a.set({Md:x}).calc().fails();
a.mode('flow').set({Qf:22.414,Qf_type:'Nm3h',Tf:0,Tf_unit:'C',Pf:1,Pf_unit:'atm',Mf:28}).calc().ok().big(22.414).has('28 kg/h');
a.set({Qf:22.414*288.15/273.15,Qf_type:'Sm3h'}).calc().ok().big(22.414);
a.set({Qf:22.414,Qf_type:'Am3h'}).calc().ok().big(22.414);
a.set({Mf:''}).calc().ok();
for(const x of ['',0,-1]) a.set({Qf:x}).calc().fails();
a.set({Qf:1e308,Tf:1e308,Qf_type:'Nm3h'}).calc().fails();
a.mode('density'); const baseline={Td:300,Td_unit:'K',Pd:100,Pd_unit:'kPaA',Md:28}; for(const field of ['Td','Pd','Md']) for(const value of ['',0,-1]) a.set({...baseline,[field]:value}).calc().fails();
console.log('ideal-gas-law: PASS');
