#!/usr/bin/env node
/** VETO Decision Command: local, fixed-path, read-only evidence checker.
 * It NEVER makes trading decisions, authenticates with exchanges or grants execution authority.
 */
import {lstatSync, statSync, readFileSync, openSync, writeFileSync, closeSync, renameSync, rmSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname, isAbsolute, join} from 'node:path';
import {pathToFileURL} from 'node:url';
export const CHECKS=Object.freeze(['healthz','readyz','market-readyz','governed-paper-readyz']);
const MAX_BYTES=8192;
const severities={market:'critical',paper:'warning',process:'warning'};
function privatePath(filename,allowNew=false){
 if(!isAbsolute(filename||''))throw Error('Private absolute path required');
 const parent=statSync(dirname(filename));
 if(!parent.isDirectory()||(parent.mode&0o077)!==0||(process.getuid&&parent.uid!==process.getuid()))throw Error('Private operator-owned directory required');
 try{const s=lstatSync(filename);if(!s.isFile()||(s.mode&0o077)!==0||s.size>65536||(process.getuid&&s.uid!==process.getuid()))throw Error('Unsafe state file');}
 catch(e){if(!(allowNew&&e.code==='ENOENT'))throw Error('Unsafe or missing state file');}
}
export function localOrigin(raw){
 if(typeof raw!=='string'||/[\s\\]/.test(raw))return null;
 try{const u=new URL(raw);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.pathname!=='/'||u.search||u.hash||u.username||u.password||!/^\d+$/.test(u.port)||+u.port<1)return null;return u.origin;}catch{return null;}
}
async function readProbe(url,fetcher){
 const response=await fetcher(url,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
 if(![200,503].includes(response.status)||!(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw Error('Invalid response');
 const declared=Number(response.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>MAX_BYTES)throw Error('Oversized response');
 const reader=response.body?.getReader();if(!reader)throw Error('Missing body');
 let bytes=0,body='';const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_BYTES)throw Error('Oversized body');body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}
 finally{reader.releaseLock();}
 const json=JSON.parse(body);if(!json||typeof json!=='object'||Array.isArray(json))throw Error('Invalid JSON');
 return {code:response.status,data:json};
}
function signal(name,severity,title){return {id:'veto:'+name,severity,title,source:'decision-command',action:'Inspect VETO worker source evidence; do not authorize orders.'};}
export function assess(check,data){
 if(!data)return {state:'unknown',signal:null};
 const {code,data:x}=data;
 if(check==='healthz'){
  if(code===200&&x.status==='ok'&&Number.isInteger(x.uptime_seconds)&&x.uptime_seconds>=0)return {state:'observed_running',signal:null};
  return {state:'degraded',signal:signal('process','warning','VETO worker process health unavailable')};
 }
 if(check==='readyz'){
  if(code===200&&['ready','initialized_no_market','handoff_pending'].includes(x.status)&&typeof x.market_ready==='boolean')
   return {state:x.status==='ready'?'deployment_ready':'deployment_accepted_only',signal:null};
  return {state:'degraded',signal:signal('deploy','warning','VETO worker deployment readiness failed')};
 }
 if(check==='market-readyz'){
  if(code===200&&x.status==='ready'&&x.market_ready===true)return {state:'market_reported_ready',signal:null};
  if(code===503&&x.status==='not_ready'&&x.market_ready===false)return {state:'degraded',signal:signal('market','critical','VETO primary market evidence is not ready')};
  return {state:'unknown',signal:null};
 }
 if(check==='governed-paper-readyz'){
  const safe=x.proves_ready_trade===false&&x.grants_execution_authority===false&&x.live_order_permission===false;
  if(!safe)return {state:'untrusted',signal:signal('authority','critical','VETO governor safety flags are absent or unsafe')};
  if(code===200&&x.status==='recorded_wait_or_ready'&&x.fresh_recorded_cycle===true&&
     typeof x.cycle_age_seconds==='number'&&x.cycle_age_seconds>=-5&&x.cycle_age_seconds<=180&&
     typeof x.monitor_age_seconds==='number'&&x.monitor_age_seconds>=-5&&x.monitor_age_seconds<=90)
   return {state:'paper_cycle_observed',signal:null};
  if(code===503&&['monitor_disabled','stale_or_unavailable'].includes(x.status)&&x.fresh_recorded_cycle===false)
   return {state:'degraded',signal:signal('paper','warning','VETO governed PAPER cycles are missing or stale')};
  return {state:'unknown',signal:null};
 }
 throw Error('Unsupported fixed probe');
}
export async function inspectDecision(origin,fetcher=fetch,now=Date.now()){
 const address=localOrigin(origin);if(!address)throw Error('Use local loopback 127.0.0.1 HTTP port only');
 const checks=[];
 for(const key of CHECKS){
  let assessed;
  try{assessed=assess(key,await readProbe(new URL('/'+key,address),fetcher));}
  catch{assessed={state:'unknown',signal:null};}
  checks.push({id:key,state:assessed.state,signal:assessed.signal});
 }
 const signals=checks.flatMap(x=>x.signal?[x.signal]:[]);
 const complete=checks.every(x=>!['unknown','untrusted'].includes(x.state));
 return {version:1,schema:'markarian-decision-specialist/v1',checkedAt:new Date(now).toISOString(),complete,
  state:complete?(signals.length?'observed_attention':'observed_without_failures'):'unknown',
  checks:checks.map(({id,state})=>({id,state})),signals,liveOrdersChecked:false,paperProfitVerified:false,
  marketDataIndependentlyVerified:false,canAuthorizeTrading:false,readOnly:true};
}
export function compare(previous,current,complete){const a=new Map(previous.map(x=>[x.id,x])),b=new Map(current.map(x=>[x.id,x]));return {new:current.filter(x=>!a.has(x.id)),changed:current.filter(x=>a.has(x.id)&&a.get(x.id).severity!==x.severity),resolved:complete?previous.filter(x=>!b.has(x.id)):[]};}
function stored(path){
 privatePath(path,true);
 let raw;
 try{raw=readFileSync(path,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw Error('Unreadable prior state');}
 try{
  const prev=JSON.parse(raw);
  if(prev?.version!==1||prev.schema!=='markarian-decision-specialist/v1'||prev.complete!==true||
     !Array.isArray(prev.signals)||prev.signals.length>CHECKS.length||
     prev.signals.some(x=>!x||typeof x.id!=='string'||!/^veto:[a-z-]{1,50}$/.test(x.id)||
       typeof x.title!=='string'||x.title.length>180||!['critical','warning'].includes(x.severity)))throw Error('Invalid prior state');
  return prev;
 }catch{throw Error('Corrupt prior state');}
}
function save(path,report){privatePath(path,true);const filename=join(dirname(path),'.veto-specialist-'+randomBytes(9).toString('hex'));const fd=openSync(filename,'wx',0o600);try{writeFileSync(fd,JSON.stringify(report)+'\n');}finally{closeSync(fd);}try{renameSync(filename,path);}catch(e){rmSync(filename,{force:true});throw e;}}
export async function main(args=process.argv.slice(2),env=process.env,fetcher=fetch,out=process.stdout,err=process.stderr){
 const [mode,path,...extra]=args;
 if(!['--plan','--once','--diff'].includes(mode)||extra.length||(mode==='--diff'&&!path)||(mode!=='--diff'&&path)){err.write('Usage: decision-specialist.mjs --plan | --once | --diff /private/state.json\n');return 2;}
 if(mode==='--plan'){out.write('Read-only loopback VETO health, market readiness and governed PAPER checks. No trading credentials or writes.\n');return 0;}
 try{const prev=mode==='--diff'?stored(path):null;const report=await inspectDecision(env.CLOUD_DECISION_HEALTH_ORIGIN,fetcher);
  const changes=compare(prev?.signals||[],report.signals,report.complete);
  if(mode==='--diff'&&report.complete)save(path,report);
  out.write(JSON.stringify({...report,changes,stateUpdated:mode==='--diff'&&report.complete})+'\n');return report.complete?0:1;
 }catch{err.write('VETO SPECIALIST NOT READY: trusted local source or state unavailable.\n');return 1;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();