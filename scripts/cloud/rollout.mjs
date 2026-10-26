#!/usr/bin/env node
/**
 * Deliberately operator-initiated Coolify staging-only release workflow.
 * Reads the exact application first; opt-in POST queues a new STAGING deploy only.
 * Never changes production, DNS, databases, secrets, or load-balancer traffic.
 */
import {createHash} from 'node:crypto';
import {readFileSync,lstatSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {trustedHttpsOrigin,readPrivateReadToken} from './first-node.mjs';

const ID=/^[A-Za-z0-9_-]{8,128}$/;
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^[A-Za-z0-9_][A-Za-z0-9_./-]{0,99}$/;
const HOST=/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
const PROJECTS={
 vetogram:'margaryanlabs/Telegram-story-bot',
 promptence:'margaryan-labs/ai-revenue-navigator'
};
const KEYS=['schema','product','repository','branch','commit','applicationUuid','stagingOrigin','healthPath','dockerfile','environment'];
function fail(reason){throw Error(reason);}
function origin(raw){
 if(typeof raw!=='string'||raw.includes('\\')||/\s/.test(raw))return null;
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
   u.pathname!=='/'||u.port||!HOST.test(u.hostname)||!u.hostname.includes('.'))return null;
  const labels=u.hostname.split('.');
  if(!labels.includes('staging'))return null;
  return u.origin;
 }catch{return null;}
}
export function validateRollout(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==KEYS.length||
  Object.keys(raw).some(k=>!KEYS.includes(k)))fail('Unexpected rollout document');
 if(raw.schema!=='markarian-staging-rollout/v1'||raw.environment!=='staging'||!Object.hasOwn(PROJECTS,raw.product)||
  raw.repository!==PROJECTS[raw.product])fail('Invalid project or environment');
 if(!ID.test(raw.applicationUuid)||!SHA.test(raw.commit)||
  !BRANCH.test(raw.branch)||raw.branch.includes('..')||raw.branch.includes('//')||raw.branch.endsWith('/'))
  fail('Invalid source identity');
 if(raw.dockerfile!=='Dockerfile.selfhost'||raw.healthPath!=='/api/health'&&raw.healthPath!=='/healthz')
  fail('Expected portable Dockerfile and explicit API readiness path');
 const host=origin(raw.stagingOrigin);
 if(!host||host!==raw.stagingOrigin)fail('Only canonical HTTPS staging hostnames are allowed');
 return Object.freeze({...raw});
}
export function approvalDigest(manifest){
 const m=validateRollout(manifest);
 return createHash('sha256').update(JSON.stringify(m)).digest('hex');
}
function normalizeRepo(raw){
 const s=String(raw||'').trim().replace(/^https:\/\/github\.com\//,'').replace(/\.git$/,'');
 return s;
}
export function checkLiveStagingApp(manifest,raw){
 const m=validateRollout(manifest);
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('Coolify application record unavailable');
 const actual=String(raw.fqdn||'').trim();
 const canonical=origin(actual);
 const dockerfile=String(raw.dockerfile_location||'').replace(/^\/+/,'');
 const settings=raw.settings;
 const checks=[
  ['application-uuid',raw.uuid===m.applicationUuid],
  ['staging-name',typeof raw.name==='string'&&raw.name.endsWith('-staging')],
  ['exact-staging-domain',canonical===m.stagingOrigin&&actual===m.stagingOrigin],
  ['github-repository',normalizeRepo(raw.git_repository)===m.repository],
  ['git-branch',raw.git_branch===m.branch],
  ['commit-is-pinned',raw.git_commit_sha===m.commit],
  ['portable-dockerfile',raw.build_pack==='dockerfile'&&dockerfile===m.dockerfile],
  ['shared-image-registry',typeof raw.docker_registry_image_name==='string'&&raw.docker_registry_image_name.trim().length>0],
  ['readiness-configured',raw.health_check_enabled===true&&raw.health_check_path===m.healthPath],
  ['autodeploy-off',settings?.is_auto_deploy_enabled===false],
 ];
 return {schema:'markarian-staging-app-preflight/v1',
  verdict:checks.every(x=>x[1])?'STAGING_APP_MATCH_REVIEW':'BLOCKED',
  checks:checks.map(([id,pass])=>({id,status:pass?'PASS':'BLOCK'})),
  applicationUuid:m.applicationUuid,sourceSha:m.commit,
  canUseProduction:false,canMigrateDatabase:false,canChangeDNS:false,
  note:'Coolify API configuration, not an attestation of immutable Docker image or app health.'};
}
async function getJson(url,token,fetcher=fetch){
 const res=await fetcher(url,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!res.ok||!res.body?.getReader)fail('Coolify read operation unsuccessful');
 const size=Number(res.headers?.get?.('content-length'));
 if(Number.isFinite(size)&&size>512*1024)fail('Response too large');
 const reader=res.body.getReader(),chunks=[];let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   total+=value.length;if(total>512*1024)fail('Response too large');
   chunks.push(Buffer.from(value));
  }
 }finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{fail('Invalid Coolify JSON response');}
}
export async function observeApplication(manifest,env,fetcher=fetch){
 const m=validateRollout(manifest);
 const base=trustedHttpsOrigin(env.CLOUD_COOLIFY_URL);
 if(!base)fail('Private Coolify HTTPS endpoint required');
 const token=readPrivateReadToken(env.CLOUD_COOLIFY_READ_TOKEN_FILE);
 const response=await getJson(new URL('/api/v1/applications/'+m.applicationUuid,base),token,fetcher);
 return checkLiveStagingApp(m,response);
}
export async function queueStaging(manifest,env,fetcher=fetch){
 const m=validateRollout(manifest);
 if(env.CLOUD_DEPLOY_ENABLE!=='staging-only')fail('Operator staging-only enable flag required');
 if(env.CLOUD_COOLIFY_WRITE_TOKEN_FILE===env.CLOUD_COOLIFY_READ_TOKEN_FILE)
  fail('Separate read and write credential files required');
 const inspected=await observeApplication(m,env,fetcher);
 if(inspected.verdict!=='STAGING_APP_MATCH_REVIEW')fail('Live staging app differs from reviewed source');
 const writeToken=readPrivateReadToken(env.CLOUD_COOLIFY_WRITE_TOKEN_FILE);
 const readToken=readPrivateReadToken(env.CLOUD_COOLIFY_READ_TOKEN_FILE);
 if(writeToken===readToken)fail('Read and write tokens must have separate scopes');
 const base=trustedHttpsOrigin(env.CLOUD_COOLIFY_URL);
 const url=new URL('/api/v1/deploy',base);
 url.searchParams.set('uuid',m.applicationUuid);
 const res=await fetcher(url,{method:'POST',
  headers:{Authorization:'Bearer '+writeToken,Accept:'application/json'},
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});
 if(!res.ok)fail('Coolify refused staging deployment request');
 const data=await res.json();
 const list=data?.deployments;
 if(!Array.isArray(list)||list.length!==1||list[0].resource_uuid!==m.applicationUuid||
  !ID.test(list[0].deployment_uuid||''))fail('Unknown Coolify deployment acknowledgment');
 return {schema:'markarian-staging-rollout/v1',status:'QUEUED_UNVERIFIED',
  applicationUuid:m.applicationUuid,deploymentUuid:list[0].deployment_uuid,
  requestedSourceSha:m.commit,execution:'STAGING_DEPLOY_REQUESTED',
  appHealthVerified:false,imageDigestVerified:false,multiServerHealthy:false,
  productionReady:false,canChangeDNS:false,canMigrateDatabase:false,
  note:'Deployment was queued, NOT verified healthy. Confirm actual SHA, health, all servers and restore separately.'};
}
export async function readRolloutStatus(deploymentUuid,env,fetcher=fetch){
 if(!ID.test(deploymentUuid))fail('Invalid deployment UUID');
 const base=trustedHttpsOrigin(env.CLOUD_COOLIFY_URL);
 if(!base)fail('Private Coolify HTTPS endpoint required');
 const token=readPrivateReadToken(env.CLOUD_COOLIFY_READ_TOKEN_FILE);
 const record=await getJson(new URL('/api/v1/deployments/'+deploymentUuid,base),token,fetcher);
 if(record?.deployment_uuid!==deploymentUuid)fail('Unexpected deployment identity');
 const state=String(record.status||'').slice(0,48);
 const completed=['finished','success'].includes(state.toLowerCase());
 return {schema:'markarian-staging-rollout-status/v1',
  deploymentUuid,status:state||'unknown',
  verdict:completed?'DEPLOYMENT_REPORTED_FINISHED_REVIEW':'NOT_READY',
  appHealthVerified:false,imageDigestVerified:false,multiServerHealthy:false,
  canChangeDNS:false,canMigrateDatabase:false};
}
function readManifest(file){
 if(!file||!isAbsolute(file))fail('Absolute manifest path required');
 const st=lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>65536)fail('Unsafe manifest file');
 return validateRollout(JSON.parse(readFileSync(file,'utf8')));
}
export async function main(args=process.argv.slice(2),env=process.env,fetcher=fetch,out=process.stdout,err=process.stderr){
 const [action,filename,flag,third,...extra]=args;
 if(extra.length||!['--plan','--verify','--start-staging','--status'].includes(action)||
  (action==='--status'?(args.length!==2||!ID.test(filename||'')):
  (!filename||!isAbsolute(filename)||(action==='--start-staging'
   ?flag!=='--approve'||!SHA.test(third||''):args.length!==2)))){
  err.write('Usage: rollout.mjs --plan|--verify /abs/manifest.json | --start-staging /abs/manifest.json --approve SHA256 | --status DEPLOYMENT_UUID\n');
  return 2;
 }
 try{
  if(action==='--status'){
   const status=await readRolloutStatus(filename,env,fetcher);
   out.write(JSON.stringify(status,null,2)+'\n');
   return status.verdict==='NOT_READY'?1:3;
  }
  const m=readManifest(filename);
  const digest=approvalDigest(m);
  if(action==='--plan'){
   out.write(JSON.stringify({schema:m.schema,mode:'PLAN_ONLY',
    product:m.product,sourceSha:m.commit,applicationUuid:m.applicationUuid,
    stagingOrigin:m.stagingOrigin,approvalDigest:digest,
    execution:'none',productionReady:false},null,2)+'\n');
   return 0;
  }
  if(action==='--verify'){
   const report=await observeApplication(m,env,fetcher);
   out.write(JSON.stringify(report,null,2)+'\n');
   return report.verdict==='BLOCKED'?1:3;
  }
  if(third!==digest)fail('Approval digest mismatch');
  const queued=await queueStaging(m,env,fetcher);
  out.write(JSON.stringify(queued,null,2)+'\n');
  return 3;
 }catch{
  err.write('ROLLOUT NOT APPROVED: reviewed staging identity, credentials, API or execution state invalid.\n');
  return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
