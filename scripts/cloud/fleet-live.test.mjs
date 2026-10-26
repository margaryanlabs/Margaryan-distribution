import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {validateBindings,reconcileFleet,fetchCoolifyServers,main} from './fleet-live.mjs';
const manifest=JSON.parse(readFileSync(new URL('../../deploy/cloud/fleet/staging.example.json',import.meta.url),'utf8'));
const bindings={
 version:1,nodes:manifest.nodes.map((n,i)=>({nodeId:n.id,serverUuid:'coolify_server_'+(i+1)}))
};
const servers=bindings.nodes.map(n=>({
 uuid:n.serverUuid,settings:{is_reachable:true,is_usable:true},
 ip:'PRIVATE_IP_NOT_FOR_OUTPUT',private_key:'PRIVATE_KEY_NOT_FOR_OUTPUT'
}));
const body=x=>new Response(JSON.stringify(x),{status:200,headers:{'content-type':'application/json'}});
test('four actual Coolify nodes match planned identity and operator-only health, not HA proof',()=>{
 const x=reconcileFleet(manifest,bindings,servers);
 assert.equal(x.verdict,'LIVE_INVENTORY_MATCHED_REVIEW_ONLY');
 assert.equal(x.checks.length,4);
 assert.ok(x.checks.every(t=>t.status==='MATCH'));
 for(const key of ['canClaimHa','canDeploy','canMigrateProduction','canChangeDNS','databaseReplicationVerified'])
  assert.equal(x[key],false);
 assert.doesNotMatch(JSON.stringify(x),/PRIVATE_IP|PRIVATE_KEY|coolify_server_/);
});
test('unavailable or unusable node blocks despite satisfying theoretical capacity',()=>{
 const down=structuredClone(servers);down[1].settings.is_reachable=false;
 const r=reconcileFleet(manifest,bindings,down);
 assert.equal(r.verdict,'NOT_READY');
 assert.equal(r.checks.filter(x=>x.status==='NOT_READY').length,1);
 const unusable=structuredClone(servers);unusable[2].settings.is_usable=false;
 assert.equal(reconcileFleet(manifest,bindings,unusable).verdict,'NOT_READY');
});
test('binding rejects duplicate UUIDs and unexpected node keys',()=>{
 const repeated=structuredClone(bindings);repeated.nodes[1].serverUuid=repeated.nodes[0].serverUuid;
 assert.throws(()=>validateBindings(manifest,repeated),/Invalid or duplicate/);
 const missing=structuredClone(bindings);missing.nodes[0].nodeId='impostor-node';
 assert.throws(()=>validateBindings(manifest,missing),/Unbound/);
 const injected=structuredClone(bindings);injected.nodes[0].token='SECRET';
 assert.throws(()=>validateBindings(manifest,injected),/Invalid or duplicate/);
});
test('Coolify inventory may not contain duplicate matching UUIDs',()=>{
 assert.throws(()=>reconcileFleet(manifest,bindings,[...servers,servers[0]]),/Duplicate/);
});
test('only HTTPS Coolify fixed GET with no redirects or token leakage',async()=>{
 const token='PRIVATE_READ_ONLY_TOKEN';
 let calls=0;
 const fake=async(url,config)=>{
  calls++;
  assert.equal(url.toString(),'https://cloud.example.com/api/v1/servers');
  assert.equal(config.method,'GET');
  assert.equal(config.headers.Authorization,'Bearer '+token);
  assert.equal(config.redirect,'error');
  assert.equal(config.cache,'no-store');
  return body(servers);
 };
 const results=await fetchCoolifyServers('https://cloud.example.com',token,fake);
 assert.equal(calls,1);assert.equal(results.length,4);
 await assert.rejects(fetchCoolifyServers('http://evil.example.com',token,async()=>{throw Error('called');}));
});
test('refuse oversized responses and unexpected upstream status',async()=>{
 const token='PRIVATE_READ_ONLY_TOKEN';
 await assert.rejects(fetchCoolifyServers('https://cloud.example.com',token,
  async()=>new Response('a',{status:200,headers:{'content-length':'2097152'}})),/too large/);
 await assert.rejects(fetchCoolifyServers('https://cloud.example.com',token,
  async()=>new Response('secret token', {status:403})),/unavailable/);
});
test('operator-only private binding and read token, real verified GET with fake provider',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-fleet-inventory-'));
 let stdout='',stderr='';
 const out={write:s=>(stdout+=s,true)},err={write:s=>(stderr+=s,true)};
 try{
  const fleet=join(dir,'fleet.json'),binding=join(dir,'bindings.json'),token=join(dir,'token');
  writeFileSync(fleet,JSON.stringify(manifest));
  writeFileSync(binding,JSON.stringify(bindings),{mode:0o600});
  writeFileSync(token,'PRIVATE_READ_ONLY_TOKEN',{mode:0o600});
  const env={CLOUD_COOLIFY_URL:'https://cloud.example.com',
   CLOUD_COOLIFY_READ_TOKEN_FILE:token};
  const fake=async()=>body(servers);
  assert.equal(await main(['--verify',fleet,'--bindings',binding],env,fake,out,err),3);
  assert.ok(stdout.includes('LIVE_INVENTORY_MATCHED_REVIEW_ONLY'));
  assert.doesNotMatch(stdout,/PRIVATE_READ_ONLY_TOKEN|PRIVATE_IP/);
  chmodSync(binding,0o644);
  stdout='';
  assert.equal(await main(['--verify',fleet,'--bindings',binding],env,fake,out,err),1);
  assert.equal(stdout,'');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('plan-only mode uses no network or credentials',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'markarian-fleet-plan-'));
 const file=join(dir,'manifest.json');writeFileSync(file,JSON.stringify(manifest));
 let messages='';
 const out={write:s=>(messages+=s,true)},err={write:()=>true};
 try{
  assert.equal(await main(['--plan',file],{},async()=>{throw Error('network attempted')},out,err),0);
  assert.ok(messages.includes('PLAN_ONLY'));
  assert.equal(await main(['--deploy',file],{},undefined,out,err),2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
