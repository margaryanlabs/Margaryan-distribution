#!/usr/bin/env node
/** Private credential generation for private Markarian Operations Compose.
 * No Docker or network calls. Refuse to overwrite secrets. No values printed.
 */
import {randomBytes,createHash} from "node:crypto";
import {existsSync,mkdirSync,openSync,writeFileSync,closeSync,rmSync} from "node:fs";
import {isAbsolute,join,resolve} from "node:path";
const help="Markarian ops: --plan OR --prepare /ABSOLUTE/path/to/deploy/cloud/ops\n";
function writePrivate(filename,value){
 const fd=openSync(filename,"wx",0o600);
 try{writeFileSync(fd,value,{encoding:"utf8"});}finally{closeSync(fd);}
}
const [action,raw,...extra]=process.argv.slice(2);
try{
 if(extra.length||!["--plan","--prepare"].includes(action)||(
  action==="--plan"&&raw)||(action==="--prepare"&&!raw)){
  process.stderr.write(help);process.exitCode=2;
 }else if(action==="--plan"){
  process.stdout.write(help+"No Docker, network calls or production changes. Secrets are generated only on the secured operator host.\n");
 }else{
  if(!isAbsolute(raw))throw Error("Use an absolute path");
  const target=resolve(raw);
  if(["/","/root","/tmp","/home","/srv","/etc"].includes(target))throw Error("System directory rejected");
  if(!existsSync(join(target,"compose.yaml"))||!existsSync(join(target,"prometheus.yml")))throw Error("Not a Markarian ops source directory");
  const directory=join(target,"secrets");
  if(existsSync(directory))throw Error("Secrets already present: refusing overwrite or rotation");
  mkdirSync(directory,{mode:0o700});
  try{
   const queuePass=randomBytes(32).toString("base64url");
   const grafanaPass=randomBytes(36).toString("base64url");
   const hash=createHash("sha256").update(queuePass).digest("hex");
   writePrivate(join(directory,"valkey.acl"),"user default off\nuser markarian on #"+hash+" ~markarian:* &markarian:* +@read +@write -@dangerous\n");
   writePrivate(join(directory,"valkey-client-password"),queuePass+"\n");
   writePrivate(join(directory,"grafana_admin_password"),grafanaPass+"\n");
  }catch(e){rmSync(directory,{recursive:true,force:true});throw e;}
  process.stdout.write("Private secrets created (not displayed). No deployment or migration performed.\n");
 }
}catch(e){
 process.stderr.write("NOT READY: "+(e instanceof Error?e.message:"Unexpected error")+"\n");
 process.exitCode=1;
}
