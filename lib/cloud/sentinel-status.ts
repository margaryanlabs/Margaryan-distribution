/** Sanitized, read-only status of the OWNER-OPERATED Sentinel state file.
 * Only owner-supplied server env path; no request-supplied paths or raw telemetry.
 */
import {lstatSync,readFileSync} from "node:fs";
import {isAbsolute} from "node:path";
export type SentinelStatus={
 state:"not_configured"|"connected"|"stale"|"error";
 checkedAt:string|null;activeIncidents:number|null;criticalCount:number|null;
 incidents:{id:string;severity:"critical"|"warning"|"info";title:string}[];notice:string
};
const state=(value:SentinelStatus["state"],notice:string):SentinelStatus=>({
 state:value,checkedAt:null,activeIncidents:null,criticalCount:null,incidents:[],notice
});
export function readSentinelStatus(env:Record<string,string|undefined>,nowMs:number=Date.now()):SentinelStatus{
 const path=env.CLOUD_SENTINEL_STATE_FILE?.trim();
 if(!path)return state("not_configured","Sentinel state is not mounted into the control plane.");
 if(!isAbsolute(path))return state("error","Sentinel state path must be server-side and absolute.");
 try{
  const stat=lstatSync(path);
  if(!stat.isFile()||(stat.mode&0o077)!==0||stat.size>65_536)
   return state("error","Sentinel state file is not a private bounded regular file.");
  const raw:unknown=JSON.parse(readFileSync(path,"utf8"));
  if(!raw||typeof raw!=="object")return state("error","Invalid Sentinel state format.");
  const data=raw as {version?:unknown;checkedAt?:unknown;signals?:unknown};
  if(data.version!==1||typeof data.checkedAt!=="string"||!Array.isArray(data.signals)||
   data.signals.length>40)return state("error","Unexpected Sentinel state schema.");
  const at=Date.parse(data.checkedAt);
  if(!Number.isFinite(at)||at>nowMs+60_000)return state("error","Sentinel timestamp cannot be trusted.");
  const records=data.signals;
  if(records.some(s=>!s||typeof s!=="object"||typeof s.id!=="string"||
   typeof s.title!=="string"||!["critical","warning","info"].includes(s.severity)))
   return state("error","Invalid incident in Sentinel state.");
  const incidents=records.map(s=>({
   id:String(s.id).slice(0,128),severity:s.severity as "critical"|"warning"|"info",
   title:String(s.title).slice(0,128)
  })).slice(0,40);
  const fresh=nowMs-at<=300_000;
  return {state:fresh?"connected":"stale",checkedAt:new Date(at).toISOString(),
   activeIncidents:incidents.length,criticalCount:incidents.filter(s=>s.severity==="critical").length,
   incidents,notice:fresh?"Last complete Sentinel poll is within five minutes. This is not proof of every service's health.":
    "Last complete Sentinel poll is stale; status may have changed."};
 }catch{return state("error","Sentinel state cannot be read. Check mounting and permissions.");}
}
