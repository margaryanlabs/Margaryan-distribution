#!/usr/bin/env node
/** Read-only active origin health probe for a planned private HAProxy staging edge.
 * Only GET to validated RFC1918 IP + explicitly configured port/path; no credentials.
 * HTTP 200 does not prove commit SHA, sessions, database health or multi-zone HA.
 */
import {readFileSync,lstatSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateEdgeConfig} from './edge-render.mjs';

export async function probeOrigin(service,backend,fetcher=fetch){
 const url='http://'+backend.ip+':'+backend.port+service.healthPath;
 try{
  const response=await fetcher(url,{
   method:'GET',headers:{Accept:'application/json'},
   redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4000)
  });
  try{await response.body?.cancel?.();}
  catch{/* Body disposal is best effort; status remains observable. */}
  return {service:service.id,backend:backend.id,zoneLabel:backend.zone,
   status:response.status===200?'HEALTH_200':'UNAVAILABLE'};
 }catch{return {service:service.id,backend:backend.id,zoneLabel:backend.zone,status:'UNAVAILABLE'};}
}
export async function checkEdgeOrigins(input,fetcher=fetch){
 const cfg=validateEdgeConfig(input),jobs=[];
 for(const svc of cfg.services)for(const backend of svc.backends)jobs.push([svc,backend]);
 const results=[];
 for(let i=0;i<jobs.length;i+=8){
  const batch=jobs.slice(i,i+8);
  results.push(...await Promise.all(batch.map(([svc,backend])=>probeOrigin(svc,backend,fetcher))));
 }
 const every200=results.every(x=>x.status==='HEALTH_200');
 return {schema:'markarian-edge-origin-probe/v1',
  verdict:every200?'HTTP_ORIGINS_RESPONDED_REVIEW_ONLY':'ORIGIN_HEALTH_BLOCKED',
  origins:results,
  canDeploy:false,canShiftTraffic:false,canClaimHa:false,
  verifiedSourceSha:false,verifiedImageDigest:false,verifiedAuth:false,
  verifiedDataRestore:false,independentZonesVerified:false,
  note:'HTTP 200 is a liveness signal only. No traffic shift or DNS mutation performed.'};
}
export async function main(args=process.argv.slice(2),fetcher=fetch,stdout=process.stdout,stderr=process.stderr){
 if(args.length!==2||args[0]!=='--verify'||!isAbsolute(args[1])){
  stderr.write('Usage: node scripts/cloud/edge-probe.mjs --verify /absolute/staging-edge.json\n');
  return 2;
 }
 try{
  const st=lstatSync(args[1]);
  if(!st.isFile()||st.isSymbolicLink()||st.size>262144)throw Error('Unsafe manifest');
  const cfg=validateEdgeConfig(JSON.parse(readFileSync(args[1],'utf8')));
  const report=await checkEdgeOrigins(cfg,fetcher);
  stdout.write(JSON.stringify(report,null,2)+'\n');
  return report.verdict==='HTTP_ORIGINS_RESPONDED_REVIEW_ONLY'?3:1;
 }catch{
  stderr.write('EDGE PROBE BLOCKED: invalid source or private backend not reachable.\n');
  return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)
 process.exitCode=await main();
