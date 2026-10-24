#!/usr/bin/env node
/** Read-only federation of completed Guardian and Sentinel snapshots.
 * Never polls trading data, executes deployments, or approves production actions.
 */
import {lstatSync,readFileSync,statSync,openSync,writeFileSync,closeSync,renameSync,rmSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {isAbsolute,dirname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const LIMIT=512*1024,MAX=240;
const PROVIDERS=[
 {id:'portfolio',key:'CLOUD_GUARDIAN_STATE_FILE',maxAge:6*3600_000,limit:200},
 {id:'infrastructure',key:'CLOUD_SENTINEL_STATE_FILE',maxAge:5*60_000,limit:40}
];
const severityRank={critical:0,warning:1,info:2};
const protectedFile=(file,{mayBeNew=false}={})=>{
 if(typeof file!=='string'||!isAbsolute(file))throw Error('Private absolute file path required');
 const parent=statSync(dirname(file));
 if(!parent.isDirectory()||(parent.mode&0o077)!==0||
    (typeof process.getuid==='function'&&parent.uid!==process.getuid()))
   throw Error('Private operator-owned directory with mode 0700 required');
 if(!existsSync(file)){
   if(mayBeNew)return false;
   throw Error('State file missing');
 }
 const info=lstatSync(file);
 if(!info.isFile()||(info.mode&0o077)!==0||info.size>LIMIT||
    (typeof process.getuid==='function'&&info.uid!==process.getuid()))
   throw Error('State file is not a bounded operator-owned 0600 regular file');
 return true;
};
function timestamp(raw,now){
 if(typeof raw!=='string'||!(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/).test(raw))throw Error('Invalid timestamp');
 const t=Date.parse(raw);
 if(!Number.isFinite(t)||t>now+60_000||t<0)throw Error('Untrusted timestamp');
 return t;
}
function normalizeSignals(input,origin){
 const result=[];
 for(const item of input){
  if(!item||typeof item!=='object'||typeof item.id!=='string'||typeof item.title!=='string'||
     !['critical','high','warning','info'].includes(item.severity)||
     item.id.length>180||item.title.length>300)throw Error('Invalid upstream signal');
  const severity=item.severity==='high'?'warning':item.severity,id=origin+':'+item.id;
  const record={id,origin,severity,title:item.title.slice(0,140),
   recommendedAction:origin==='portfolio'?(item.title.includes('failed to start')?'Check GitHub Actions runner and permissions':'Investigate CI and verify the failing run'):
    'Inspect the affected Coolify service and its deployment logs'};
  if(origin==='portfolio'&&typeof item.repo==='string'&&/^(margaryanlabs|margaryan-labs)\/[\w.-]{1,100}$/.test(item.repo))record.project=item.repo;
  if(origin==='portfolio'&&typeof item.url==='string'&&/^https:\/\/github\.com\/(?:margaryanlabs|margaryan-labs)\/[\w.-]+\/(?:actions(?:\/runs\/\d+)?|pull\/\d+|issues\/\d+)$/.test(item.url))record.url=item.url;
  result.push(record);
 }
 return result;
}
export function readAgentSource(file,id,maxAge,limit,now=Date.now()){
 if(!file)return {id,state:'not_configured',checkedAt:null,signals:[],count:null};
 try{
  protectedFile(file);
  const raw=JSON.parse(readFileSync(file,'utf8'));
  if(raw?.version!==1||!Array.isArray(raw.signals)||raw.signals.length>limit)throw Error('Invalid state schema');
  const checked=timestamp(raw.checkedAt,now),signals=normalizeSignals(raw.signals,id);
  return {id,state:now-checked<=maxAge?'recent':'stale',checkedAt:new Date(checked).toISOString(),signals,count:signals.length};
 }catch{return {id,state:'error',checkedAt:null,signals:[],count:null};}
}
export function composeSupervisor(env=process.env,now=Date.now()){
 const sources=PROVIDERS.map(p=>readAgentSource(env[p.key],p.id,p.maxAge,p.limit,now));
 const complete=sources.every(s=>s.state==='recent');
 const incidents=sources.flatMap(s=>s.signals).sort((a,b)=>severityRank[a.severity]-severityRank[b.severity]||a.id.localeCompare(b.id)).slice(0,MAX);
 const count=incidents.filter(x=>x.severity==='critical').length;
 return {version:1,schema:'markarian-agent-supervisor/v1',checkedAt:new Date(now).toISOString(),
   status:!complete?'unknown':incidents.length?'observed_attention':'observed_no_findings',complete,
   sources:sources.map(({id,state,checkedAt,count})=>({id,state,checkedAt,count})),
   incidentCount:incidents.length,criticalCount:count,signals:incidents,
   decisionCommand:{repository:'margaryanlabs/decision-command',ciSource:sources[0].state,
    pipelineFreshness:'not_checked',paperTrading:'not_checked',liveOrderPermissions:'not_checked'},
   note:'This is completed-snapshot evidence, not live production uptime or pipeline verification.',
   readOnly:true,productionReady:false,canMigrateProduction:false,autonomousRemediation:false};
}
export function compareSupervisor(before,after,complete){
 const previous=new Map(before.map(x=>[x.id,x])),current=new Map(after.map(x=>[x.id,x]));
 return {new:after.filter(x=>!previous.has(x.id)),changed:after.filter(x=>previous.has(x.id)&&previous.get(x.id).severity!==x.severity),
   resolved:complete?before.filter(x=>!current.has(x.id)):[],ongoing:after.filter(x=>previous.has(x.id)).length};
}
function privateReceipt(path){
 protectedFile(path,{mayBeNew:true});
 if(!existsSync(path))return [];
 const prev=JSON.parse(readFileSync(path,'utf8'));
 if(prev?.version!==1||!Array.isArray(prev.signals)||prev.signals.length>MAX||
   prev.signals.some(x=>!x||typeof x.id!=='string'||typeof x.severity!=='string'))throw Error('Invalid previous supervisor receipt');
 return prev.signals;
}
function atomicReceipt(path,data){
 protectedFile(path,{mayBeNew:true});
 const temporary=join(dirname(path),'.supervisor-'+randomBytes(12).toString('hex'));
 const fd=openSync(temporary,'wx',0o600);
 try{writeFileSync(fd,JSON.stringify(data)+'\n','utf8');}finally{closeSync(fd);}
 try{renameSync(temporary,path);}catch(e){rmSync(temporary,{force:true});throw e;}
}
export function main(args=process.argv.slice(2),env=process.env,out=process.stdout,err=process.stderr,now=Date.now()){
 const [mode,path,...extra]=args;
 if(!['--plan','--once','--diff'].includes(mode)||extra.length||
    (mode==='--diff'&&!path)||(mode!=='--diff'&&path)){
  err.write('Usage: agent-supervisor.mjs --plan | --once | --diff /absolute/private/report.json\n');return 2;
 }
 if(mode==='--plan'){
  out.write('Agent Supervisor: read-only federation of completed Guardian and Sentinel snapshots.\n'+
   'Set CLOUD_GUARDIAN_STATE_FILE and CLOUD_SENTINEL_STATE_FILE to private 0600 snapshots in owned 0700 directories.\n'+
   'Use --diff only with a separate private report path. No polling, trades, deploys or automatic repairs.\n');return 0;
 }
 try{
  const receipt=composeSupervisor(env,now),previous=mode==='--diff'?privateReceipt(path):[];
  const changes=compareSupervisor(previous,receipt.signals,receipt.complete);
  if(mode==='--diff'&&receipt.complete)atomicReceipt(path,receipt);
  out.write(JSON.stringify({...receipt,changes,reportUpdated:mode==='--diff'&&receipt.complete})+'\n');
  return receipt.complete?0:1;
 }catch{
  err.write('SUPERVISOR NOT READY: private state or receipt validation failed. No deployment or recovery performed.\n');return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
