#!/usr/bin/env node
/** SHA-bound, read-only release evidence. A matching CI/marker never authorizes deploy. */
import {readFileSync,lstatSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {isIP} from 'node:net';
import {pathToFileURL} from 'node:url';
import {blueprint} from './release-guardian.mjs';
const SHA=/^[a-f0-9]{40}$/;
const WORKFLOW=/^[A-Za-z0-9_-]{1,64}\.ya?ml$/;
function refuse(msg){throw Error(msg)}
export function requestReview(input){
 if(!input||typeof input!=='object'||Array.isArray(input))refuse('Invalid release request');
 if(Object.keys(input).some(k=>!['project','repository','commit','workflowFile','previousCommit'].includes(k)))refuse('Unexpected input field');
 const p=blueprint(input.project);
 if(input.repository!==p.repository||!SHA.test(input.commit||''))refuse('Unrecognized project repository or SHA');
 if(!WORKFLOW.test(input.workflowFile||''))refuse('Explicit reviewed workflow filename required');
 if(input.previousCommit!==undefined&&(!SHA.test(input.previousCommit)||input.previousCommit===input.commit))refuse('Invalid rollback SHA');
 return {project:p.id,repository:p.repository,commit:input.commit,workflowFile:input.workflowFile,previousCommit:input.previousCommit||null};
}
function readToken(file){
 if(!file||!isAbsolute(file))refuse('Absolute operator token path required');
 const s=lstatSync(file);
 if(!s.isFile()||(s.mode&0o077)!==0||s.size>2048||
   (typeof process.getuid==='function'&&s.uid!==process.getuid()))refuse('Unsafe GitHub token file');
 const token=readFileSync(file,'utf8').trim();
 if(!/^[A-Za-z0-9_]{20,512}$/.test(token))refuse('Invalid read-only token');
 return token;
}
export function stagingOrigin(raw){
 if(typeof raw!=='string'||/[\s\\]/.test(raw))return null;
 try{
  const u=new URL(raw),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||
    (u.port&&u.port!=='443')||isIP(host)||!host.includes('.')||
    ['localhost','local','internal','test','invalid','example'].some(x=>host===x||host.endsWith('.'+x))||
    host.endsWith('.example.com'))return null;
  return u.origin;
 }catch{return null}
}
export async function boundedJson(url,{token,fetcher=fetch,limit=524288}={}){
 const headers={Accept:'application/json','User-Agent':'Margaryan-Release-Evidence'};
 if(token)headers.Authorization='Bearer '+token;
 const res=await fetcher(url,{method:'GET',headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!res?.ok||!res.body?.getReader)refuse('Evidence source unavailable');
 const length=Number(res.headers?.get?.('content-length'));
 if(Number.isFinite(length)&&length>limit)refuse('Evidence response too large');
 const reader=res.body.getReader();const decoder=new TextDecoder();let count=0,body='';
 try{
  for(;;){
   const chunk=await reader.read();if(chunk.done)break;
   count+=chunk.value.length;if(count>limit)refuse('Evidence response too large');
   body+=decoder.decode(chunk.value,{stream:true});
  }body+=decoder.decode();
 }finally{reader.releaseLock()}
 try{return JSON.parse(body)}catch{refuse('Invalid JSON evidence')}
}
export function checkWorkflow(body,request){
 if(!body||!Array.isArray(body.workflow_runs)||body.workflow_runs.length>5)refuse('Invalid workflow run collection');
 const path='.github/workflows/'+request.workflowFile+'@';
 const candidates=body.workflow_runs.filter(r=>r&&r.head_sha===request.commit&&
   r.repository?.full_name===request.repository&&r.head_repository?.full_name===request.repository&&
   typeof r.path==='string'&&r.path.startsWith(path)&&Number.isSafeInteger(r.id)&&r.id>0);
 candidates.sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0)||
   (b.run_attempt||0)-(a.run_attempt||0)||b.id-a.id);
 const last=candidates[0];
 return {status:!last?'NOT_OBSERVED':last.status==='completed'&&last.conclusion==='success'?'SUCCESS':
   last.status==='completed'?'FAILED_OR_INCOMPLETE':'PENDING',
  run:last?'https://github.com/'+request.repository+'/actions/runs/'+last.id:null,
  workflow:request.workflowFile,headSha:last?.head_sha||null,
  note:'Only the selected workflow is observed; unrelated required tests and artifact identity remain unverified.'};
}
export async function githubProof(request,env,fetcher=fetch){
 const token=readToken(env.CLOUD_RELEASE_GITHUB_TOKEN_FILE);
 const root='https://api.github.com/repos/'+request.repository;
 const commit=await boundedJson(root+'/commits/'+request.commit,{token,fetcher});
 if(commit?.sha!==request.commit)refuse('Commit identity mismatch');
 const runs=await boundedJson(root+'/actions/workflows/'+request.workflowFile+'/runs?head_sha='+request.commit+'&per_page=5',{token,fetcher});
 return {source:{status:'OBSERVED',sha:request.commit,url:'https://github.com/'+request.repository+'/commit/'+request.commit},
  ci:checkWorkflow(runs,request)};
}
export function markerStatus(marker,request){
 return marker&&typeof marker==='object'&&!Array.isArray(marker)&&
  marker.schema==='markarian-staging-release/v1'&&marker.environment==='staging'&&
  marker.project===request.project&&marker.repository===request.repository&&marker.commit===request.commit?'MATCH':'MISMATCH';
}
export async function stagingProof(request,env,fetcher=fetch){
 const origin=stagingOrigin(env.CLOUD_RELEASE_STAGING_ORIGIN);
 if(!origin)return {status:'NOT_CONFIGURED',marker:'UNKNOWN',health:'UNKNOWN'};
 try{
  const marker=await boundedJson(origin+'/.well-known/markarian-release.json',{fetcher,limit:4096});
  const identity=markerStatus(marker,request);
  if(identity!=='MATCH')return {status:'BLOCKED',marker:identity,health:'UNKNOWN'};
  const healthPath=env.CLOUD_RELEASE_STAGING_HEALTH_PATH||'/healthz';
  if(!['/healthz','/api/health'].includes(healthPath))return {status:'BLOCKED',marker:identity,health:'INVALID_CONFIG'};
  const health=await boundedJson(origin+healthPath,{fetcher,limit:4096});
  const ok=health?.status==='ok'||health?.status==='ready'||(healthPath==='/api/health'&&health?.ok===true);
  return {status:ok?'OBSERVED':'BLOCKED',marker:identity,health:ok?'RESPONDED_OK':'FAILED',
   note:'Both endpoints are self-reported by a configured staging host; no independent build, data or security attestation.'};
 }catch{return {status:'UNAVAILABLE',marker:'UNKNOWN',health:'UNKNOWN'}}
}
export function rollbackPlan(request){
 return {state:'NOT_EXECUTED',previousCommit:request.previousCommit,candidateCommit:request.commit,
  steps:request.previousCommit?[
   'Preserve current staging logs and exact artifact identity before intervention.',
   'Verify database backward compatibility, offsite backups and a completed isolated restore drill.',
   'Independently verify the previous artifact digest and its prior staging health.',
   'Get explicit owner approval; revert only the staging app using a reviewed separate operator action.',
   'Recheck former commit, health, integrations and recovery evidence. Record outcome.'
  ]:['No previous release SHA supplied: rollback is not executable.'],
  automatic:false,changesDns:false,changesDatabase:false,deploys:false};
}
export async function evaluateRelease(input,env={},fetcher=fetch){
 const request=requestReview(input);
 const github=await githubProof(request,env,fetcher);
 const staging=await stagingProof(request,env,fetcher);
 const signals={source:github.source.status,selectedCI:github.ci.status,staging:staging.status,previousCommit:request.previousCommit?'DECLARED':'UNKNOWN'};
 const observations=signals.source==='OBSERVED'&&signals.selectedCI==='SUCCESS'&&
   signals.staging==='OBSERVED'&&signals.previousCommit==='DECLARED';
 return {schema:'markarian-release-evidence/v1',request,github,staging,signals,
  verdict:observations?'OBSERVATIONS_FOR_HUMAN_REVIEW':'BLOCKED',
  rollback:rollbackPlan(request),productionReady:false,mayDeploy:false,mayRollback:false,mayTrade:false};
}
export async function main(args=process.argv.slice(2),env=process.env,{fetcher=fetch,out=process.stdout,err=process.stderr}={}){
 const [mode,file,...extra]=args;
 if(extra.length||!['--plan','--verify'].includes(mode)||(mode==='--verify'&&!file)||(mode==='--plan'&&file)){
  err.write('Usage: release-evidence.mjs --plan | --verify /absolute/private/release.json\n');return 2;
 }
 if(mode==='--plan'){
  out.write('Read-only GitHub commit+selected CI and optional staging marker+health. Never deploys or authorizes release. Set CLOUD_RELEASE_GITHUB_TOKEN_FILE and optionally CLOUD_RELEASE_STAGING_ORIGIN.\n');return 0;
 }
 try{
  if(!isAbsolute(file))refuse('Absolute manifest path required');
  const stat=lstatSync(file);
  if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size>8192||
     (typeof process.getuid==='function'&&stat.uid!==process.getuid()))refuse('Unsafe private manifest');
  const data=JSON.parse(readFileSync(file,'utf8'));
  const result=await evaluateRelease(data,env,fetcher);
  out.write(JSON.stringify(result,null,2)+'\n');
  return result.verdict==='BLOCKED'?1:3; // Observations require human approval
 }catch{
  err.write('RELEASE EVIDENCE NOT VERIFIED: check private inputs, GitHub and staging sources. No write actions.\n');return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
