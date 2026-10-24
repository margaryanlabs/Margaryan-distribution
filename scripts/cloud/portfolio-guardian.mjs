#!/usr/bin/env node
/**
 * Margaryan Cloud / Portfolio Guardian V1.
 * Read-only GitHub portfolio audit. No deploys, secrets echo, DB writes, trading or repair.
 * Does not verify runtime health. Node 22+.
 */
import {randomBytes} from "node:crypto";
import {lstatSync,statSync,existsSync,readFileSync,openSync,writeFileSync,closeSync,renameSync,rmSync} from "node:fs";
import {join,dirname,isAbsolute,resolve} from "node:path";
import {pathToFileURL} from "node:url";

export const OWNERS=Object.freeze(["margaryanlabs","margaryan-labs"]);
export const CRITICAL=new Set(["margaryanlabs/decision-command","margaryanlabs/Telegram-story-bot","margaryanlabs/Margaryan-distribution","margaryan-labs/ai-revenue-navigator","margaryan-labs/das-speak-armenia"]);
const REPO=/^(margaryanlabs|margaryan-labs)\/[A-Za-z0-9_.-]{1,100}$/;
const TOKEN=/^[a-zA-Z0-9_]{20,512}$/;
const CAP=200;
function refuse(message){throw Error(message);}
function privateFile(file,label){
 if(!file||!isAbsolute(file))refuse(label+": absolute path required");
 const stat=lstatSync(file);
 if(!stat.isFile()||(stat.mode&0o077)!==0)refuse(label+": private regular file required");
 if(typeof process.getuid==="function"&&stat.uid!==process.getuid())refuse(label+": wrong owner");
 return file;
}
export function readToken(file){
 const token=readFileSync(privateFile(file,"GitHub token"),"utf8").trim();
 if(!TOKEN.test(token))refuse("Bad GitHub token format");
 return token;
}
function statePath(file){
 if(!file||!isAbsolute(file))refuse("Absolute state path required");
 const full=resolve(file),dir=statSync(dirname(full));
 if(!dir.isDirectory()||(dir.mode&0o077)!==0)refuse("Private state directory (0700) required");
 if(typeof process.getuid==="function"&&dir.uid!==process.getuid())refuse("State directory owner mismatch");
 if(existsSync(full))privateFile(full,"State");
 return full;
}
export function readState(file){
 const path=statePath(file);
 if(!existsSync(path))return [];
 const state=JSON.parse(readFileSync(path,"utf8"));
 if(state?.version!==1||!Array.isArray(state.signals)||state.signals.length>CAP||state.signals.some(x=>typeof x?.id!=="string"||typeof x.severity!=="string"))refuse("Invalid prior state");
 return state.signals;
}
export function writeState(file,signals,checkedAt){
 const path=statePath(file),tmp=join(dirname(path),".guardian-"+randomBytes(10).toString("hex"));
 const fd=openSync(tmp,"wx",0o600);
 try{writeFileSync(fd,JSON.stringify({version:1,checkedAt,signals:signals.slice(0,CAP)})+"\n");}finally{closeSync(fd);}
 try{renameSync(tmp,path);}catch(e){rmSync(tmp,{force:true});throw e;}
}
export function compareSignals(before,now,complete){
 const previous=new Map(before.map(x=>[x.id,x])),current=new Map(now.map(x=>[x.id,x]));
 return {new:now.filter(x=>!previous.has(x.id)),changed:now.filter(x=>previous.has(x.id)&&previous.get(x.id).severity!==x.severity),
   ongoing:now.filter(x=>previous.has(x.id)).length,
   resolved:complete?before.filter(x=>!current.has(x.id)):[]};
}
async function githubGet(path,token,fetcher){
 if(typeof path!=="string"||!path.startsWith("/")||path.includes("..")||path.includes("\\"))refuse("Invalid API path");
 const url=new URL(path,"https://api.github.com");
 if(url.origin!=="https://api.github.com")refuse("Forbidden API origin");
 const response=await fetcher(url,{method:"GET",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000),
   headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Margaryan-Portfolio-Guardian"}});
 if(!response.ok)refuse("GitHub read denied");
 const length=Number(response.headers.get("content-length"));
 if(Number.isFinite(length)&&length>1048576)refuse("Oversized GitHub response");
 const reader=response.body?.getReader();
 if(!reader)refuse("Missing response body");
 const decoder=new TextDecoder();let bytes=0,body="";
 try{while(true){const part=await reader.read();if(part.done)break;
   bytes+=part.value.length;if(bytes>1048576)refuse("GitHub response too large");
   body+=decoder.decode(part.value,{stream:true});
  }body+=decoder.decode();
 }finally{reader.releaseLock();}
 return JSON.parse(body);
}
export async function discoverRepos(token,fetcher=fetch){
 const found=new Map();
 for(let page=1;page<=3;page++){
  const body=await githubGet("/user/repos?affiliation=owner,collaborator&per_page=100&page="+page,token,fetcher);
  if(!Array.isArray(body)||body.length>100)refuse("Invalid GitHub repository inventory");
  for(const item of body){const name=item?.full_name,owner=item?.owner?.login;
   if(typeof name==="string"&&REPO.test(name)&&OWNERS.includes(owner)&&name.split("/")[0]===owner)found.set(name,item);
  }
  if(found.size>CAP)refuse("Portfolio exceeds audit limit");
  if(body.length<100)return [...found.values()].sort((a,b)=>a.full_name.localeCompare(b.full_name));
 }
 refuse("Incomplete GitHub pagination");
}
export function classify(repo,actions,prs,nowMs=Date.now()){
 const name=repo?.full_name;
 if(typeof name!=="string"||!REPO.test(name))refuse("Repo not in approved owner scope");
 if(actions!==null&&!Array.isArray(actions?.workflow_runs))refuse("Invalid Actions response");
 if(prs!==null&&!Array.isArray(prs))refuse("Invalid PR response");
 const latest=actions?.workflow_runs?.[0]||null,important=CRITICAL.has(name);
 const failed=latest?.status==="completed"&&["failure","timed_out","action_required"].includes(latest?.conclusion);
 const url="https://github.com/"+name;
 const runLink=typeof latest?.html_url==="string"&&latest.html_url.startsWith(url+"/actions/runs/")?latest.html_url:url+"/actions";
 const signals=failed?[{id:"ci:"+name,severity:important?"critical":"high",title:"Latest GitHub Actions run failed",repo:name,url:runLink,
   action:"Inspect CI failure; verify a build before release"}]:[];
 const date=Date.parse(repo.pushed_at||"");
 const pushAge=Number.isFinite(date)&&date<=nowMs?Math.floor((nowMs-date)/86400000):null;
 return {repo:name,priority:important?"critical":"standard",private:repo.private===true,archived:repo.archived===true,
   defaultBranch:typeof repo.default_branch==="string"?repo.default_branch:null,lastPushDays:pushAge,
   ci:actions===null?"unknown":!latest?"not_observed":latest.status!=="completed"?"pending":latest.conclusion||"unknown",
   openPrSample:prs===null?null:prs.length,draftPrSample:prs===null?null:prs.filter(p=>p?.draft===true).length,
   sampleLimit:10,runtimeChecked:false,signals};
}
async function pool(values,worker){
 const result=new Array(values.length);let index=0;
 await Promise.all(Array.from({length:Math.min(values.length,4)},async()=>{
  while(index<values.length){const next=index++;result[next]=await worker(values[next]);}
 }));
 return result;
}
export async function auditPortfolio(env=process.env,fetcher=fetch,now=Date.now()){
 const token=readToken(env.CLOUD_GUARDIAN_GITHUB_TOKEN_FILE);
 const found=await discoverRepos(token,fetcher);
 if(!found.length)refuse("No repositories available: refusing a healthy verdict");
 const repositories=await pool(found,async repo=>{
  const name=repo.full_name.split("/").map(encodeURIComponent).join("/");
  const results=await Promise.allSettled([
   githubGet("/repos/"+name+"/actions/runs?per_page=1",token,fetcher),
   githubGet("/repos/"+name+"/pulls?state=open&per_page=10",token,fetcher)]);
  const actions=results[0].status==="fulfilled"?results[0].value:null;
  const prs=results[1].status==="fulfilled"?results[1].value:null;
  const item=classify(repo,actions,prs,now);
  item.sources={repository:true,actions:actions!==null,pullRequests:prs!==null};
  return item;
 });
 const complete=repositories.every(x=>x.sources.actions&&x.sources.pullRequests);
 const signals=repositories.flatMap(x=>x.signals).slice(0,CAP);
 return {schema:"markarian-portfolio-guardian/v1",checkedAt:new Date(now).toISOString(),complete,
   repositories,repositoryCount:repositories.length,criticalRepositories:repositories.filter(x=>x.priority==="critical").length,
   ciFailureCount:signals.length,unknownSources:repositories.reduce((n,x)=>n+Number(!x.sources.actions)+Number(!x.sources.pullRequests),0),
   signals,readOnly:true,productionReady:false,runtimeChecked:false,autonomousRemediation:false};
}
export async function main(args=process.argv.slice(2),env=process.env,fetcher=fetch,out=process.stdout,err=process.stderr){
 const [mode,path,...extra]=args;
 if(!["--plan","--once","--diff"].includes(mode)||extra.length||(mode==="--diff"&&!path)||(mode!=="--diff"&&path)){
  err.write("Usage: portfolio-guardian.mjs --plan | --once | --diff /absolute/private/state.json\n");return 2;
 }
 if(mode==="--plan"){
  out.write("Read-only GitHub audit for two Margaryan Labs owner namespaces. No production, data, deploy or trading access.\n"+
    "Set CLOUD_GUARDIAN_GITHUB_TOKEN_FILE to private owner-held 0600 token with metadata/actions/PR read permissions.\n"+
    "Use --once to inspect; --diff to compare and persist findings in operator-owned 0700 directory.\n"+
    "Scheduling, external notifications and remediation are NOT active by default.\n");
  return 0;
 }
 try{
  const previous=mode==="--diff"?readState(path):[];
  const report=await auditPortfolio(env,fetcher);
  const changes=compareSignals(previous,report.signals,report.complete);
  const stateUpdated=mode==="--diff"&&report.complete;
  if(stateUpdated)writeState(path,report.signals,report.checkedAt);
  out.write(JSON.stringify({...report,changes,stateUpdated})+"\n");
  return report.complete?0:1;
 }catch{
  err.write("GUARDIAN NOT READY: GitHub authorization, source or private state failed. No health conclusion.\n");return 1;
 }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();
