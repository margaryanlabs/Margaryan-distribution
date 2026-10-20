import test from "node:test";import assert from "node:assert/strict";
import {planCapacity,defaultWorkloads} from "../../lib/cloud/capacity.ts";
test("Default workloads are explicit estimates, never real measurements",()=>{
 assert.ok(defaultWorkloads.some(x=>x.id==="veto"&&!x.enabled));
 assert.ok(defaultWorkloads.some(x=>x.id==="data"&&x.ramMiB===8192));
});
test("A small 8GiB server is not passed off as enough for full Supabase",()=>{
 const r=planCapacity({cpu:4,ramMiB:8192,reservedCpu:1,reservedRamMiB:1024},defaultWorkloads);
 assert.equal(r.valid,true);assert.equal(r.fit,false);assert.ok(r.ramPercent>100);
});
test("Separate large host allows non-analytics allocations with visible reserve",()=>{
 const r=planCapacity({cpu:16,ramMiB:32768,reservedCpu:2,reservedRamMiB:2048},defaultWorkloads);
 assert.equal(r.fit,true);assert.equal(r.usedRamMiB,13312);assert.equal(r.availableRamMiB,30720);
});
test("VETO analytics warns when primary database shares its host",()=>{
 const workloads=defaultWorkloads.map(x=>x.id==="veto"?{...x,enabled:true}:x);
 const r=planCapacity({cpu:32,ramMiB:65536,reservedCpu:2,reservedRamMiB:4096},workloads);
 assert.equal(r.fit,true);assert.ok(r.notes.some(x=>x.includes("separate hosts")));
});
test("Bad numeric input fails closed",()=>{
 for(const node of [{cpu:0,ramMiB:4096,reservedCpu:0,reservedRamMiB:0},
  {cpu:4,ramMiB:4096,reservedCpu:4,reservedRamMiB:0},
  {cpu:NaN,ramMiB:4096,reservedCpu:0,reservedRamMiB:0}]){
  assert.equal(planCapacity(node,defaultWorkloads).valid,false);
 }
});
test("Replicas are accounted for",()=>{
 const x=[{...defaultWorkloads[0],enabled:true,replicas:3}];
 const r=planCapacity({cpu:8,ramMiB:8192,reservedCpu:1,reservedRamMiB:1024},x);
 assert.equal(r.usedCpu,3);assert.equal(r.usedRamMiB,3072);
});
