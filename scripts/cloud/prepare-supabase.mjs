#!/usr/bin/env node
/**
 * Prepare the official self-hosted Supabase Docker stack WITHOUT deploying it.
 * No database, container, account or credentials are created by this script.
 */
import {execFileSync} from "node:child_process";
import {cpSync,existsSync,mkdtempSync,readFileSync,renameSync,rmSync,writeFileSync} from "node:fs";
import {dirname,isAbsolute,join,resolve} from "node:path";
const SOURCE="https://github.com/supabase/supabase.git";
const RELEASE="self-hosted/v0.8.2"; // Supabase manual self-hosting documentation
const REQUIRED=["POSTGRES_PASSWORD","DASHBOARD_PASSWORD","SUPABASE_PUBLIC_URL",
 "API_EXTERNAL_URL","SUPABASE_PUBLISHABLE_KEY","SUPABASE_SECRET_KEY"];
const HELP="Markarian Cloud Data Foundation (offline configuration / source preparation only)\n"+
 "  --plan\n  --prepare /absolute/path/to/new-directory\n  --verify /absolute/path/to/prepared-directory\n"+
 "Source: "+SOURCE+"\nRelease: "+RELEASE+"\n"+
 "Read docs/cloud/SELF_HOSTED_DATA.md before enabling Docker.\n";
function getTarget(raw){
 if(!raw||!isAbsolute(raw))throw Error("Provide a full absolute path.");
 const target=resolve(raw);
 if(["/","/etc","/var","/home","/root","/tmp","/usr","/opt","/srv"].includes(target))
  throw Error("A system directory cannot be used as the target.");
 if(!existsSync(dirname(target)))throw Error("Create and secure the parent directory first.");
 return target;
}
function parseEnv(content){
 const result=new Map();
 for(const line of content.split(/\r?\n/)){
  const match=line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(match)result.set(match[1],match[2].trim().replace(/^(["'])(.*)\1$/,"$2"));
 }
 return result;
}
function configured(value){
 return typeof value==="string"&&value.trim().length>0&&!/^(your_|change|replace|example|placeholder|<)/i.test(value.trim());
}
const [action,arg,...extra]=process.argv.slice(2);
try{
 if(extra.length||!["--plan","--help","--prepare","--verify"].includes(action)||
   ((action==="--prepare"||action==="--verify")&&!arg)||
   ((action==="--plan"||action==="--help")&&arg)){
  process.stderr.write(HELP);process.exitCode=2;
 }else if(action==="--plan"||action==="--help"){
  process.stdout.write(HELP+"\nNo secrets, hosts, containers or databases are created.\n");
 }else{
  const target=getTarget(arg);
  if(action==="--verify"){
   if(!existsSync(join(target,"docker-compose.yml"))||!existsSync(join(target,".supabase-version")))
    throw Error("Expected upstream Compose file and release marker missing.");
   if(readFileSync(join(target,".supabase-version"),"utf8").trim()!=="ref="+RELEASE)
    throw Error("Unexpected Supabase release marker; review before proceeding.");
   const path=join(target,".env");
   if(!existsSync(path))throw Error("Missing private .env. Configure it on the target host only.");
   const values=parseEnv(readFileSync(path,"utf8"));
   const missing=REQUIRED.filter(name=>!configured(values.get(name)));
   for(const name of REQUIRED)process.stdout.write((missing.includes(name)?"[WAIT] ":"[SET]  ")+name+"\n");
   if(missing.length)throw Error("Configuration fields missing. Secret values have not been printed.");
   process.stdout.write("Configuration presence checks passed. This does NOT prove key strength, container health, safe backups or deployment readiness.\n");
  }else{
   if(existsSync(target))throw Error("Destination already exists. No overwrite is allowed.");
   const temp=mkdtempSync(join(dirname(target),".markarian-data-"));
   try{
    const clone=join(temp,"upstream");
    execFileSync("git",["clone","--quiet","--depth","1","--filter=blob:none","--sparse",
      "--branch",RELEASE,SOURCE,clone],{stdio:"inherit",timeout:180000});
    execFileSync("git",["-C",clone,"sparse-checkout","set","docker"],{stdio:"inherit",timeout:180000});
    const source=join(clone,"docker");
    if(!existsSync(join(source,"docker-compose.yml"))||!existsSync(join(source,".env.example")))
     throw Error("Upstream Docker layout changed: aborting.");
    const output=join(temp,"staged");
    cpSync(source,output,{recursive:true});
    if(existsSync(join(output,".env")))throw Error("Upstream contains an unexpected .env; refusing to copy.");
    writeFileSync(join(output,".supabase-version"),"ref="+RELEASE+"\n",{flag:"wx",mode:0o600});
    if(existsSync(target))throw Error("Destination appeared during preparation; aborting.");
    renameSync(output,target);
    process.stdout.write("Upstream Docker source prepared in "+target+"\nNo credentials or containers created.\n");
   }finally{rmSync(temp,{recursive:true,force:true});}
  }
 }
}catch(error){
 process.stderr.write("PREPARATION INCOMPLETE: "+(error instanceof Error?error.message:"Unknown error")+"\n");
 process.exitCode=1;
}
