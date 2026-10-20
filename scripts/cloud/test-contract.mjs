import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {appView,deploymentView,isValidCoolifyOrigin,projectView,safeList,serverView} from "../../lib/cloud/normalize.ts";

test("Coolify response requires an array of objects",()=>{
 assert.throws(()=>safeList({token:"oops"}),/expected a list/);
 assert.throws(()=>safeList(null),/expected a list/);
});
test("Coolify response safely caps to 500 records",()=>{
 assert.equal(safeList(Array.from({length:800},(_,i)=>({id:i}))).length,500);
 assert.equal(safeList([null,"string",[],{},42]).length,1);
});
test("Only allowlisted application fields are exposed",()=>{
 const result=appView({uuid:"app-1",name:"Promptence",status:"running",fqdn:"https://example.com",
  git_repository:"margaryan-labs/ai-revenue-navigator",git_branch:"main",updated_at:"2026-10-20",
  environment_variables:"TOP_SECRET",private_key:"SSH_SECRET",token:"API_SECRET"});
 assert.equal(result.name,"Promptence");
 assert.equal(result.domain,"https://example.com");
 assert.equal(result.gitRepository,"margaryan-labs/ai-revenue-navigator");
 assert.equal(JSON.stringify(result).includes("SECRET"),false);
 assert.equal(Object.keys(result).length,7);
});
test("Allowlisted server/deployment/project fields exclude confidential upstream keys",()=>{
 const server=serverView({uuid:"server1",name:"main",status:"healthy",ip:"203.0.113.7",private_key:"TOP_SECRET"});
 const deployment=deploymentView({deployment_uuid:"deploy1",status:"queued",application_name:"App",logs:"SECRET_LOGS",configuration_snapshot:{secret:"TOKEN"}});
 const project=projectView({uuid:"project1",name:"production",secret:"SECRET"});
 for(const value of [server,deployment,project])assert.equal(JSON.stringify(value).includes("SECRET"),false);
 assert.equal(deployment.status,"queued");
});
test("Overlong fields are truncated",()=>{
 assert.equal(appView({name:"a".repeat(1000),fqdn:"b".repeat(1000)}).name.length,250);
 assert.equal(appView({fqdn:"b".repeat(1000)}).domain.length,500);
});
test("Coolify origin is HTTPS-only, except local loopback testing",()=>{
 for(const address of ["https://cloud.example.com","https://cloud.example.com:8443","http://127.0.0.1:8000"])
  assert.equal(isValidCoolifyOrigin(address),true,address);
 for(const address of ["http://cloud.example.com","https://user:pass@cloud.example.com","https://cloud.example.com/path",
  "https://cloud.example.com?token=123","https://cloud.example.com/#frag","http://192.168.1.5",
  "file:///etc/passwd","https://cloud.example.com\\@evil.example"])
  assert.equal(isValidCoolifyOrigin(address),false,address);
});
test("Cloud API is read only and operator auth remains enforced",()=>{
 const api=readFileSync(new URL("../../app/api/cloud/route.ts",import.meta.url),"utf8");
 const proxy=readFileSync(new URL("../../proxy.ts",import.meta.url),"utf8");
 assert.match(api,/method:"GET"/);
 assert.doesNotMatch(api,/method:"(POST|PUT|DELETE|PATCH)"/);
 assert.match(api,/no-store/);
 assert.ok(proxy.includes('path==="/api/cloud"&&!operatorAuthConfigured'));
 assert.match(proxy,/machineAuthorized\(request\)/);
 assert.match(proxy,/path==="/motion"/);
});
