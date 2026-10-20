import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createDeployPlan,validateDeployInput} from "../../lib/cloud/deploy-plan.ts";
const sample={name:"das-preview",repository:"margaryan-labs/das-speak-armenia",branch:"main",environment:"staging",
 kind:"nextjs",cpu:2,memoryMB:1024,replicas:1,port:3000,healthPath:"/api/health",domain:"preview.example.com"};
test("Preview plan is review-only, contains no credentials or deployment instructions",()=>{
 const p=createDeployPlan(sample);
 assert.equal(p.execution,"manual-review-only");assert.equal(p.app.environment,"staging");
 assert.equal(p.resources.memoryMB,1024);assert.equal(p.routing.domain,"preview.example.com");
 assert.doesNotMatch(JSON.stringify(p),/apiKey|token|secretValue|password/i);
});
test("Production requires separate approval and staging gate",()=>{
 const p=createDeployPlan({...sample,environment:"production",name:"das-production"});
 assert.equal(p.execution,"manual-review-only");assert.ok(p.releaseGates.some(x=>x.includes("owner approval")));
});
test("Rejects injected branches and unusual repo URLs",()=>{
 for(const bad of ["../oops","main//test","main@{0}","bad branch","main\nx"])
  assert.ok(validateDeployInput({...sample,branch:bad}).length>0,bad);
 for(const repo of ["https://evil.test/a","foo/bar;rm -rf /","../x","foo/bar/../../../etc"])
  assert.ok(validateDeployInput({...sample,repository:repo}).length>0,repo);
});
test("Validates resource limits, DNS, published workers and health path",()=>{
 assert.ok(validateDeployInput({...sample,memoryMB:99999}).length>0);
 assert.ok(validateDeployInput({...sample,cpu:99}).length>0);
 assert.ok(validateDeployInput({...sample,replicas:12}).length>0);
 assert.ok(validateDeployInput({...sample,port:-1}).length>0);
 assert.ok(validateDeployInput({...sample,healthPath:"/../../admin"}).length>0);
 assert.ok(validateDeployInput({...sample,domain:"http://example.com"}).length>0);
 assert.ok(validateDeployInput({...sample,kind:"worker"}).length>0);
 assert.equal(validateDeployInput({...sample,kind:"worker",domain:""}).length,0);
});
test("No write or deployment authorization in Deploy Engine UI",()=>{
 const s=readFileSync(new URL("../../app/cloud/deploy-engine.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(s,/fetch\(["']\/api\/cloud\/deploy|fetch\(["']\/api\/cloud\/delete/);
 assert.match(s,/manual-review-only/);
});
