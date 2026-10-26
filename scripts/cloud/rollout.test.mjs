import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validateRollout,approvalDigest,checkLiveStagingApp,queueStaging,
 observeApplication,readRolloutStatus,main} from './rollout.mjs';
const sha='a'.repeat(40);
const example=()=>({
 schema:'markarian-staging-rollout/v1',product:'vetogram',
 repository:'margaryanlabs/Telegram-story-bot',branch:'feat/vetogram-selfhost-origin-20261026',
 commit:sha,applicationUuid:'coolify_app_staging_01',
 stagingOrigin:'https://staging.vetogram.example.org',
 dockerfile:'Dockerfile.selfhost',healthPath:'/api/health',environment:'staging'
});
const app=()=>({
 uuid:'coolify_app_staging_01',name:'vetogram-staging',
 fqdn:'https://staging.vetogram.example.org',
 git_repository:'margaryanlabs/Telegram-story-bot',
 git_branch:'feat/vetogram-selfhost-origin-20261026',
 git_commit_sha:sha,build_pack:'dockerfile',
 dockerfile_location:'/Dockerfile.selfhost',docker_registry_image_name:'margaryan/vetogram',health_check_enabled:true,
 health_check_path:'/api/health',settings:{is_auto_deploy_enabled:false},
 token:'DO_NOT_LEAK',private_key:'DO_NOT_LEAK'
});
const reply=(obj,status=200)=>new Response(JSON.stringify(obj),
 {status,headers:{'content-type':'application/json'}});
