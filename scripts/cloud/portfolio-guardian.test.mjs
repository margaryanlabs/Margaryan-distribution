import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,symlinkSync,chmodSync,rmSync,mkdirSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {OWNERS,CRITICAL,readToken,discoverRepos,classify,auditPortfolio,compareSignals,readState,writeState,main} from "./portfolio-guardian.mjs";

const token="github_pat_TEST_ONLY_READ_123456789012345";
const repo=(name,owner=name.split("/")[0])=>({full_name:name,owner:{login:owner},default_branch:"main",private:true,archived:false,pushed_at:"2026-10-01T00:00:00Z"});
const sample=[repo("margaryanlabs/decision-command"),repo("margaryanlabs/Telegram-story-bot"),repo("margaryan-labs/das-speak-armenia"),repo("other-owner/outsider"),repo("margaryanlabs/impersonator","other-owner")];
function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),"markarian-guardian-")),file=join(root,"token");
 writeFileSync(file,token,{mode:0o600});
 return Promise.resolve().then(()=>fn(root,file)).finally(()=>rmSync(root,{recursive:true,force:true}));
}
function fake({repos=sample,failed=true,unavailable=false,empty=false}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url:String(url),options});
  if(url.pathname==="/user/repos")return Response.json(empty?[]:repos);
  if(url.pathname.endsWith("/actions/runs")){
   if(unavailable)return Response.json({message:"Forbidden"},{status:403});
   return Response.json({workflow_runs:[{status:"completed",conclusion:failed?"failure":"success",
     html_url:"https://github.com/margaryanlabs/decision-command/actions/runs/123"}]});
  }
  if(url.pathname.endsWith("/pulls"))return Response.json([{draft:true},{draft:false}]);
  throw Error("Unexpected API path");
 };
 return {fetcher,calls};
}
test("operator token must not be a symlink or world-readable",()=>fixture((root,file)=>{
 assert.equal(readToken(file),token);
 const alias=join(root,"alias");symlinkSync(file,alias);
 assert.throws(()=>readToken(alias),/private regular/);
 chmodSync(file,0o644);assert.throws(()=>readToken(file),/private regular/);
}));
test("discovers both namespaces; ignores unrelated and spoofed repos",async()=>{
 const {fetcher}=fake(),got=await discoverRepos(token,fetcher);
 assert.deepEqual(got.map(x=>x.full_name).sort(),sample.slice(0,3).map(x=>x.full_name).sort());
 assert.deepEqual(OWNERS,["margaryanlabs","margaryan-labs"]);
 assert.ok(CRITICAL.has("margaryanlabs/decision-command"));
});
test("Decision Command CI failure is critical but not a runtime assertion",()=>{
 const res=classify(repo("margaryanlabs/decision-command"),{workflow_runs:[{status:"completed",conclusion:"failure"}]},[],Date.parse("2026-10-24T00:00:00Z"));
 assert.equal(res.ci,"failure");assert.equal(res.signals[0].severity,"critical");
 assert.equal(res.lastPushDays,23);assert.equal(res.runtimeChecked,false);
});
test("startup_failure is infrastructure CI failure, not a confirmed source compilation defect",()=>{
 const item=classify(repo("margaryanlabs/decision-command"),
  {workflow_runs:[{status:"completed",conclusion:"startup_failure"}]},[]);
 assert.equal(item.ci,"startup_failure");
 assert.equal(item.signals.length,1);
 assert.match(item.signals[0].title,/failed to start/);
 assert.match(item.signals[0].action,/runner/);
 assert.equal(item.runtimeChecked,false);
});
test("unknown and in-progress CI are never classified successful",()=>{
 const item=repo("margaryanlabs/decision-command");
 assert.equal(classify(item,null,null).ci,"unknown");
 assert.equal(classify(item,{workflow_runs:[]},[]).ci,"not_observed");
 assert.equal(classify(item,{workflow_runs:[{status:"in_progress"}]},[]).ci,"pending");
 assert.deepEqual(classify(item,null,null).signals,[]);
});
test("full scan is read-only, scoped to GitHub, redacted and includes three named projects",()=>fixture(async(_root,file)=>{
 const {fetcher,calls}=fake();
 const report=await auditPortfolio({CLOUD_GUARDIAN_GITHUB_TOKEN_FILE:file},fetcher,Date.parse("2026-10-24T00:00:00Z"));
 assert.equal(report.complete,true);assert.equal(report.repositoryCount,3);
 assert.equal(report.criticalRepositories,3);assert.equal(report.ciFailureCount,3);
 assert.equal(report.productionReady,false);assert.equal(report.runtimeChecked,false);
 assert.ok(report.repositories.every(x=>x.openPrSample===2&&x.draftPrSample===1));
 assert.equal(calls.length,7);
 assert.ok(calls.every(x=>x.url.startsWith("https://api.github.com/")&&x.options.method==="GET"&&x.options.redirect==="error"));
 assert.ok(calls.every(x=>x.options.headers.Authorization==="Bearer "+token));
 assert.doesNotMatch(JSON.stringify(report),/TEST_ONLY_READ/);
}));
test("partial Actions failure is degraded and does not imply successful builds",()=>fixture(async(_root,file)=>{
 const {fetcher}=fake({unavailable:true});
 const report=await auditPortfolio({CLOUD_GUARDIAN_GITHUB_TOKEN_FILE:file},fetcher);
 assert.equal(report.complete,false);assert.equal(report.unknownSources,3);
 assert.ok(report.repositories.every(x=>x.ci==="unknown"));
}));
test("diff never infers resolution on incomplete observations",()=>{
 const old=[{id:"ci:repo",severity:"high",title:"CI failed"}];
 assert.equal(compareSignals(old,[],false).resolved.length,0);
 assert.equal(compareSignals(old,[],true).resolved.length,1);
 assert.equal(compareSignals(old,[{...old[0],severity:"critical"}],true).changed.length,1);
});
test("state writes atomically to private directory and rejects linked state",()=>fixture((root,_file)=>{
 const dir=join(root,"private");mkdirSync(dir,{mode:0o700});
 const state=join(dir,"state.json");writeState(state,[{id:"ci:repo",severity:"high"}],"2026-10-24T00:00:00Z");
 assert.equal(readState(state)[0].id,"ci:repo");
 assert.equal(JSON.parse(readFileSync(state,"utf8")).version,1);
 const alias=join(dir,"alias");symlinkSync(state,alias);assert.throws(()=>readState(alias),/private regular/);
}));
test("plan requires neither secrets nor network and invalid CLI is refused",async()=>{
 let calls=0,output="",error="";
 const out={write:s=>{output+=s}},err={write:s=>{error+=s}};
 const fetcher=async()=>{calls++;throw Error("no network on --plan");};
 assert.equal(await main(["--plan"],{},fetcher,out,err),0);
 assert.equal(calls,0);assert.match(output,/Read-only GitHub audit/);
 assert.equal(await main(["--deploy"],{},fetcher,out,err),2);
});
test("no token and empty authenticated inventory fail closed",()=>fixture(async(_root,file)=>{
 await assert.rejects(auditPortfolio({},async()=>{throw Error("No fetch")}),/absolute path/);
 const {fetcher}=fake({empty:true});
 await assert.rejects(auditPortfolio({CLOUD_GUARDIAN_GITHUB_TOKEN_FILE:file},fetcher),/No repositories/);
}));
