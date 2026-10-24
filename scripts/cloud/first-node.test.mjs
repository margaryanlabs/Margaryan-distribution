import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync,chmodSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {trustedHttpsOrigin,readPrivateReadToken,verifyFirstNode,main,PILOT_MARKER} from './first-node.mjs';

const server = 'https://coolify.example.com';
const pilot = 'https://pilot.example.com';
const tokenValue='TEST_READ_ONLY_1234567890123456';
const target = 'testserver0001';
const html=`<!doctype html><meta name="markarian-pilot" content="${PILOT_MARKER}">`;
function tokenFixture(fn) {
  const dir=mkdtempSync(join(tmpdir(),'markarian-first-node-'));
  const tokenFile=join(dir,'token');
  writeFileSync(tokenFile,tokenValue,{mode:0o600});
  return Promise.resolve().then(()=>fn(tokenFile,dir)).finally(()=>rmSync(dir,{force:true,recursive:true}));
}
function fetchMock(servers=[{uuid:target,settings:{is_reachable:true,is_usable:true}}],pilotBody=html) {
  const calls=[];
  const fetcher=async(url,opts)=>{
    calls.push({url:String(url),opts});
    if(String(url).endsWith('/api/v1/servers')) return new Response(JSON.stringify(servers),{status:200,headers:{'content-type':'application/json'}});
    return new Response(pilotBody,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  };
  return {calls,fetcher};
}
test('only plain HTTPS origins, no credentials/redirect target fragments',()=>{
  assert.equal(trustedHttpsOrigin('https://coolify.example.com'),'https://coolify.example.com');
  for (const value of ['http://coolify.example.com','https://user:pass@coolify.example.com','https://coolify.example.com/a',
    'https://coolify.example.com/?token=x','https://coolify.example.com/#x','https://coolify.example.com\\@other.net',
    'https://localhost','https://coolify.example.com.']) assert.equal(trustedHttpsOrigin(value),null,value);
});
test('private token refuses symlinks and permissive files',()=>tokenFixture(async(file,dir)=>{
  assert.equal(readPrivateReadToken(file),tokenValue);
  const link=join(dir,'link');symlinkSync(file,link);
  assert.throws(()=>readPrivateReadToken(link),/private regular file/);
  chmodSync(file,0o644);
  assert.throws(()=>readPrivateReadToken(file),/mode 0600/);
}));
test('valid server and named disposable pilot pass staging-only gate; no secret or production claims',()=>tokenFixture(async(tokenFile)=>{
  const {calls,fetcher}=fetchMock();
  const receipt=await verifyFirstNode({CLOUD_COOLIFY_URL:server,CLOUD_PILOT_URL:pilot,CLOUD_TARGET_SERVER_UUID:target,CLOUD_COOLIFY_READ_TOKEN_FILE:tokenFile},fetcher);
  assert.equal(receipt.gate,'STAGING_PILOT_VERIFIED');
  assert.equal(receipt.productionReady,false);
  assert.equal(receipt.canMigrateProduction,false);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,server+'/api/v1/servers');
  assert.equal(calls[0].opts.headers.Authorization,'Bearer '+tokenValue);
  assert.equal(calls[0].opts.redirect,'error');
  assert.equal(calls[1].url,pilot);
  assert.equal(calls[1].opts.headers.Authorization,undefined);
  assert.doesNotMatch(JSON.stringify(receipt),/TEST_READ_ONLY|coolify.example.com|pilot.example.com/);
}));
test('HTTP 200 without the pilot marker is never counted as verified',()=>tokenFixture(async(tokenFile)=>{
  const {fetcher}=fetchMock(undefined,'<html>Generic welcome page</html>');
  const receipt=await verifyFirstNode({CLOUD_COOLIFY_URL:server,CLOUD_PILOT_URL:pilot,CLOUD_TARGET_SERVER_UUID:target,CLOUD_COOLIFY_READ_TOKEN_FILE:tokenFile},fetcher);
  assert.equal(receipt.gate,'NOT_READY');
  assert.equal(receipt.checks.find(x=>x.id==='pilot-response').status,'FAIL');
}));
test('unknown server state is WAIT, false health is FAIL and empty inventory is WAIT',()=>tokenFixture(async(tokenFile)=>{
  for (const [servers,status] of [[[{uuid:target,settings:{}}],'WAIT'],[[{uuid:target,settings:{is_reachable:false,is_usable:true}}],'FAIL'],[[],'WAIT']]) {
    const {fetcher}=fetchMock(servers);
    const receipt=await verifyFirstNode({CLOUD_COOLIFY_URL:server,CLOUD_PILOT_URL:pilot,CLOUD_TARGET_SERVER_UUID:target,CLOUD_COOLIFY_READ_TOKEN_FILE:tokenFile},fetcher);
    assert.equal(receipt.checks.find(x=>x.id==='coolify-server').status,status);
    assert.equal(receipt.gate,'NOT_READY');
  }
}));
test('missing credentials fail closed without calling protected server API',async()=>{
  const {calls,fetcher}=fetchMock();
  const receipt=await verifyFirstNode({CLOUD_COOLIFY_URL:server,CLOUD_TARGET_SERVER_UUID:target},fetcher);
  assert.equal(receipt.gate,'NOT_READY');
  assert.equal(receipt.checks.find(x=>x.id==='coolify-server').status,'WAIT');
  assert.equal(calls.length,0);
});
test('invalid or failed Coolify response never produces success',()=>tokenFixture(async(tokenFile)=>{
  for (const fetcher of [async()=>{throw Error('test connection error');},async()=>new Response('{}',{status:401}),
    async()=>new Response('{}',{status:200})]) {
    const receipt=await verifyFirstNode({CLOUD_COOLIFY_URL:server,CLOUD_PILOT_URL:pilot,CLOUD_TARGET_SERVER_UUID:target,CLOUD_COOLIFY_READ_TOKEN_FILE:tokenFile},fetcher);
    assert.equal(receipt.gate,'NOT_READY');
  }
}));
test('CLI --plan is no-network; --verify --json produces redacted receipt',()=>tokenFixture(async(tokenFile)=>{
  let calls=0;let output='';let errors='';
  const fake=async(...args)=>{calls++;return fetchMock().fetcher(...args);};
  const out={write:s=>{output+=s;}};const err={write:s=>{errors+=s;}};
  assert.equal(await main(['--plan'],{},fake,out,err),0);
  assert.equal(calls,0);
  output='';
  assert.equal(await main(['--verify','--json'],{CLOUD_COOLIFY_URL:server,CLOUD_PILOT_URL:pilot,CLOUD_TARGET_SERVER_UUID:target,CLOUD_COOLIFY_READ_TOKEN_FILE:tokenFile},fake,out,err),0);
  assert.equal(JSON.parse(output).gate,'STAGING_PILOT_VERIFIED');
  assert.doesNotMatch(output,/TEST_READ_ONLY/);
  assert.equal(await main(['--verify','--raw'],{},fake,out,err),2);
}));

test('disposable pilot compose is read-only, has no host ports and mounts marked identity page',()=>{
  const pilotRoot=new URL('../../deploy/cloud/pilot/',import.meta.url);
  const compose=readFileSync(new URL('compose.yaml',pilotRoot),'utf8');
  const page=readFileSync(new URL('index.html',pilotRoot),'utf8');
  assert.match(compose,/read_only: true/);
  assert.match(compose,/cap_drop:/);
  assert.match(compose,/index\.html:\/usr\/share\/nginx\/html\/index\.html:ro/);
  assert.doesNotMatch(compose,/^\s+ports\s*:/m);
  assert.match(page,/noindex,nofollow/);
  assert.ok(page.includes(PILOT_MARKER));
});