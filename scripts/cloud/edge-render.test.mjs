import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {isPrivateIpv4,validateEdgeConfig,renderHaproxy,edgePlan,main} from './edge-render.mjs';
const example=JSON.parse(readFileSync(new URL('../../deploy/cloud/edge/staging.example.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(example);

test('two staging products generate isolated listeners and health-aware origin pools',()=>{
 const text=renderHaproxy(example);
 assert.match(text,/frontend fe_vetogram\n  bind :8081\n  default_backend be_vetogram/);
 assert.match(text,/frontend fe_promptence\n  bind :8082\n  default_backend be_promptence/);
 assert.match(text,/backend be_vetogram\n  balance leastconn\n  option httpchk GET \/api\/health\n  http-check expect status 200/);
 assert.match(text,/server vetogram_a 10\.77\.0\.11:3000 check/);
 assert.match(text,/server promptence_b 10\.77\.0\.22:3000 check/);
 assert.doesNotMatch(text,/0\.0\.0\.0:5432|bind :443|use_backend.*if.*prod/);
});
test('private RFC1918 only: public, metadata, local, multicast and malformed rejected',()=>{
 for(const ip of ['10.77.0.11','172.16.4.1','172.31.255.21','192.168.1.2'])
  assert.equal(isPrivateIpv4(ip),true,ip);
 for(const ip of ['8.8.8.8','169.254.169.254','127.0.0.1','::1','0.0.0.0','1.2.3.4',
  '10.77.0.0','10.77.0.255','172.32.1.1','192.167.1.2',
  '10.077.0.11','10.77.0.11;rm -rf /','10.77.0.999'])
  assert.equal(isPrivateIpv4(ip),false,ip);
});
test('no production, direct public ingress, missing source SHA or extra fields',()=>{
 for(const patch of [
  {environment:'production'}, {tlsTermination:'none'}, {publishHostPorts:true},
  {schema:'evil'}, {unknown:'unexpected'}]){
  assert.throws(()=>validateEdgeConfig({...clone(),...patch}));
 }
 const broken=clone();broken.services[0].expectedSourceSha='main';
 assert.throws(()=>validateEdgeConfig(broken));
});
test('rejects single backend, single-zone false redundancy and duplicate IDs',()=>{
 const one=clone();one.services[0].backends.pop();
 assert.throws(()=>validateEdgeConfig(one));
 const sameZone=clone();sameZone.services[0].backends[1].zone='zone-a';
 assert.throws(()=>validateEdgeConfig(sameZone));
 const duplicate=clone();duplicate.services[0].backends[1].id='vetogram-a';
 assert.throws(()=>validateEdgeConfig(duplicate));
});
test('cross-product origin collision and duplicate listen port fail',()=>{
 const same=clone();same.services[1].backends[0].ip=same.services[0].backends[0].ip;
 assert.throws(()=>validateEdgeConfig(same));
 const port=clone();port.services[1].listenPort=8081;
 assert.throws(()=>validateEdgeConfig(port));
});
test('configuration is deterministic under unordered inputs',()=>{
 const copy=clone();copy.services.reverse();
 copy.services[0].backends.reverse();copy.services[1].backends.reverse();
 assert.equal(renderHaproxy(copy),renderHaproxy(example));
});
test('only review-only capacity result: cannot claim runtime health, network or HA',()=>{
 const plan=edgePlan(example);
 assert.equal(plan.listeners.length,2);
 for(const key of ['zoneLabelsIndependentlyVerified','actualOriginHealthVerified','edgeHaVerified',
  'databaseHaVerified','canPublishPublicPort','canDeploy','canChangeDNS'])
  assert.equal(plan[key],false,key);
});
test('Compose is internal only and never publishes host ports or secret ingress',()=>{
 const c=readFileSync(new URL('../../deploy/cloud/edge/compose.yaml',import.meta.url),'utf8');
 assert.match(c,/external: true/);
 assert.match(c,/cap_drop: \[ALL\]/);
 assert.match(c,/read_only: true/);
 assert.match(c,/no-new-privileges:true/);
 assert.doesNotMatch(c,/^\s*ports:|privileged:\s*true|network_mode:\s*host/m);
 assert.match(c,/haproxy", "-c"/);
});
test('CLI render and plan never invoke Docker or deployment',()=>{
 const folder=mkdtempSync(join(tmpdir(),'markarian-edge-'));
 const file=join(folder,'manifest.json');
 const out=process.stdout.write,err=process.stderr.write;
 let captured='';
 process.stdout.write=s=>(captured+=s,true);process.stderr.write=()=>true;
 try{
  writeFileSync(file,JSON.stringify(example));
  assert.equal(main(['--plan',file]),0);
  assert.match(captured,/"canDeploy": false/);
  captured='';
  assert.equal(main(['--render',file]),0);
  assert.match(captured,/backend be_vetogram/);
  assert.equal(main(['--deploy',file]),2);
 }finally{process.stdout.write=out;process.stderr.write=err;rmSync(folder,{recursive:true,force:true});}
});
test('oversized, missing and symlinked input cannot emit a config',()=>{
 const folder=mkdtempSync(join(tmpdir(),'markarian-edge-input-'));
 const file=join(folder,'bad.json');
 const out=process.stdout.write,err=process.stderr.write;
 let captured='';process.stdout.write=s=>(captured+=s,true);process.stderr.write=()=>true;
 try{
  writeFileSync(file,'x'.repeat(262145));
  assert.equal(main(['--render',file]),1);
  assert.equal(captured,'');
  assert.equal(main(['--render',join(folder,'missing.json')]),1);
 }finally{process.stdout.write=out;process.stderr.write=err;rmSync(folder,{recursive:true,force:true});}
});
