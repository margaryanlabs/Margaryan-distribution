/** Server-only sanitized read of completed supervisor state, never accepts user file paths. */
import {lstatSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
export type SupervisorStatus={
 state:'not_configured'|'recent'|'stale'|'error';
 status:'unknown'|'observed_attention'|'observed_no_findings';
 checkedAt:string|null;incidentCount:number|null;criticalCount:number|null;
 sources:{id:'portfolio'|'infrastructure';state:'recent'|'stale'|'error'|'not_configured';checkedAt:string|null}[];
 incidents:{id:string;origin:'portfolio'|'infrastructure';title:string;severity:'critical'|'warning'|'info';project?:string}[];
 decisionCommand:{repository:string;pipelineFreshness:'not_checked';paperTrading:'not_checked';liveOrderPermissions:'not_checked'};
 notice:string;productionReady:false;autonomousRemediation:false
};
const fail=(state:SupervisorStatus['state'],notice:string):SupervisorStatus=>({
 state,status:'unknown',checkedAt:null,incidentCount:null,criticalCount:null,sources:[],incidents:[],
 decisionCommand:{repository:'margaryanlabs/decision-command',pipelineFreshness:'not_checked',paperTrading:'not_checked',liveOrderPermissions:'not_checked'},
 notice,productionReady:false,autonomousRemediation:false
});
const iso=(s:unknown,now:number)=>{
 if(typeof s!=='string'||!(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/).test(s))throw Error('Timestamp');
 const at=Date.parse(s);
 if(!Number.isFinite(at)||at<0||at>now+60000)throw Error('Timestamp');
 return at;
};
export function readAgentSupervisorStatus(env:Record<string,string|undefined>,now:number=Date.now()):SupervisorStatus{
 const path=env.CLOUD_SUPERVISOR_REPORT_FILE;
 if(!path)return fail('not_configured','Supervisor report has not been mounted. Agents are not running automatically.');
 if(!isAbsolute(path))return fail('error','Supervisor report must be an absolute server-side path.');
 try{
  const file=lstatSync(path);
  if(!file.isFile()||(file.mode&0o077)!==0||file.size>512*1024||
   (typeof process.getuid==='function'&&file.uid!==process.getuid()))throw Error('Unsafe report');
  const doc:unknown=JSON.parse(readFileSync(path,'utf8'));
  if(!doc||typeof doc!=='object')throw Error('Invalid report');
  const v=doc as Record<string,unknown>;
  if(v.version!==1||v.schema!=='markarian-agent-supervisor/v1'||v.complete!==true||
    !Array.isArray(v.sources)||v.sources.length!==2||!Array.isArray(v.signals)||v.signals.length>240)
    throw Error('Report schema');
  const time=iso(v.checkedAt,now);
  const channels=v.sources.map((s:unknown)=>{
    if(!s||typeof s!=='object')throw Error('Source schema');
    const item=s as Record<string,unknown>;
    if(!['portfolio','infrastructure'].includes(String(item.id))||item.state!=='recent')throw Error('Source schema');
    const at=iso(item.checkedAt,now);
    return {id:item.id as 'portfolio'|'infrastructure',state:item.state as 'recent',checkedAt:new Date(at).toISOString()};
  });
  if(channels[0].id!=='portfolio'||channels[1].id!=='infrastructure')throw Error('Source order');
  const fresh=time>=now-10*60000&&iso(channels[0].checkedAt,now)>=now-6*3600000&&
   iso(channels[1].checkedAt,now)>=now-5*60000;
  const records=v.signals.map((s:unknown)=>{
   if(!s||typeof s!=='object')throw Error('Signal');
   const item=s as Record<string,unknown>;
   if(typeof item.id!=='string'||typeof item.title!=='string'||item.id.length>220||item.title.length>180||
      !['portfolio','infrastructure'].includes(String(item.origin))||!['critical','warning','info'].includes(String(item.severity)))throw Error('Signal');
   return {id:item.id,origin:item.origin as 'portfolio'|'infrastructure',severity:item.severity as 'critical'|'warning'|'info',
    title:item.title.slice(0,140),...(typeof item.project==='string'&&/^(margaryanlabs|margaryan-labs)\/[\w.-]{1,100}$/.test(item.project)?{project:item.project}:{})};
  });
  if(v.incidentCount!==records.length||v.criticalCount!==records.filter(x=>x.severity==='critical').length)throw Error('Incorrect counts');
  if(!['observed_attention','observed_no_findings'].includes(String(v.status))||
    (records.length>0)!==(v.status==='observed_attention'))throw Error('Incorrect status');
  return {state:fresh?'recent':'stale',status:fresh?v.status as SupervisorStatus['status']:'unknown',
   checkedAt:new Date(time).toISOString(),incidentCount:records.length,criticalCount:v.criticalCount as number,
   sources:channels.map(s=>({...s,state:(fresh?'recent':'stale') as 'recent'|'stale'})),incidents:records.slice(0,8),
   decisionCommand:{repository:'margaryanlabs/decision-command',pipelineFreshness:'not_checked',paperTrading:'not_checked',liveOrderPermissions:'not_checked'},
   notice:fresh?'Recent completed supervisor audit. Not a production uptime, database or trading pipeline check.':
     'Supervisor or underlying source evidence is stale; current status is unknown.',productionReady:false,autonomousRemediation:false};
 }catch{return fail('error','Supervisor report is missing, inaccessible or invalid.');}
}
