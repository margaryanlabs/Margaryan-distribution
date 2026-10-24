import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {STACK,chooseRun,classifyRun,summarizeStack,collectStack,main} from './cloud-stack-readiness.mjs';
const SHA='a'.repeat(40);
const SHA2='b'.repeat(40);
const REPO='margaryanlabs/Margaryan-distribution';
const baseRun={id:42,head_sha:SHA,repository:{full_name:REPO},head_repository:{full_name:REPO},
 created_at:'2026-10-24T12:00:00Z',run_attempt:1,status:'completed',conclusion:'success'};
const job=(name,conclusion='success',steps=[{name:'Check',conclusion:'success'}])=>({name,conclusion,status:'completed',steps});
const passedJobs=[job('cloud-safety'),job('web-build')];
const records=()=>STACK.map(entry=>({number:entry.number,head:entry.head,base:entry.base,sha:SHA,state:'open',
 draft:false,merged:false,ci:'OBSERVED_SUCCESS'}));
test('chain includes root PR #92 and current #101 in required order',()=>{
 assert.deepEqual(STACK.map(x=>x.number),[92,93,95,96,97,98,99,100,101]);
 assert.equal(STACK[0].base,'main');
 for(let i=1;i<STACK.length;i++)assert.equal(STACK[i].base,STACK[i-1].head);
});
test('missing PR evidence cannot become green',()=>{
 const r=summarizeStack(records().slice(0,-1));
 assert.equal(r.state,'UNKNOWN');assert.equal(r.canMerge,false);
});
test('every open, non-draft, CI-observed PR still needs human review',()=>{
 const r=summarizeStack(records());
 assert.equal(r.state,'HUMAN_REVIEW_REQUIRED');assert.equal(r.canMerge,false);
 assert.equal(r.canMigrateProduction,false);assert.equal(r.totalPrs,9);
});
test('draft status, wrong base, repository mismatch and failed CI block the chain',()=>{
 const base=records();
 base[2].draft=true;base[3].base='main';base[4].ci='RUNNER_STARTUP_FAILURE';
 const r=summarizeStack(base);
 assert.equal(r.state,'BLOCKED');
 assert.ok(r.blocks.includes('PR_95_DRAFT_PENDING_REVIEW'));
 assert.ok(r.blocks.includes('PR_96_WRONG_BRANCH_CHAIN'));
 assert.ok(r.blocks.includes('PR_97_CI_RUNNER_STARTUP_FAILURE'));
});
test('wrong PR number or untrusted SHA always blocks',()=>{
 const x=records();x[0].number=500;x[1].sha='main';
 const r=summarizeStack(x);
 assert.equal(r.state,'BLOCKED');
 assert.ok(r.blocks.includes('PR_92_MISSING'));
 assert.ok(r.blocks.includes('PR_93_UNKNOWN_HEAD_SHA'));
});
test('runner with no executed steps is differentiated from failed source tests',()=>{
 assert.equal(classifyRun({...baseRun,conclusion:'failure'},[
  job('cloud-safety','failure',[]),job('web-build','failure',[])]),'RUNNER_STARTUP_FAILURE');
 assert.equal(classifyRun({...baseRun,conclusion:'failure'},[
  job('cloud-safety','failure',[{name:'node --test',conclusion:'failure'}]),job('web-build','failure',[])]),'JOB_OR_TEST_FAILURE');
});
test('job status and executed steps required for observed CI success',()=>{
 assert.equal(classifyRun(baseRun,passedJobs),'OBSERVED_SUCCESS');
 assert.equal(classifyRun(baseRun,[]),'UNKNOWN');
 assert.equal(classifyRun(baseRun,[job('cloud-safety','success',[])]),'UNKNOWN');
 assert.equal(classifyRun({...baseRun,status:'queued',conclusion:null},null),'PENDING');
});
test('CI run selection binds exact SHA and canonical repo, never trusts fork',()=>{
 assert.equal(chooseRun([{...baseRun,head_sha:SHA2}],SHA),null);
 assert.equal(chooseRun([{...baseRun,head_repository:{full_name:'unknown/fork'}}],SHA),null);
 const older={...baseRun,id:40,created_at:'2026-10-24T10:00:00Z'};
 assert.equal(chooseRun([older,baseRun],SHA).id,42);
});
function operator(run){
 const directory=mkdtempSync(join(tmpdir(),'mc-stack-readiness-'));
 const token=join(directory,'token');
 writeFileSync(token,'github_pat_MOCK_ONLY_READ_1234567890123456',{mode:0o600});
 return Promise.resolve().then(()=>run({directory,token,env:{CLOUD_GITHUB_READ_TOKEN_FILE:token}}))
   .finally(()=>rmSync(directory,{recursive:true,force:true}));
}
function network({runConclusion='success',steps=passedJobs}={}){
 const urls=[];
 async function fetcher(raw,options){
  const path=new URL(String(raw)).pathname;
  urls.push({url:String(raw),method:options.method,redirect:options.redirect});
  const pull=path.match(/\/pulls\/(\d+)$/);
  if(pull){const id=Number(pull[1]),record=STACK.find(x=>x.number===id);
   return Response.json({number:id,state:'open',draft:false,merged:false,base:{ref:record.base},head:{ref:record.head,sha:SHA}});
  }
  if(path.endsWith('/actions/runs')){
   return Response.json({workflow_runs:[{...baseRun,conclusion:runConclusion}]});
  }
  if(path.match(/\/actions\/runs\/42\/jobs$/)){
   return Response.json({total_count:2,jobs:steps});
  }
  throw Error('Unexpected read-only request');
 }
 return {fetcher,urls};
}
test('real read-only fetch pipeline refuses to greenlight stack without approval',()=>operator(async({env})=>{
 const {fetcher,urls}=network();
 const report=await collectStack(env,fetcher);
 assert.equal(report.state,'HUMAN_REVIEW_REQUIRED');
 assert.equal(report.canMerge,false);assert.equal(urls.length,STACK.length*3);
 assert.ok(urls.every(x=>x.url.startsWith('https://api.github.com/repos/'+REPO+'/')&&x.method==='GET'&&x.redirect==='error'));
}));
test('network evidence of a job failure blocks all releases',()=>operator(async({env})=>{
 const {fetcher}=network({runConclusion:'failure',steps:[job('cloud-safety','failure',[]),job('web-build','failure',[])]});
 const r=await collectStack(env,fetcher);
 assert.equal(r.state,'BLOCKED');
 assert.ok(r.rows.every(x=>x.ci==='RUNNER_STARTUP_FAILURE'));
}));
test('symlinked or world-readable token files block before any network request',()=>operator(async({directory,token,env})=>{
 const alias=join(directory,'alias');symlinkSync(token,alias);
 let count=0,fetcher=async()=>{count++;throw Error('Unexpected network')};
 await assert.rejects(collectStack({...env,CLOUD_GITHUB_READ_TOKEN_FILE:alias},fetcher));
 chmodSync(token,0o644);await assert.rejects(collectStack(env,fetcher));assert.equal(count,0);
}));
test('CLI audit stays nonzero on complete evidence, --plan never invokes network',()=>operator(async({env})=>{
 const {fetcher}=network();
 let out='',stderr='';
 const io={fetcher,out:{write:s=>out+=s},stderr:{write:s=>stderr+=s}};
 assert.equal(await main(['--plan'],{},io),0);
 assert.match(out,/productionReady/);
 out='';
 assert.equal(await main(['--audit'],env,io),3);
 assert.equal(JSON.parse(out).canMerge,false);
 assert.equal(await main(['--merge'],env,io),2);
}));
