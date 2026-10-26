import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {matchReleaseMarker,boundedMarker,verifyEdgeRelease,main} from './edge-release.mjs';

const fixture=JSON.parse(readFileSync(new URL('../../deploy/cloud/edge/staging.example.json',import.meta.url),'utf8'));
const response=(value,status=200,headers={'content-type':'application/json'})=>
 new Response(JSON.stringify(value),{status,headers});
const marker=service=>({
 schema:'markarian-app-release/v1',
 environment:'staging',product:service.id,
 repository:service.id==='vetogram'?'margaryanlabs/Telegram-story-bot':'margaryan-labs/ai-revenue-navigator',
 commit:service.expectedSourceSha
});
function fake({badOrigin='',badType='',mismatch=false,failHealth=false}={}){
 return async(url,options)=>{
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  assert.equal(options.cache,'no-store');
  assert.equal(options.headers.Authorization,undefined);
  assert.match(url,/^http:\/\/10\.77\.0\.[0-9]+:3000\/api\/(?:health|markarian-release)$/);
  if(url.endsWith('/api/health')){
   if(failHealth&&url.includes(badOrigin))return response({status:'unavailable'},503);
   return response({ok:true});
  }
  const service=url.includes('.11:')||url.includes('.12:')?fixture.services[0]:fixture.services[1];
  const m=marker(service);
  if(mismatch&&url.includes(badOrigin))m.commit='c'.repeat(40);
  return response(m,200,{'content-type':url.includes(badType)?'text/html':'application/json'});
 };
}
test('all four healthy staged origins have matching self-reported source identity',async()=>{
 const out=await verifyEdgeRelease(fixture,fake());
 assert.equal(out.verdict,'SOURCE_LABELS_MATCH_REVIEW_ONLY');
 assert.equal(out.origins.length,4);
 assert.ok(out.origins.every(v=>v.source==='DECLARED_SHA_MATCH'&&v.health==='HTTP_200'));
 for(const prop of ['liveImageDigestAttested','artifactRegistryVerified','providerZoneSeparationVerified',
  'dbReadinessVerified','multiEdgeAvailabilityVerified','mayDeploy','maySwitchTraffic','productionReady'])
  assert.equal(out[prop],false,prop);
});
test('different commit on any one backend blocks the release',async()=>{
 const out=await verifyEdgeRelease(fixture,fake({badOrigin:'.22:',mismatch:true}));
 assert.equal(out.verdict,'BLOCKED');
 assert.equal(out.origins.filter(x=>x.source==='MISMATCH_OR_UNAVAILABLE').length,1);
});
test('HTTP 503 blocks and no independent identity claim is made',async()=>{
 const out=await verifyEdgeRelease(fixture,fake({badOrigin:'.11:',failHealth:true}));
 assert.equal(out.verdict,'BLOCKED');
 assert.equal(out.origins.find(x=>x.backend==='vetogram-a').health,'FAILED');
});
test('HTML content-type is rejected even when JSON body can parse',async()=>{
 const out=await verifyEdgeRelease(fixture,fake({badType:'.21:'}));
 assert.equal(out.verdict,'BLOCKED');
});
test('untrusted/ambiguous marker data is refused',()=>{
 const svc=fixture.services[0];
 for(const bad of [{...marker(svc),environment:'production'},
  {...marker(svc),repository:'impostor/vetogram'},
  {...marker(svc),commit:'b'.repeat(40)},
  {...marker(svc),schema:'something-else'},null,{},'token'])
  assert.equal(matchReleaseMarker(svc,bad),false);
 assert.equal(matchReleaseMarker(svc,marker(svc)),true);
});
test('large body or declared large size is rejected without emitting private data',async()=>{
 const big=response({secret:'TOKEN_PRIVATE_'+('x'.repeat(5000))});
 assert.equal(await boundedMarker(big),null);
 const oversized=response(marker(fixture.services[0]),200,{'content-type':'application/json','content-length':'8193'});
 assert.equal(await boundedMarker(oversized),null);
});
test('network errors fail closed without exposing their messages',async()=>{
 const out=await verifyEdgeRelease(fixture,async()=>{throw Error('PRIVATE_NETWORK_PASSWORD');});
 assert.equal(out.verdict,'BLOCKED');
 assert.doesNotMatch(JSON.stringify(out),/PRIVATE_NETWORK_PASSWORD/);
});
test('incorrect or dangerous manifest cannot provoke network requests',async()=>{
 const edited=structuredClone(fixture);edited.services[0].backends[0].ip='169.254.169.254';
 let calls=0;
 await assert.rejects(verifyEdgeRelease(edited,async()=>{calls++;return response({});}));
 assert.equal(calls,0);
});
test('CLI is verify-only and returns review state rather than automatic approval',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'edge-release-'));
 const path=join(folder,'manifest.json');
 const out={messages:'',write(v){this.messages+=v;return true;}};
 const err={messages:'',write(v){this.messages+=v;return true;}};
 try{
  writeFileSync(path,JSON.stringify(fixture));
  assert.equal(await main(['--verify',path],fake(),out,err),3);
  assert.ok(out.messages.includes('SOURCE_LABELS_MATCH_REVIEW_ONLY'));
  out.messages='';
  assert.equal(await main(['--deploy',path],fake(),out,err),2);
  assert.equal(out.messages,'');
 }finally{rmSync(folder,{recursive:true,force:true});}
});
