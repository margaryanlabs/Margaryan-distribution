#!/usr/bin/env node
/**
 * Markarian Cloud Fleet topology planner.
 * This is executable placement logic, not an infrastructure provisioner.
 * No price caps, provider coupling, accounts, SSH or production mutations.
 */
import {readFileSync,lstatSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

const SLUG=/^[a-z][a-z0-9-]{0,63}$/;
const NODE_KEYS=['id','zone','pools','cpu','memoryMiB','diskGiB','reservedCpu','reservedMemoryMiB','reservedDiskGiB','online'];
const SERVICE_KEYS=['id','pool','kind','replicas','cpu','memoryMiB','diskGiB','requireZoneSpread','publicIngress'];
const ROOT_KEYS=['version','nodes','services'];
const safeInt=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
function exactKeys(obj,keys){
 return obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(obj,k));
}
function fail(message){throw Error(message);}
export function validateFleet(config){
 if(!exactKeys(config,ROOT_KEYS)||config.version!==1||!Array.isArray(config.nodes)||!Array.isArray(config.services))
  fail('Expected version 1 fleet with nodes and services');
 if(!config.nodes.length||!config.services.length)fail('Empty fleet or workload list');
 const nodes=new Set(),services=new Set();
 for(const n of config.nodes){
  if(!exactKeys(n,NODE_KEYS)||!SLUG.test(n.id)||!SLUG.test(n.zone)||nodes.has(n.id)||
   !Array.isArray(n.pools)||!n.pools.length||n.pools.some(p=>typeof p!=='string'||!SLUG.test(p))||
   new Set(n.pools).size!==n.pools.length||typeof n.online!=='boolean'||
   !safeInt(n.cpu,1)||!safeInt(n.memoryMiB,512)||!safeInt(n.diskGiB,1)||
   !safeInt(n.reservedCpu)||!safeInt(n.reservedMemoryMiB)||!safeInt(n.reservedDiskGiB)||
   n.reservedCpu>=n.cpu||n.reservedMemoryMiB>=n.memoryMiB||n.reservedDiskGiB>=n.diskGiB)
   fail('Invalid node configuration');
  nodes.add(n.id);
 }
 for(const s of config.services){
  if(!exactKeys(s,SERVICE_KEYS)||!SLUG.test(s.id)||services.has(s.id)||!SLUG.test(s.pool)||
   !['stateless','stateful'].includes(s.kind)||!safeInt(s.replicas,1)||
   !safeInt(s.cpu,1)||!safeInt(s.memoryMiB,128)||!safeInt(s.diskGiB)||
   typeof s.requireZoneSpread!=='boolean'||typeof s.publicIngress!=='boolean'||
   (s.kind==='stateful'&&(s.replicas!==1||s.requireZoneSpread||s.publicIngress))||
   (s.requireZoneSpread&&(s.kind!=='stateless'||s.replicas<2)))
   fail('Invalid service configuration: stateful data needs explicit replication/failover machinery');
  services.add(s.id);
 }
 return config;
}
export function planFleet(raw){
 const config=validateFleet(raw);
 const nodes=config.nodes.map(n=>({
  id:n.id,zone:n.zone,pools:n.pools,online:n.online,
  total:{cpu:n.cpu-n.reservedCpu,memoryMiB:n.memoryMiB-n.reservedMemoryMiB,diskGiB:n.diskGiB-n.reservedDiskGiB},
  free:{cpu:n.cpu-n.reservedCpu,memoryMiB:n.memoryMiB-n.reservedMemoryMiB,diskGiB:n.diskGiB-n.reservedDiskGiB},
 }));
 const placements=[],unplaced=[],warnings=[];
 // Stateful services place first, preserving dedicated disk and memory.
 const services=[...config.services].sort((a,b)=>(a.kind==='stateful'?0:1)-(b.kind==='stateful'?0:1)||b.memoryMiB-a.memoryMiB||a.id.localeCompare(b.id));
 for(const s of services){
  const assigned=new Map();
  for(let i=0;i<s.replicas;i++){
   const candidates=nodes.filter(n=>n.online&&n.pools.includes(s.pool)&&
    n.free.cpu>=s.cpu&&n.free.memoryMiB>=s.memoryMiB&&n.free.diskGiB>=s.diskGiB);
   // Zone spread never silently falls back to one zone for the second replica.
   const zonesAssigned=new Set(assigned.values());
   const availableZones=new Set(candidates.map(n=>n.zone));
   const requiresNewZone=s.requireZoneSpread&&zonesAssigned.size<2&&zonesAssigned.size>0&&
    [...availableZones].some(zone=>!zonesAssigned.has(zone));
   const filtered=candidates.filter(n=>!requiresNewZone||!zonesAssigned.has(n.zone));
   filtered.sort((a,b)=>{
    const za=[...assigned.values()].filter(z=>z===a.zone).length;
    const zb=[...assigned.values()].filter(z=>z===b.zone).length;
    const ca=assigned.has(a.id)?1:0, cb=assigned.has(b.id)?1:0;
    return (s.requireZoneSpread?za-zb:0)||ca-cb||
     (b.free.memoryMiB/b.total.memoryMiB)-(a.free.memoryMiB/a.total.memoryMiB)||
     a.id.localeCompare(b.id);
   });
   const chosen=filtered[0];
   if(!chosen){unplaced.push({service:s.id,replica:i+1,reason:'NO_COMPATIBLE_NODE_WITH_FREE_RESOURCES'});continue;}
   chosen.free.cpu-=s.cpu;chosen.free.memoryMiB-=s.memoryMiB;chosen.free.diskGiB-=s.diskGiB;
   placements.push({service:s.id,replica:i+1,node:chosen.id,zone:chosen.zone,pool:s.pool,kind:s.kind});
   assigned.set(chosen.id,chosen.zone);
  }
  if(s.requireZoneSpread){
   const zones=new Set(placements.filter(x=>x.service===s.id).map(x=>x.zone));
   if(zones.size<2)warnings.push('HA_NOT_PROVEN:'+s.id+':at least two zones required');
  }
  if(s.kind==='stateful')warnings.push('STATEFUL_SINGLE_PRIMARY:'+s.id+':replication, backups and failover must be separately implemented and tested');
 }
 const allPlaced=unplaced.length===0;
 const violations=warnings.filter(x=>x.startsWith('HA_NOT_PROVEN'));
 return {
  schema:'markarian-fleet-plan/v1',
  verdict:allPlaced&&!violations.length?'STAGING_PLACEMENT_REVIEW':'NEEDS_INFRASTRUCTURE_WORK',
  placements,unplaced,warnings,
  nodes:nodes.map(({id,zone,pools,online,total,free})=>({id,zone,pools,online,total,free})),
  canProvision:false,canDeploy:false,canMigrateProduction:false,canMoveDNS:false,
  note:'Resource allocation only; does not certify database replication, network reachability, backups, TLS or actual runtime capacity.'
 };
}
export function main(args=process.argv.slice(2)){
 if(args.length!==2||args[0]!=='--plan'||!isAbsolute(args[1])){
  process.stderr.write('Usage: node scripts/cloud/fleet-plan.mjs --plan /absolute/reviewed/fleet.json\n');return 2;
 }
 try{
  const st=lstatSync(args[1]);
  if(!st.isFile()||st.isSymbolicLink()||st.size>524288)fail('Unsafe manifest');
  const report=planFleet(JSON.parse(readFileSync(args[1],'utf8')));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  // Even successful capacity placement never returns 0 as production approval.
  return report.verdict==='STAGING_PLACEMENT_REVIEW'?3:1;
 }catch{
  process.stderr.write('FLEET NOT READY: invalid or unsafe manifest. Nothing was deployed.\n');return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
