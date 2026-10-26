#!/usr/bin/env node
/**
 * Operator-run, READ ONLY, direct-to-private-origin release identity and health probe.
 * Self-reported image source SHA is useful for catching mixed deployments; it is
 * not an independent registry/image-digest attestation or permission to cut traffic.
 */
import {lstatSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateEdgeConfig} from './edge-render.mjs';
import {probeOrigin} from './edge-probe.mjs';

const SOURCES=Object.freeze({
 vetogram:'margaryanlabs/Telegram-story-bot',
 promptence:'margaryan-labs/ai-revenue-navigator'
});
const LIMIT=4096;
const SAFE_SHA=/^[a-f0-9]{40}$/;
const MARKER_PATH='/api/markarian-release';

export function matchReleaseMarker(service,raw){
 if(!service||!Object.hasOwn(SOURCES,service.id)||!SAFE_SHA.test(service.expectedSourceSha))
  return false;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return false;
 return raw.schema==='markarian-app-release/v1'&&
  raw.environment==='staging'&&raw.product===service.id&&
  raw.repository===SOURCES[service.id]&&raw.commit===service.expectedSourceSha;
}
export async function boundedMarker(response,max=LIMIT){
 if(response.status!==200)return null;
 const media=(response.headers?.get?.('content-type')||'').toLowerCase();
 if(!/^application\/json(?:\s*;|$)/.test(media))return null;
 const lengthHeader=response.headers?.get?.('content-length');
 if(lengthHeader!==null&&lengthHeader!==undefined){
  const advertised=Number(lengthHeader);
  if(!Number.isSafeInteger(advertised)||advertised<0||advertised>max)return null;
 }
 const reader=response.body?.getReader?.();if(!reader)return null;
 const chunks=[];let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   if(!(value instanceof Uint8Array)){return null;}
   total+=value.byteLength;
   if(total>max){await reader.cancel().catch(()=>{});return null;}
   chunks.push(Buffer.from(value));
  }
 }finally{try{reader.releaseLock();}catch{}}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{return null;}
}
export async function inspectBackend(service,backend,fetcher=fetch){
 const base='http://'+backend.ip+':'+backend.port;
 const result={product:service.id,backend:backend.id,zoneLabel:backend.zone,
  health:'FAILED',source:'UNVERIFIED'};
 try{
  const alive=await probeOrigin(service,backend,fetcher);
  if(alive.status!=='HEALTH_200')return result;
  result.health='HTTP_200';
  const response=await fetcher(base+MARKER_PATH,{
   method:'GET',headers:{Accept:'application/json'},
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)
  });
  const body=await boundedMarker(response);
  result.source=matchReleaseMarker(service,body)?'DECLARED_SHA_MATCH':'MISMATCH_OR_UNAVAILABLE';
  return result;
 }catch{return result;}
}
export async function verifyEdgeRelease(config,fetcher=fetch){
 const valid=validateEdgeConfig(config);
 const jobs=valid.services.flatMap(s=>s.backends.map(b=>({service:s,backend:b})));
 const results=[];
 for(let offset=0;offset<jobs.length;offset+=8){
  const chunk=jobs.slice(offset,offset+8);
  results.push(...await Promise.all(chunk.map(({service,backend})=>inspectBackend(service,backend,fetcher))));
 }
 const good=results.every(r=>r.health==='HTTP_200'&&r.source==='DECLARED_SHA_MATCH');
 return {schema:'markarian-edge-release-evidence/v1',
  verdict:good?'SOURCE_LABELS_MATCH_REVIEW_ONLY':'BLOCKED',
  origins:results,
  liveImageDigestAttested:false,artifactRegistryVerified:false,
  providerZoneSeparationVerified:false,dbReadinessVerified:false,
  multiEdgeAvailabilityVerified:false,
  mayDeploy:false,maySwitchTraffic:false,mayChangeDNS:false,productionReady:false,
  note:'Self-reported stage markers can be stale/spoofed. Verify immutable running image digests and independent deployment receipts before traffic shifts.'};
}
function load(file){
 if(typeof file!=='string'||!isAbsolute(file))throw Error('Absolute path required');
 const st=lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>262144)throw Error('Unsafe manifest');
 return validateEdgeConfig(JSON.parse(readFileSync(file,'utf8')));
}
export async function main(argv=process.argv.slice(2),fetcher=fetch,out=process.stdout,err=process.stderr){
 if(argv.length!==2||argv[0]!=='--verify'||!isAbsolute(argv[1])){
  err.write('Usage: node scripts/cloud/edge-release.mjs --verify /absolute/staging-edge.json\n');
  return 2;
 }
 try{
  const report=await verifyEdgeRelease(load(argv[1]),fetcher);
  out.write(JSON.stringify(report,null,2)+'\n');
  return report.verdict==='SOURCE_LABELS_MATCH_REVIEW_ONLY'?3:1;
 }catch{
  err.write('EDGE RELEASE BLOCKED: unreadable manifest, origin or source identity mismatch. No deployment attempted.\n');
  return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)
 process.exitCode=await main();
