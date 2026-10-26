#!/usr/bin/env node
/**
 * Markarian Cloud: read-only Coolify multi-server reconciliation.
 * This command neither provisions nodes nor deploys applications.
 * It NEVER asserts fault-domain independence from editable zone labels.
 */
import {lstatSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {planFleet} from './fleet-plan.mjs';
import {trustedHttpsOrigin,readPrivateReadToken} from './first-node.mjs';
const ID=/^[a-zA-Z0-9_-]{8,128}$/;
const NODE_ID=/^[a-z][a-z0-9-]{0,63}$/;

function manifestFile(path,privateMode=false) {
 if(typeof path!=='string'||!isAbsolute(path))throw Error('Absolute path required');
 const st=lstatSync(path);
 if(!st.isFile()||st.isSymbolicLink()||st.size>524288||(privateMode&&
 ((st.mode&0o077)!==0||(typeof process.getuid==='function'&&st.uid!==process.getuid())))
 )throw Error('Unsafe or non-private file');
 return JSON.parse(readFileSync(path,'utf8'));
}
export function validateBindings(manifest,raw) {
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
   Object.keys(raw).sort().join(',')!=='nodes,version'||raw.version!==1||
   !Array.isArray(raw.nodes)||raw.nodes.length!==manifest.nodes.length)
   throw Error('Invalid binding document');
 const byId=new Map(),uuids=new Set();
 for(const item of raw.nodes){
  if(!item||typeof item!=='object'||Array.isArray(item)||
    Object.keys(item).sort().join(',')!=='nodeId,serverUuid'||
    !NODE_ID.test(item.nodeId)||!ID.test(item.serverUuid)||
    byId.has(item.nodeId)||uuids.has(item.serverUuid))throw Error('Invalid or duplicate node UUID binding');
  byId.set(item.nodeId,item.serverUuid);uuids.add(item.serverUuid);
 }
 if(manifest.nodes.some(n=>!byId.has(n.id)))throw Error('Unbound planned node');
 return byId;
}
export function reconcileFleet(manifest,bindings,coolifyServers) {
 const plan=planFleet(manifest);
 const ids=validateBindings(manifest,bindings);
 if(!Array.isArray(coolifyServers)||coolifyServers.length>1000)throw Error('Invalid server inventory');
 const inventory=new Map();
 for(const candidate of coolifyServers){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))continue;
  const uuid=candidate.uuid;
  if(typeof uuid!=='string'||!ID.test(uuid))continue;
  if(inventory.has(uuid))throw Error('Duplicate Coolify server UUID');
  inventory.set(uuid,candidate);
 }
 const checks=manifest.nodes.map(n=>{
  const uuid=ids.get(n.id),server=inventory.get(uuid);
  const settings=server?.settings;
  const online=server&&settings&&typeof settings==='object'&&
    settings.is_reachable===true&&settings.is_usable===true;
  const declaredNodeIsEnabled=n.online===true;
  return {nodeId:n.id,zoneLabel:n.zone,configured:Boolean(server),
   healthy:Boolean(online),enabledInPlan:declaredNodeIsEnabled,
   status:declaredNodeIsEnabled&&online?'MATCH':'NOT_READY'};
 });
 const allMatched=checks.every(x=>x.status==='MATCH');
 const placementOK=plan.verdict==='STAGING_PLACEMENT_REVIEW';
 return {schema:'markarian-fleet-live/v1',
  verdict:allMatched&&placementOK?'LIVE_INVENTORY_MATCHED_REVIEW_ONLY':'NOT_READY',
  plannedReplicaCount:plan.placements.length,unplaced:plan.unplaced.length,
  checks,placementWarnings:plan.warnings,
  serverInventoryIsLive:true,independentFailureDomainsVerified:false,
  applicationHealthVerified:false,databaseReplicationVerified:false,
  backupsAndRestoreVerified:false,loadBalancerVerified:false,
  canClaimHa:false,canDeploy:false,canMigrateProduction:false,canChangeDNS:false,
  note:'Only reports Coolify server reachability/usability. Zone labels and resource allocations are not externally attested.'};
}
export async function fetchCoolifyServers(base,token,fetcher=fetch){
 const origin=trustedHttpsOrigin(base);
 if(!origin||!ID_TOKEN(token))throw Error('Coolify origin or read credential invalid');
 const url=new URL('/api/v1/servers',origin);
 const response=await fetcher(url,{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw Error('Coolify inventory unavailable');
 const declared=Number(response.headers?.get?.('content-length'));
 if(Number.isFinite(declared)&&declared>1024*1024)throw Error('Inventory response too large');
 if(!response.body?.getReader)throw Error('Missing inventory stream');
 const reader=response.body.getReader(),chunks=[];let total=0;
 try {
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   total+=value.length;
   if(total>1024*1024)throw Error('Inventory response too large');
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const buffer=Buffer.concat(chunks.map(v=>Buffer.from(v)));
 return JSON.parse(buffer.toString('utf8'));
}
function ID_TOKEN(value){return typeof value==='string'&&/^[A-Za-z0-9_.|:-]{16,512}$/.test(value);}
export async function main(argv=process.argv.slice(2),env=process.env,fetcher=fetch,
 output=process.stdout,error=process.stderr){
 if(argv.length===2&&argv[0]==='--plan'){
  try{
   const plan=planFleet(manifestFile(argv[1]));
   output.write(JSON.stringify({schema:'markarian-fleet-live/v1',mode:'PLAN_ONLY',
    plannedReplicas:plan.placements.length,unplaced:plan.unplaced.length,
    canClaimHa:false,canDeploy:false,canMigrateProduction:false},null,2)+'\n');
   return plan.unplaced.length?1:0;
  }catch{error.write('NOT READY: invalid fleet manifest.\n');return 1;}
 }
 if(argv.length!==4||argv[0]!=='--verify'||argv[2]!=='--bindings'){
  error.write('Usage: fleet-live.mjs --plan /abs/fleet.json | --verify /abs/fleet.json --bindings /abs/private/bindings.json\n');
  return 2;
 }
 try{
  const manifest=manifestFile(argv[1]);
  const bindings=manifestFile(argv[3],true);
  validateBindings(manifest,bindings);
  const base=trustedHttpsOrigin(env.CLOUD_COOLIFY_URL);
  const token=readPrivateReadToken(env.CLOUD_COOLIFY_READ_TOKEN_FILE);
  if(!base)throw Error('No trusted HTTPS Coolify origin');
  const result=reconcileFleet(manifest,bindings,await fetchCoolifyServers(base,token,fetcher));
  output.write(JSON.stringify(result,null,2)+'\n');
  // Even matched inventory is a review-only receipt; never green-light production.
  return result.verdict==='LIVE_INVENTORY_MATCHED_REVIEW_ONLY'?3:1;
 }catch {
  error.write('FLEET NOT READY: source, binding, credentials, API or inventory invalid. No actions taken.\n');
  return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