test('valid staging manifest with exact repo, SHA and staging HTTPS',()=>{
 const m=validateRollout(example());
 assert.equal(m.product,'vetogram');
 assert.equal(approvalDigest(m).length,64);
 assert.equal(approvalDigest(m),approvalDigest(m));
});
test('blocks production domains, non HTTPS, malformed commit and unknown product',()=>{
 for(const patch of [
  {stagingOrigin:'https://vetogram.example.org'},
  {stagingOrigin:'http://staging.vetogram.example.org'},
  {stagingOrigin:'https://staging.vetogram.example.org/a'},
  {stagingOrigin:'https://user@staging.vetogram.example.org'},
  {stagingOrigin:'https://staging.vetogram.example.org:8443'},
  {environment:'production'}, {commit:'main'}, {product:'random'}, {dockerfile:'Dockerfile'},
  {healthPath:'/'},{branch:'main//hack'}, {secret:'unexpected'}
 ])assert.throws(()=>validateRollout({...example(),...patch}));
});
test('exact live staging app passes metadata review, never authorizes prod',()=>{
 const report=checkLiveStagingApp(example(),app());
 assert.equal(report.verdict,'STAGING_APP_MATCH_REVIEW');
 assert.ok(report.checks.every(x=>x.status==='PASS'));
 assert.equal(report.canChangeDNS,false);
 assert.doesNotMatch(JSON.stringify(report),/DO_NOT_LEAK|PRIVATE_KEY/);
});
test('wrong commit, automatic deploy, unhealthy readiness config block',()=>{
 for(const patch of [
  {git_commit_sha:'b'.repeat(40)}, {fqdn:'https://vetogram.example.org'},
  {name:'vetogram-production'}, {build_pack:'dockercompose'},
  {health_check_enabled:false}, {settings:{is_auto_deploy_enabled:true}},
  {dockerfile_location:'/Dockerfile'},
  {docker_registry_image_name:''},
  {git_repository:'somebody/Telegram-story-bot'}
 ]){
  const r=checkLiveStagingApp(example(),{...app(),...patch});
  assert.equal(r.verdict,'BLOCKED');
 }
});
test('only verified staging GET then single POST queues deployment',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'markarian-staging-rollout-'));
 try{
  const read=join(folder,'read'),write=join(folder,'write');
  writeFileSync(read,'COOLIFY_READ_ONLY_TOKEN',{mode:0o600});
  writeFileSync(write,'COOLIFY_WRITE_ONLY_TOKEN',{mode:0o600});
  const env={CLOUD_COOLIFY_URL:'https://coolify.example.org',
   CLOUD_COOLIFY_READ_TOKEN_FILE:read,CLOUD_COOLIFY_WRITE_TOKEN_FILE:write,
   CLOUD_DEPLOY_ENABLE:'staging-only'};
  const calls=[];
  const fake=async(url,opts)=>{
   calls.push({path:url.pathname,search:url.search,method:opts.method,authorization:opts.headers.Authorization,
    redirect:opts.redirect,cache:opts.cache});
   if(opts.method==='GET')return reply(app());
   assert.equal(opts.method,'POST');
   return reply({deployments:[{resource_uuid:example().applicationUuid,deployment_uuid:'deployment_123456'}]});
  };
  const result=await queueStaging(example(),env,fake);
  assert.equal(result.status,'QUEUED_UNVERIFIED');
  assert.equal(result.productionReady,false);
  assert.equal(result.canChangeDNS,false);
  assert.deepEqual(calls.map(x=>x.method),['GET','POST']);
  assert.equal(calls[1].path,'/api/v1/deploy');
  assert.equal(calls[1].search,'?uuid=coolify_app_staging_01');
  assert.equal(calls[0].authorization,'Bearer COOLIFY_READ_ONLY_TOKEN');
  assert.equal(calls[1].authorization,'Bearer COOLIFY_WRITE_ONLY_TOKEN');
  assert.ok(calls.every(x=>x.redirect==='error'));
 }finally{rmSync(folder,{recursive:true,force:true});}
});
test('mismatched commit blocks ALL write requests before POST',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'markarian-staging-block-'));
 try{
  const read=join(folder,'read'),write=join(folder,'write');
  writeFileSync(read,'COOLIFY_READ_ONLY_TOKEN',{mode:0o600});
  writeFileSync(write,'COOLIFY_WRITE_ONLY_TOKEN',{mode:0o600});
  const env={CLOUD_COOLIFY_URL:'https://coolify.example.org',
   CLOUD_COOLIFY_READ_TOKEN_FILE:read,CLOUD_COOLIFY_WRITE_TOKEN_FILE:write,
   CLOUD_DEPLOY_ENABLE:'staging-only'};
  const calls=[];
  await assert.rejects(queueStaging(example(),env,async(url,opts)=>{
   calls.push(opts.method);
   return reply({...app(),git_commit_sha:'b'.repeat(40)});
  }),/differs from reviewed source/);
  assert.deepEqual(calls,['GET']);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
test('observe and status are GET only; finished does not prove healthy',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-release-status-'));
 try{
  const read=join(dir,'read');writeFileSync(read,'COOLIFY_READ_ONLY_TOKEN',{mode:0o600});
  const env={CLOUD_COOLIFY_URL:'https://coolify.example.org',CLOUD_COOLIFY_READ_TOKEN_FILE:read};
  const x=await observeApplication(example(),env,async()=>reply(app()));
  assert.equal(x.verdict,'STAGING_APP_MATCH_REVIEW');
  const status=await readRolloutStatus('deployment_123456',env,async(url,opts)=>{
   assert.equal(url.pathname,'/api/v1/deployments/deployment_123456');
   assert.equal(opts.method,'GET');
   return reply({deployment_uuid:'deployment_123456',status:'finished',logs:'PRIVATE_DATA'});
  });
  assert.equal(status.verdict,'DEPLOYMENT_REPORTED_FINISHED_REVIEW');
  assert.equal(status.appHealthVerified,false);
  assert.doesNotMatch(JSON.stringify(status),/PRIVATE_DATA/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('CLI plan needs no token or network and start requires digest',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-cli-'));
 try{
  const filename=join(dir,'manifest.json');
  writeFileSync(filename,JSON.stringify(example()));
  let output='',errors='';
  const out={write:s=>(output+=s,true)},err={write:s=>(errors+=s,true)};
  assert.equal(await main(['--plan',filename],{},async()=>{throw Error('network called')},out,err),0);
  assert.ok(output.includes(approvalDigest(example())));
  output='';
  assert.equal(await main(['--start-staging',filename,'--approve','b'.repeat(64)],{},async()=>{throw Error('network called')},out,err),1);
  assert.equal(output,'');
  assert.equal(await main(['--start-staging',filename,'--approve',approvalDigest(example())],{},async()=>{throw Error('network called')},out,err),1);
  assert.equal(await main(['--execute-production',filename],{},undefined,out,err),2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('private tokens, failed API and unsafe input cannot trigger mutation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-credential-'));
 try{
  const read=join(dir,'read'),write=join(dir,'write');
  writeFileSync(read,'COOLIFY_READ_ONLY_TOKEN',{mode:0o600});
  writeFileSync(write,'COOLIFY_WRITE_ONLY_TOKEN',{mode:0o600});
  const env={CLOUD_COOLIFY_URL:'https://coolify.example.org',
   CLOUD_COOLIFY_READ_TOKEN_FILE:read,CLOUD_COOLIFY_WRITE_TOKEN_FILE:write,
   CLOUD_DEPLOY_ENABLE:'staging-only'};
  chmodSync(read,0o644);
  await assert.rejects(queueStaging(example(),env,async()=>reply(app())),/private regular file/);
  chmodSync(read,0o600);
  env.CLOUD_DEPLOY_ENABLE='false';
  await assert.rejects(queueStaging(example(),env,async()=>{throw Error('network called')}),/enable flag/);
  env.CLOUD_DEPLOY_ENABLE='staging-only';
  env.CLOUD_COOLIFY_WRITE_TOKEN_FILE=read;
  await assert.rejects(queueStaging(example(),env,async()=>{throw Error('network called')}),/Separate read and write/);
  env.CLOUD_COOLIFY_WRITE_TOKEN_FILE=write;
  writeFileSync(write,'COOLIFY_READ_ONLY_TOKEN');
  await assert.rejects(queueStaging(example(),env,async()=>reply(app())),/separate scopes/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
