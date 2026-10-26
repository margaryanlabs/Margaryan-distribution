import test from "node:test";import assert from "node:assert/strict";
import {planCapacity,defaultWorkloads,twoProductWorkloads} from "../../lib/cloud/capacity.ts";
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

test("Two isolated production candidates cannot fit a 16 GiB pilot with operational reserve",()=>{
 const r=planCapacity({cpu:8,ramMiB:16384,reservedCpu:1,reservedRamMiB:2048},twoProductWorkloads);
 assert.equal(r.valid,true);
 assert.equal(r.fit,false);
 assert.ok(r.notes.some(x=>x.includes("exceed")));
});
test("32 GiB two-product estimate fits RAM and CPU only with explicitly reserved headroom",()=>{
 const r=planCapacity({cpu:16,ramMiB:32768,reservedCpu:2,reservedRamMiB:4096},twoProductWorkloads);
 assert.equal(r.fit,true);
 assert.equal(r.usedCpu,12);
 assert.equal(r.usedRamMiB,19968);
 assert.equal(r.availableRamMiB,28672);
 assert.ok(twoProductWorkloads.some(x=>x.id==='vetogram-neon-compat'));
 assert.ok(twoProductWorkloads.some(x=>x.id==='promptence-supabase'));
 assert.ok(twoProductWorkloads.some(x=>x.id==='clickhouse'&&!x.enabled));
});
test("Expensive media and ClickHouse workloads do not silently fit a 32 GiB first VPS",()=>{
 const heavy=twoProductWorkloads.map(x=>({...x,enabled:true}));
 const r=planCapacity({cpu:16,ramMiB:32768,reservedCpu:2,reservedRamMiB:4096},heavy);
 assert.equal(r.fit,false);
});
