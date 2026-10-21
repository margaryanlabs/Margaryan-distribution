#!/usr/bin/env node
/**
 * One-shot read-only Coolify observer. No production mutations, autonomous
 * repairs, notifications, scheduling, shell execution or browser credentials.
 */
import {randomBytes} from "node:crypto";
import {existsSync,readFileSync,writeFileSync,renameSync,rmSync,lstatSync,statSync,openSync,closeSync} from "node:fs";
import {dirname,isAbsolute,join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {readCoolifyList,appView,serverView,deploymentView,isValidCoolifyOrigin} from "../../lib/cloud/normalize.ts";
import {healthSignals} from "../../lib/cloud/health-signals.ts";
const sources=["applications","servers","deployments"];
const CAP=40;
function refuse(reason){throw new Error(reason);}
function privateFile(path,label){
 if(!path||!isAbsolute(path))refuse(label+" requires an absolute path");
 try{
  const info=lstatSync(path);
  if(!info.isFile()||(info.mode&0o077)!==0)refuse(label+" must be a private regular file (chmod 600)");
  if(typeof process.getuid==="function"&&info.uid!==process.getuid())refuse(label+" must be owned by this operator");
 }catch(e){
  if(e instanceof Error&&e.message.startsWith(label+" must"))throw e;
  refuse(label+" is inaccessible");
 }
}
export function statePath(file){
 if(!file||!isAbsolute(file))refuse("State path must be absolute");
 const path=resolve(file);
 const dir=statSync(dirname(path));
 if(!dir.isDirectory()||(dir.mode&0o077)!==0)refuse("State directory must be private (chmod 700)");
 if(typeof process.getuid==="function"&&dir.uid!==process.getuid())refuse("State directory must be operator-owned");
 if(existsSync(path))privateFile(path,"Sentinel state");
 return path;
}
export function readState(path){
 const full=statePath(path);
 if(!existsSync(full))return [];
 try{
  const saved=JSON.parse(readFileSync(full,"utf8"));
  if(saved?.version!==1||!Array.isArray(saved.signals))throw Error();
  return saved.signals.slice(0,CAP).filter(s=>s&&typeof s.id==="string"&&
   typeof s.severity==="string"&&typeof s.title==="string");
 }catch{refuse("Corrupted Sentinel state: refusing overwrite");}
}
export function storeState(path,signals){
 const full=statePath(path);
 const tmp=join(dirname(full),".sentinel-"+randomBytes(10).toString("hex")+".tmp");
 const fd=openSync(tmp,"wx",0o600);
 try{
  writeFileSync(fd,JSON.stringify({version:1,signals:signals.slice(0,CAP).map(s=>({
   id:String(s.id).slice(0,160),severity:s.severity,title:String(s.title).slice(0,160),area:s.area
  }))})+"\n");
 }finally{closeSync(fd);}
 try{renameSync(tmp,full);}catch(e){rmSync(tmp,{force:true});throw e;}
}
export function compareSignals(previous,current,complete){
 const before=new Map(previous.map(s=>[s.id,s]));
 const after=new Map(current.map(s=>[s.id,s]));
 return {
  new:current.filter(s=>!before.has(s.id)).slice(0,CAP),
  changed:current.filter(s=>before.has(s.id)&&before.get(s.id).severity!==s.severity).slice(0,CAP),
  resolved:complete?previous.filter(s=>!after.has(s.id)).slice(0,CAP):[],
  ongoing:current.filter(s=>before.has(s.id)).length
 };
}
export async function pollCoolify(env,fetcher=fetch){
 const address=env.CLOUD_COOLIFY_URL?.trim()||"";
 if(!isValidCoolifyOrigin(address))refuse("Trusted Coolify origin required");
 const path=env.CLOUD_SENTINEL_TOKEN_FILE;
 privateFile(path,"Read-only Coolify token");
 const token=readFileSync(path,"utf8").trim();
 if(token.length<16||token.length>1024)refuse("Invalid read-only token");
 const base=new URL(address).origin;
 const responses=await Promise.allSettled(sources.map(kind=>readCoolifyList(base,token,kind,fetcher)));
 const flags=responses.map(r=>r.status==="fulfilled");
 const at=i=>responses[i].status==="fulfilled"?responses[i].value:[];
 const complete=flags.every(Boolean);
 const snapshot={
  mode:complete?"connected":"degraded",updatedAt:new Date().toISOString(),
  applications:at(0).map(appView),servers:at(1).map(serverView),
  deployments:at(2).map(deploymentView),projects:[],
  sources:{applications:flags[0],servers:flags[1],deployments:flags[2],projects:false},
  errors:flags.map((ok,i)=>ok?null:sources[i]+" unavailable").filter(Boolean)
 };
 const h=healthSignals(snapshot);
 return {checkedAt:snapshot.updatedAt,complete,observed:{
  applications:flags[0]?snapshot.applications.length:null,
  servers:flags[1]?snapshot.servers.length:null,
  deployments:flags[2]?snapshot.deployments.length:null},
  runningApplications:h.online,applicationIssues:h.attention,signals:h.signals};
}
export async function main(args=process.argv.slice(2),env=process.env,fetcher=fetch){
 const [command,path,...more]=args;
 if(!["--plan","--once","--diff"].includes(command)||more.length||
  (command==="--diff"&&!path)||(command!=="--diff"&&path)){
  process.stderr.write("Usage: sentinel.mjs --plan | --once | --diff /absolute/private/state.json\n");
  return 2;
 }
 if(command==="--plan"){
  process.stdout.write("Markarian Sentinel: read-only Coolify app/server/deployment polling.\n"+
   "Set CLOUD_COOLIFY_URL and CLOUD_SENTINEL_TOKEN_FILE (owner-only chmod 600 read token).\n"+
   "For --diff, use a file inside a chmod 700 operator-owned directory.\n"+
   "No scheduler, notifications, AI actions, deployment or automatic remediation.\n");
  return 0;
 }
 try{
  const previous=command==="--diff"?readState(path):[];
  const observed=await pollCoolify(env,fetcher);
  const changes=compareSignals(previous,observed.signals,observed.complete);
  const updated=command==="--diff"&&observed.complete;
  if(updated)storeState(path,observed.signals);
  process.stdout.write(JSON.stringify({...observed,changes,stateUpdated:updated,
   readOnly:true,autonomousRemediation:false})+"\n");
  return observed.complete?0:1;
 }catch{
  process.stderr.write("SENTINEL NOT READY: check private access, sources and state permissions.\n");
  return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 process.exitCode=await main();
}
