import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,chmodSync,readFileSync,statSync,rmSync,symlinkSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {compareSignals,pollCoolify,storeState,readState,main} from "./sentinel.mjs";
import {healthSignals} from "../../lib/cloud/health-signals.ts";
const a={id:"app:1",title:"Service unhealthy",area:"deploy",severity:"critical"};
const b={id:"server:2",title:"Node issue",area:"compute",severity:"warning"};
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),"markarian-sentinel-"));
 const token=join(dir,"token");
 writeFileSync(token,"ONLY_FAKE_READ_ONLY_TOKEN_ABCDEF012345",{mode:0o600});
 return {dir,token,env:{CLOUD_COOLIFY_URL:"https://ops.example.invalid",CLOUD_SENTINEL_TOKEN_FILE:token}};
}
test("Plan needs no credentials, does not call a source and does not deploy",()=>{
 const r=spawnSync(process.execPath,["--experimental-strip-types",fileURLToPath(new URL("./sentinel.mjs",import.meta.url)),"--plan"],{encoding:"utf8",timeout:10000});
 assert.equal(r.status,0,r.stderr);
 assert.match(r.stdout,/No scheduler/);
 assert.doesNotMatch(r.stdout,/ONLY_FAKE/);
});
test("Transitions deduplicate repeated issues and never falsely resolve incomplete polls",()=>{
 assert.equal(compareSignals([], [a,b], true).new.length,2);
 assert.equal(compareSignals([a],[a],true).new.length,0);
 assert.equal(compareSignals([a],[],true).resolved.length,1);
 assert.equal(compareSignals([a],[],false).resolved.length,0);
});
test("State is chmod 600 and refuses unsafe directory mode and symlinks",()=>{
 const {dir}=fixture();
 try{
  const path=join(dir,"state.json");storeState(path,[a]);
  assert.equal(statSync(path).mode&0o077,0);
  assert.deepEqual(readState(path).map(x=>x.id),["app:1"]);
  const link=join(dir,"state-link");symlinkSync(path,link);
  assert.throws(()=>readState(link),/private regular file/);
  chmodSync(dir,0o755);
  assert.throws(()=>readState(path),/private/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Polls only fixed three GET paths and never returns raw secrets",async()=>{
 const {dir,env}=fixture();
 try{
  const paths=[];
  const fake=async(url,options)=>{
   paths.push(url.pathname);
   assert.equal(options.method,"GET");
   assert.equal(options.cache,"no-store");
   assert.equal(options.headers.Authorization,"Bearer ONLY_FAKE_READ_ONLY_TOKEN_ABCDEF012345");
   if(url.pathname.endsWith("/applications"))
    return new Response(JSON.stringify([{uuid:"app-1",name:"Promptence",status:"unhealthy",secret:"DONT_SHOW_ME"}]),{status:200});
   if(url.pathname.endsWith("/servers"))
    return new Response(JSON.stringify([{uuid:"server-1",name:"server",settings:{is_reachable:true,is_usable:true}}]),{status:200});
   return new Response(JSON.stringify([]),{status:200});
  };
  const result=await pollCoolify(env,fake);
  assert.equal(result.complete,true);
  assert.equal(result.applicationIssues,1);
  assert.equal(result.runningApplications,0);
  assert.deepEqual(paths.sort(),["/api/v1/applications","/api/v1/deployments","/api/v1/servers"].sort());
  assert.doesNotMatch(JSON.stringify(result),/ONLY_FAKE|DONT_SHOW_ME/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Partial provider outage never overwrites previous incidents",async()=>{
 const {dir,env}=fixture();
 try{
  const state=join(dir,"state.json");storeState(state,[a]);
  const fake=async url=>url.pathname.endsWith("/applications")?
   new Response("down",{status:503}):new Response(JSON.stringify([]),{status:200});
  const result=await main(["--diff",state],env,fake);
  assert.equal(result,1);
  assert.deepEqual(readState(state).map(x=>x.id),["app:1"]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Origin and token permission checks refuse network access",async()=>{
 const {dir,env,token}=fixture();
 try{
  let calls=0;
  const fake=async()=>{calls++;throw Error("Should not call");};
  await assert.rejects(pollCoolify({...env,CLOUD_COOLIFY_URL:"http://untrusted.example"},fake),/Trusted Coolify/);
  assert.equal(calls,0);
  chmodSync(token,0o644);
  await assert.rejects(pollCoolify(env,fake),/private regular file/);
  assert.equal(calls,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Historical failed deployments do not produce current incident alerts",()=>{
 const now=Date.parse("2026-10-21T12:00:00Z");
 const row=at=>({uuid:at,applicationName:"Demo",status:"failed",createdAt:at,commit:"",serverName:""});
 const base={mode:"connected",applications:[],servers:[],projects:[],errors:[],
  sources:{applications:true,servers:true,deployments:true,projects:true},
  deployments:[row("2026-08-05T12:00:00Z"),row("2026-10-21T11:00:00Z"),row("not-a-date")]};
 const signals=healthSignals(base,now).signals.filter(x=>x.id.startsWith("deploy:"));
 assert.equal(signals.length,1);
 assert.ok(signals[0].id.includes("2026-10-21T11:00:00Z"));
});
