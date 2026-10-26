import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {planFleet,validateFleet,main} from './fleet-plan.mjs';
const node=(id,zone,pools=['apps','ops','vetogram-data','promptence-data'])=>({
 id,zone,pools,cpu:16,memoryMiB:32768,diskGiB:300,
 reservedCpu:2,reservedMemoryMiB:4096,reservedDiskGiB:30,online:true
});
const app=(id,pool='apps',replicas=2)=>({
 id,pool,kind:'stateless',replicas,cpu:2,memoryMiB:2048,diskGiB:2,
 requireZoneSpread:true,publicIngress:true
});
const db=(id,pool)=>({
 id,pool,kind:'stateful',replicas:1,cpu:4,memoryMiB:8192,diskGiB:100,
 requireZoneSpread:false,publicIngress:false
});
const healthy=()=>({
 version:1,nodes:[node('apps-a','az-a',['apps','ops']),node('apps-b','az-b',['apps','ops']),
 node('vetogram-data-a','az-a',['vetogram-data']),node('promptence-data-b','az-b',['promptence-data'])],
 services:[app('vetogram-api'),app('promptence-api'),
 db('vetogram-postgres','vetogram-data'),db('promptence-supabase','promptence-data')]
});
test('places two web replicas in distinct zones and isolates data planes',()=>{
 const r=planFleet(healthy());
 assert.equal(r.verdict,'STAGING_PLACEMENT_REVIEW');
 assert.equal(r.unplaced.length,0);
 for(const name of ['vetogram-api','promptence-api'])
  assert.equal(new Set(r.placements.filter(x=>x.service===name).map(x=>x.zone)).size,2);
 assert.notEqual(r.placements.find(x=>x.service==='vetogram-postgres').node,
  r.placements.find(x=>x.service==='promptence-supabase').node);
 assert.ok(r.warnings.some(x=>x.includes('STATEFUL_SINGLE_PRIMARY')));
 assert.equal(r.canDeploy,false);
});
test('does not silently claim HA when all web servers share one zone',()=>{
 const q=healthy();q.nodes[1].zone='az-a';
 const r=planFleet(q);
 assert.equal(r.verdict,'NEEDS_INFRASTRUCTURE_WORK');
 assert.ok(r.warnings.some(x=>x.includes('HA_NOT_PROVEN:vetogram-api')));
});
test('insufficient resources report the individual unplaced replica',()=>{
 const q=healthy();q.nodes[1].online=false;
 const r=planFleet(q);
 assert.ok(r.unplaced.length>=2);
 assert.equal(r.verdict,'NEEDS_INFRASTRUCTURE_WORK');
});
test('no arbitrary financial caps or server count limits',()=>{
 const q=healthy();
 for(let i=0;i<70;i++)q.nodes.push(node('app-extra-'+i,'az-'+(i+3),['apps']));
 const r=planFleet(q);
 assert.equal(r.nodes.length,74);
 assert.equal(r.verdict,'STAGING_PLACEMENT_REVIEW');
});
test('host capacities never become negative',()=>{
 const q=healthy();const r=planFleet(q);
 for(const host of r.nodes)for(const value of Object.values(host.free))assert.ok(value>=0);
});
test('invalid configuration, secrets and fake stateful HA blocked',()=>{
 const q=healthy();
 for(const mutation of [
  o=>{o.nodes[0].id=o.nodes[1].id;},
  o=>{o.services[2].replicas=2;},
  o=>{o.services[2].publicIngress=true;},
  o=>{o.services[0].replicas=0;},
  o=>{o.nodes[0].reservedCpu=o.nodes[0].cpu;},
  o=>{o.nodes[0].secret='unsafe';}
 ]){
  const x=structuredClone(q);mutation(x);assert.throws(()=>validateFleet(x));
 }
});
test('read-only CLI returns review-required instead of deploy authorization',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'markarian-fleet-'));
 const file=join(tmp,'fleet.json');
 const stdout=process.stdout.write,stderr=process.stderr.write;
 let observed='';
 process.stdout.write=v=>{observed+=v;return true;};
 process.stderr.write=()=>true;
 try{
  writeFileSync(file,JSON.stringify(healthy()));
  assert.equal(main(['--plan',file]),3);
  assert.match(observed,/"canProvision": false/);
  assert.equal(main(['--deploy',file]),2);
 }finally{process.stdout.write=stdout;process.stderr.write=stderr;rmSync(tmp,{recursive:true,force:true});}
});
