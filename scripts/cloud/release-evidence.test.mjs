import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requestReview,stagingOrigin,boundedJson,checkWorkflow,githubProof,markerStatus,stagingProof,rollbackPlan,evaluateRelease,main} from './release-evidence.mjs';
const SHA='a'.repeat(40),OLD='b'.repeat(40);
const input={project:'margaryan-cloud',repository:'margaryanlabs/Margaryan-distribution',commit:SHA,previousCommit:OLD,workflowFile:'ci.yml'};
const request=requestReview(input);
const marker={schema:'markarian-staging-release/v1',environment:'staging',project:input.project,repository:input.repository,commit:SHA};
function withToken(run){
 const dir=mkdtempSync(join(tmpdir(),'mc-release-evidence-')),token=join(dir,'token');
 writeFileSync(token,'github_pat_TESTED_TOKEN_123456789012345678',{mode:0o600});
 return Promise.resolve().then(()=>run({dir,token,env:{CLOUD_RELEASE_GITHUB_TOKEN_FILE:token,CLOUD_RELEASE_STAGING_ORIGIN:'https://stage.margaryan.cloud'}})).finally(()=>rmSync(dir,{recursive:true,force:true}));
}
function fake({ci='success',sha=SHA,markerValue=marker,health={status:'ok'},commitValue=SHA}={}){
 const calls=[];
 async function fetcher(url,options){
  const path=new URL(url).pathname;calls.push({url:String(url),options});
  if(path.includes('/commits/'))return Response.json({sha:commitValue});
  if(path.includes('/actions/workflows/'))return Response.json({workflow_runs:ci==='missing'?[]:[{
   id:501,head_sha:sha,path:'.github/workflows/ci.yml@main',created_at:'2026-10-24T12:00:00Z',status:'completed',conclusion:ci,run_attempt:1
  }]});
  if(path==='/\.well-known/markarian-release.json')throw Error('unreachable'); // exact path checked below
  if(path==='/.well-known/markarian-release.json')return Response.json(markerValue);
  if(path==='/healthz'||path==='/api/health')return Response.json(health);
  throw Error('Unexpected URL '+String(url));
 }
 return {fetcher,calls};
}
test('release identity must be registered and GitHub SHA exact',()=>{
 assert.equal(request.project,'margaryan-cloud');
 assert.throws(()=>requestReview({...input,repository:'evil/repo'}));
 assert.throws(()=>requestReview({...input,commit:'main'}));
 assert.throws(()=>requestReview({...input,workflowFile:'../ci.yml'}));
 assert.throws(()=>requestReview({...input,previousCommit:SHA}));
 assert.throws(()=>requestReview({...input,CLOUD_COOLIFY_WRITE_TOKEN_FILE:'secret'}));
});
test('staging target must be an operator-configured HTTPS origin, not localhost or private literal IP',()=>{
 assert.equal(stagingOrigin('https://stage.margaryan.cloud'),'https://stage.margaryan.cloud');
 for(const url of ['http://stage.margaryan.cloud','https://127.0.0.1','https://localhost','https://example.com',
  'https://abc.internal','https://user:pass@stage.margaryan.cloud','https://stage.margaryan.cloud/path',
  'https://stage.margaryan.cloud?token=x','https://[::1]']){
  assert.equal(stagingOrigin(url),null,url);
 }
});
test('workflow SHA and exact workflow path are mandatory',()=>{
 const fakeRun={id:5,head_sha:SHA,path:'.github/workflows/ci.yml@main',created_at:'2026-10-24T14:00:00Z',status:'completed',conclusion:'success'};
 assert.equal(checkWorkflow({workflow_runs:[fakeRun]},request).status,'SUCCESS');
 assert.equal(checkWorkflow({workflow_runs:[{...fakeRun,head_sha:OLD}]},request).status,'NOT_OBSERVED');
 assert.equal(checkWorkflow({workflow_runs:[{...fakeRun,path:'.github/workflows/other.yml@main'}]},request).status,'NOT_OBSERVED');
 assert.equal(checkWorkflow({workflow_runs:[{...fakeRun,status:'queued',conclusion:null}]},request).status,'PENDING');
});
test('newer failure on same SHA prevents stale success from being considered green',()=>{
 const ok={id:1,head_sha:SHA,path:'.github/workflows/ci.yml@main',created_at:'2026-10-24T12:00:00Z',status:'completed',conclusion:'success'};
 const bad={...ok,id:2,created_at:'2026-10-24T13:00:00Z',conclusion:'failure'};
 assert.equal(checkWorkflow({workflow_runs:[ok,bad]},request).status,'FAILED_OR_INCOMPLETE');
});
test('source commit and workflow require two exact readonly GitHub URLs',()=>withToken(async({env})=>{
 const {fetcher,calls}=fake();
 const result=await githubProof(request,env,fetcher);
 assert.equal(result.ci.status,'SUCCESS');assert.equal(result.source.sha,SHA);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>x.url.startsWith('https://api.github.com/repos/margaryanlabs/Margaryan-distribution/')));
 assert.ok(calls.every(x=>x.options.method==='GET'&&x.options.redirect==='error'));
 assert.doesNotMatch(JSON.stringify(result),/TESTED_TOKEN/);
}));
test('GitHub commit mismatch fails even with a successful workflow',()=>withToken(async({env})=>{
 const {fetcher}=fake({commitValue:OLD});
 await assert.rejects(githubProof(request,env,fetcher),/Commit identity mismatch/);
}));
test('staging checks both SHA marker and independent health endpoint, never claims artifact verification',async()=>{
 const {fetcher,calls}=fake();
 const result=await stagingProof(request,{CLOUD_RELEASE_STAGING_ORIGIN:'https://stage.margaryan.cloud'},fetcher);
 assert.equal(result.status,'OBSERVED');assert.equal(result.marker,'MATCH');
 assert.equal(calls.length,2);
 assert.ok(result.note.includes('self-reported'));
});
test('staging cannot pass with a wrong SHA, failed health, or absent trusted origin',async()=>{
 const mismatch=fake({markerValue:{...marker,commit:OLD}});
 assert.equal((await stagingProof(request,{CLOUD_RELEASE_STAGING_ORIGIN:'https://stage.margaryan.cloud'},mismatch.fetcher)).status,'BLOCKED');
 const bad=fake({health:{status:'error'}});
 assert.equal((await stagingProof(request,{CLOUD_RELEASE_STAGING_ORIGIN:'https://stage.margaryan.cloud'},bad.fetcher)).status,'BLOCKED');
 assert.equal((await stagingProof(request,{},bad.fetcher)).status,'NOT_CONFIGURED');
 assert.equal(bad.calls.length,2);
});
test('a completed GitHub+staging observation still only enters human review, never deploy',()=>withToken(async({env})=>{
 const {fetcher,calls}=fake();
 const report=await evaluateRelease(input,env,fetcher);
 assert.equal(report.verdict,'OBSERVATIONS_FOR_HUMAN_REVIEW');
 assert.equal(report.mayDeploy,false);assert.equal(report.mayTrade,false);assert.equal(report.mayRollback,false);
 assert.equal(report.rollback.state,'NOT_EXECUTED');assert.equal(calls.length,4);
}));
test('CI unavailable prevents release observations from passing',()=>withToken(async({env})=>{
 const {fetcher}=fake({ci:'missing'});
 const result=await evaluateRelease(input,env,fetcher);
 assert.equal(result.verdict,'BLOCKED');assert.equal(result.signals.selectedCI,'NOT_OBSERVED');
}));
test('rollback report is explicit manual plan and cannot touch production',()=>{
 const result=rollbackPlan(request);
 assert.equal(result.state,'NOT_EXECUTED');assert.equal(result.automatic,false);
 assert.equal(result.changesDatabase,false);assert.equal(result.changesDns,false);
 assert.equal(rollbackPlan({...request,previousCommit:null}).steps.length,1);
});
test('private GitHub token symlinks are rejected before network',()=>withToken(async({dir,token,env})=>{
 const link=join(dir,'token-link');symlinkSync(token,link);
 let network=0;
 await assert.rejects(githubProof(request,{...env,CLOUD_RELEASE_GITHUB_TOKEN_FILE:link},async()=>{network++;throw Error('called');}));
 assert.equal(network,0);
 chmodSync(token,0o644);
 await assert.rejects(githubProof(request,env,async()=>{network++;throw Error('called');}));
 assert.equal(network,0);
}));
test('CLI plan requires no secrets or network and invalid commands are refused',async()=>{
 let output='',errors='';
 const deps={out:{write:s=>output+=s},err:{write:s=>errors+=s},fetcher:async()=>{throw Error('should not fetch')}};
 assert.equal(await main(['--plan'],{},deps),0);
 assert.match(output,/Read-only GitHub/);
 assert.equal(await main(['--deploy'],{},deps),2);
});
test('CLI verify with full successful observed evidence still exits nonzero, no false permission',()=>withToken(async({dir,env})=>{
 const file=join(dir,'manifest.json');writeFileSync(file,JSON.stringify(input),{mode:0o600});
 let output='',errors='';const {fetcher}=fake();
 const status=await main(['--verify',file],env,{fetcher,out:{write:s=>output+=s},err:{write:s=>errors+=s}});
 assert.equal(status,3);
 assert.equal(JSON.parse(output).mayDeploy,false);
 chmodSync(file,0o644);
 assert.equal(await main(['--verify',file],env,{fetcher,out:{write:()=>{}},err:{write:()=>{}}}),1);
}));
