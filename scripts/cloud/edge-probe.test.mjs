import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkEdgeOrigins,probeOrigin,main} from './edge-probe.mjs';
const fixture=JSON.parse(readFileSync(new URL('../../deploy/cloud/edge/staging.example.json',import.meta.url),'utf8'));
const good=async()=>new Response(JSON.stringify({status:'ok'}),{status:200});
test('read-only GET calls exactly each private backend and never sends bearer tokens',async()=>{
 const calls=[];
 const r=await checkEdgeOrigins(fixture,async(url,options)=>{
  calls.push({url,options});
  return good();
 });
 assert.equal(r.verdict,'HTTP_ORIGINS_RESPONDED_REVIEW_ONLY');
 assert.equal(r.origins.length,4);
 assert.equal(calls.length,4);
 for(const call of calls){
  assert.match(call.url,/^http:\/\/10\.77\.0\.[0-9]+:3000\/api\/health$/);
  assert.equal(call.options.method,'GET');
  assert.equal(call.options.redirect,'error');
  assert.equal(call.options.headers.Authorization,undefined);
 }
 for(const key of ['canDeploy','canShiftTraffic','canClaimHa','verifiedSourceSha','verifiedImageDigest','independentZonesVerified'])
  assert.equal(r[key],false);
});
test('one backend fails, the entire fleet health receipt blocks',async()=>{
 const r=await checkEdgeOrigins(fixture,async url=>{
  if(url.includes('10.77.0.22'))return new Response('unhealthy',{status:503});
  return good();
 });
 assert.equal(r.verdict,'ORIGIN_HEALTH_BLOCKED');
 assert.equal(r.origins.filter(x=>x.status==='UNAVAILABLE').length,1);
});
test('timeouts and network exceptions become unavailable, without exception body',async()=>{
 const r=await checkEdgeOrigins(fixture,async url=>{
  if(url.includes('.11:'))throw Error('PRIVATE_API_TOKEN_1234');
  return good();
 });
 assert.equal(r.verdict,'ORIGIN_HEALTH_BLOCKED');
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_API_TOKEN/);
});
test('invalid source is rejected before attempting network access',async()=>{
 const invalid=structuredClone(fixture);
 invalid.services[0].backends[0].ip='169.254.169.254';
 let count=0;
 await assert.rejects(checkEdgeOrigins(invalid,async()=>{count++;return good();}));
 assert.equal(count,0);
});
test('CLI can only verify reviewed absolute staging manifest',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'markarian-edge-health-'));
 const file=join(folder,'edge.json');
 let output='',error='';
 const out={write:s=>(output+=s,true)},err={write:s=>(error+=s,true)};
 try{
  writeFileSync(file,JSON.stringify(fixture));
  assert.equal(await main(['--verify',file],async()=>good(),out,err),3);
  assert.ok(output.includes('HTTP_ORIGINS_RESPONDED_REVIEW_ONLY'));
  output='';
  assert.equal(await main(['--deploy',file],async()=>{throw Error('network');},out,err),2);
  assert.equal(await main(['--verify','../../relative'],async()=>{throw Error('network');},out,err),2);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
