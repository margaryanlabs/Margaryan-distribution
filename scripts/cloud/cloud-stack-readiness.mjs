#!/usr/bin/env node
/** Owner-run, read-only stack integration audit. Never merges, deploys or changes CI.
 * Verify source branch ancestry and actual job steps before recommending human review.
 */
import {readFileSync,lstatSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {boundedJson} from './release-evidence.mjs';

export const STACK=Object.freeze([
 {number:92,base:'main',head:'feat/markarian-cloud-v1-20261020'},
 {number:93,base:'feat/markarian-cloud-v1-20261020',head:'feat/markarian-cloud-first-node-gate-20261024'},
 {number:95,base:'feat/markarian-cloud-first-node-gate-20261024',head:'feat/cloud-portfolio-guardian-20261024'},
 {number:96,base:'feat/cloud-portfolio-guardian-20261024',head:'feat/cloud-agent-supervisor-20261024'},
 {number:97,base:'feat/cloud-agent-supervisor-20261024',head:'feat/cloud-decision-specialist-20261024'},
 {number:98,base:'feat/cloud-decision-specialist-20261024',head:'feat/cloud-release-guardian-project-engine-20261024'},
 {number:99,base:'feat/cloud-release-guardian-project-engine-20261024',head:'feat/cloud-release-evidence-staging-20261024'},
 {number:100,base:'feat/cloud-release-evidence-staging-20261024',head:'feat/cloud-stack-validation-20261024'},
 {number:101,base:'feat/cloud-stack-validation-20261024',head:'feat/cloud-stack-readiness-20261024'}
]);
const REPO='margaryanlabs/Margaryan-distribution';
const SHA=/^[0-9a-f]{40}$/;
function err(message){throw Error(message)}
function tokenFromFile(env){
 const file=env.CLOUD_GITHUB_READ_TOKEN_FILE;
 if(!isAbsolute(file||''))err('Absolute private read-only GitHub token file required');
 const st=lstatSync(file);
 if(!st.isFile()||(st.mode&0o077)!==0||st.size>2048||
   (typeof process.getuid==='function'&&st.uid!==process.getuid()))err('Unsafe GitHub token file');
 const token=readFileSync(file,'utf8').trim();
 if(!/^[A-Za-z0-9_]{20,512}$/.test(token))err('Invalid GitHub token');
 return token;
}
export function classifyRun(run,jobs){
 if(!run)return 'NO_RUN';
 if(!SHA.test(run.head_sha||'')||!Number.isSafeInteger(run.id)||run.id<=0)return 'UNKNOWN';
 if(run.status!=='completed')return ['queued','in_progress','waiting','requested','pending'].includes(run.status)?'PENDING':'UNKNOWN';
 if(!Array.isArray(jobs)||jobs.length===0||jobs.length>100)return 'UNKNOWN';
 if(jobs.some(j=>!j||typeof j.name!=='string'||j.status!=='completed'||!Array.isArray(j.steps)))return 'UNKNOWN';
 if(run.conclusion==='failure'&&jobs.every(j=>j.conclusion==='failure'&&j.steps.length===0))
  return 'RUNNER_STARTUP_FAILURE';
 if(run.conclusion==='success'&&jobs.every(j=>j.conclusion==='success'&&j.steps.length>0&&
   j.steps.every(s=>s&&['success','skipped'].includes(s.conclusion))))
  return 'OBSERVED_SUCCESS';
 if(['failure','cancelled','timed_out','action_required'].includes(run.conclusion)||
   jobs.some(j=>j.conclusion==='failure'))return 'JOB_OR_TEST_FAILURE';
 return 'UNKNOWN';
}
export function summarizeStack(observations){
 if(!Array.isArray(observations)||observations.length!==STACK.length)return {state:'UNKNOWN',blocks:['INCOMPLETE_STACK'],canMerge:false,canDeploy:false};
 const blocks=[],rows=[];
 for(let i=0;i<STACK.length;i++){
  const expected=STACK[i],obs=observations[i];
  if(!obs||typeof obs!=='object'||obs.number!==expected.number){
   blocks.push('PR_'+expected.number+'_MISSING');continue;
  }
  const problems=[];
  if(obs.state!=='open'||obs.merged===true)problems.push('NOT_OPEN');
  if(obs.base!==expected.base||obs.head!==expected.head)problems.push('WRONG_BRANCH_CHAIN');
  if(!SHA.test(obs.sha||''))problems.push('UNKNOWN_HEAD_SHA');
  if(obs.draft!==false)problems.push('DRAFT_PENDING_REVIEW');
  if(obs.ci!=='OBSERVED_SUCCESS')problems.push('CI_'+(typeof obs.ci==='string'?obs.ci:'UNKNOWN'));
  rows.push({number:expected.number,head:expected.head,sha:SHA.test(obs.sha||'')?obs.sha:null,
   base:expected.base,draft:obs.draft===true,ci:obs.ci||'UNKNOWN',problems});
  for(const reason of problems)blocks.push('PR_'+expected.number+'_'+reason);
 }
 return {schema:'markarian-cloud-stack-readiness/v1',
  state:blocks.length?'BLOCKED':'HUMAN_REVIEW_REQUIRED',
  checkedPrs:rows.length,totalPrs:STACK.length,rows,blocks,
  note:'No success means automatic merge. Successful evidence still requires independent code review, full build and explicit owner approval.',
  canMerge:false,canDeploy:false,canMigrateProduction:false,canChangeDns:false,canTrade:false};
}
export function chooseRun(runs,sha){
 if(!Array.isArray(runs)||!SHA.test(sha||''))return null;
 const matched=runs.filter(r=>r&&r.head_sha===sha&&Number.isSafeInteger(r.id)&&r.id>0&&
  r.repository?.full_name===REPO&&r.head_repository?.full_name===REPO);
 matched.sort((a,b)=>(Date.parse(b.created_at||'')||0)-(Date.parse(a.created_at||'')||0)||
  (b.run_attempt||0)-(a.run_attempt||0)||b.id-a.id);
 return matched[0]||null;
}
export async function collectStack(env,fetcher=fetch){
 const token=tokenFromFile(env),root='https://api.github.com/repos/'+REPO;
 const get=url=>boundedJson(url,{token,fetcher,limit:524288});
 const evidence=[];
 for(const entry of STACK){
  const raw=await get(root+'/pulls/'+entry.number);
  if(!raw||raw.number!==entry.number)err('Untrusted PR response');
  const sha=raw.head?.sha,base=raw.base?.ref,head=raw.head?.ref;
  let ci='UNKNOWN';
  if(SHA.test(sha||'')){
   const results=await get(root+'/actions/runs?head_sha='+sha+'&per_page=10');
   const run=chooseRun(results?.workflow_runs,sha);
   if(run?.status==='completed'){
    const jobs=await get(root+'/actions/runs/'+run.id+'/jobs?per_page=100');
    ci=classifyRun(run,Array.isArray(jobs?.jobs)&&jobs?.total_count<=100?jobs.jobs:null);
   }else ci=classifyRun(run,null);
  }
  evidence.push({number:entry.number,state:raw.state,merged:raw.merged,draft:raw.draft,base,head,sha,ci});
 }
 return summarizeStack(evidence);
}
export async function main(args=process.argv.slice(2),env=process.env,{fetcher=fetch,out=process.stdout,stderr=process.stderr}={}){
 if(args.length!==1||!['--plan','--audit'].includes(args[0])){
  stderr.write('Usage: cloud-stack-readiness.mjs --plan | --audit\n');return 2;
 }
 if(args[0]==='--plan'){
  out.write(JSON.stringify({repository:REPO,chain:STACK,runMode:'READ_ONLY',productionReady:false},null,2)+'\n');return 0;
 }
 try{
  const report=await collectStack(env,fetcher);
  out.write(JSON.stringify(report,null,2)+'\n');
  return report.state==='HUMAN_REVIEW_REQUIRED'?3:1;
 }catch{
  stderr.write('CLOUD STACK UNKNOWN: could not independently verify private token, GitHub PR chain or CI. No action taken.\n');return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
