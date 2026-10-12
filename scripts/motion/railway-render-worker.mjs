#!/usr/bin/env node
/**
 * PRIVATE Railway Motion worker: original Next/Canvas/Chromium/FFmpeg only.
 * - No AI video provider, no command injection, no user paths/URLs.
 * - Single job at a time; Postgres-backed queue, <=3 submissions/24 h.
 * - Persistent Railway Volume at /data/motion; only internal HTTP downloads.
 * - No CRM tokens, no API keys or user files in the worker's environment.
 */
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {mkdir,stat,readdir,unlink,readFile} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {pipeline} from "node:stream/promises";
import {resolve,join} from "node:path";
import {timingSafeEqual} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";
import pg from "pg";

const PORT=Number(process.env.PORT||3009);
const STUDIO_PORT=3118;
const DIR=resolve(process.env.MOTION_RENDER_OUTPUT_DIR||"/data/motion");
const TOKEN=process.env.MOTION_WORKER_INTERNAL_SECRET||"";
const DATABASE_URL=process.env.DISTRIBUTION_DATABASE_URL||"";
const MAX_SECONDS=11*60;
const TEMPLATE=resolve("editorial/motion/promptence-2026-36s-directors-cut.motion.json");
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const WORKER_ENABLED=process.env.MOTION_RENDER_ENABLED==="true";
if(!WORKER_ENABLED||TOKEN.length<32||!DATABASE_URL||!Number.isInteger(PORT)||PORT<1||PORT>65535)
 throw Error("MOTION_WORKER_CONFIG_INCOMPLETE");
if(DIR==="/"||DIR==="/app"||DIR==="/tmp")throw Error("MOTION_WORKER_OUTPUT_DIR_UNSAFE");
await mkdir(DIR,{recursive:true,mode:0o700});
const db=new pg.Pool({connectionString:DATABASE_URL,max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:20000});
let healthy=false,jobInProcess=false,shuttingDown=false,studio=null;
function authorized(header){
 if(typeof header!=="string"||!header.startsWith("Bearer "))return false;
 const actual=Buffer.from(header.slice(7)),expect=Buffer.from(TOKEN);
 return actual.length===expect.length&&timingSafeEqual(actual,expect);
}
function log(level,msg){process.stdout.write(JSON.stringify({at:new Date().toISOString(),level,service:"motion-render-worker",message:msg})+"\n");}
async function setupDb(){
 await db.query(`
 create table if not exists motion_render_jobs(
  id uuid primary key,
  preset text not null check(preset='promptence_cinema'),
  state text not null check(state in ('queued','running','complete','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,finished_at timestamptz,
  output_bytes bigint,error_code text
 );
 create index if not exists motion_render_jobs_recent on motion_render_jobs(created_at desc);
 `);
 await db.query(`update motion_render_jobs set state='failed',
   error_code='worker_interrupted',finished_at=now(),updated_at=now()
   where state='running' and started_at < now() - interval '20 minutes'`);
}
const server=createServer(async(req,res)=>{
 try{
  const uri=new URL(req.url||"/","http://internal");
  if(req.method==="GET"&&uri.pathname==="/healthz"){
   const live=healthy&&!shuttingDown;
   res.writeHead(live?200:503,{"Content-Type":"application/json","Cache-Control":"no-store"});
   res.end(JSON.stringify({ok:live,engine:"Margaryan Motion Studio",rendering:jobInProcess}));return;
  }
  const match=/^\/file\/([a-f0-9-]{36})$/i.exec(uri.pathname);
  if(req.method!=="GET"||!match){res.writeHead(404);res.end();return;}
  if(!authorized(req.headers.authorization)){res.writeHead(401);res.end();return;}
  const id=match[1];
  if(!UUID.test(id)){res.writeHead(400);res.end();return;}
  const result=await db.query("select state from motion_render_jobs where id=$1",[id]);
  if(result.rows[0]?.state!=="complete"){res.writeHead(404);res.end();return;}
  const file=join(DIR,id+".mp4");
  const fileStat=await stat(file);
  if(!fileStat.isFile()||fileStat.size<5000||fileStat.size>120_000_000)
   throw Error("invalid rendered MP4");
  res.writeHead(200,{"Content-Type":"video/mp4","Content-Length":fileStat.size,
   "Content-Disposition":'attachment; filename="motion-'+id+'.mp4"',
   "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  await pipeline(createReadStream(file),res);
 }catch{
  if(!res.headersSent){res.writeHead(503);res.end();}
  else res.destroy();
 }
});
server.listen(PORT,"0.0.0.0");
async function execute(cmd,args,{timeout=MAX_SECONDS*1000}={}){
 return new Promise((resolvePromise,reject)=>{
  const child=spawn(cmd,args,{cwd:process.cwd(),env:{
   ...process.env,NEXT_TELEMETRY_DISABLED:"1",
   PLAYWRIGHT_BROWSERS_PATH:"/ms-playwright"
  },stdio:["ignore","pipe","pipe"]});
  let stderr="",stdout="";
  child.stdout.on("data",chunk=>{stdout=(stdout+String(chunk)).slice(-7500);});
  child.stderr.on("data",chunk=>{stderr=(stderr+String(chunk)).slice(-7500);});
  const timer=setTimeout(()=>child.kill("SIGKILL"),timeout);
  child.once("error",e=>{clearTimeout(timer);reject(e);});
  child.once("close",code=>{
   clearTimeout(timer);
   if(code===0)resolvePromise({stdout,stderr});
   else reject(new Error("command_failed_"+code+": "+stderr.slice(-900)));
  });
 });
}
async function launchStudio(){
 const nextExecutable=resolve("node_modules/next/dist/bin/next");
 studio=spawn(process.execPath,[nextExecutable,"start","-H","127.0.0.1","-p",String(STUDIO_PORT)],{
  cwd:process.cwd(),env:{...process.env,NEXT_TELEMETRY_DISABLED:"1"},
  stdio:["ignore","pipe","pipe"]
 });
 studio.stdout.on("data",chunk=>log("info",String(chunk).slice(0,130)));
 studio.stderr.on("data",chunk=>log("warn",String(chunk).slice(0,130)));
 for(let i=0;i<55;i++){
  if(studio.exitCode!==null)throw Error("Next renderer exited");
  try{
   const answer=await fetch("http://127.0.0.1:"+STUDIO_PORT+"/motion",{
    signal:AbortSignal.timeout(1500)});
   if(answer.ok)return;
  }catch{}
  await delay(1000);
 }
 throw Error("Motion Studio engine did not start");
}
async function work(){
 const claim=await db.query(`update motion_render_jobs
 set state='running',started_at=now(),updated_at=now()
 where id=(select id from motion_render_jobs where state='queued'
 order by created_at for update skip locked limit 1)
 returning id,preset`);
 const task=claim.rows[0];if(!task)return;
 jobInProcess=true;const id=task.id,file=join(DIR,id+".mp4");
 let error="render_failed";
 try{
  if(!UUID.test(id)||task.preset!=="promptence_cinema")throw Error("preset_not_allowed");
  if((await stat(TEMPLATE)).size>20000)throw Error("invalid_preset");
  log("info","render_started:"+id);
  await execute(process.execPath,[
   resolve("scripts/motion/render-master.mjs"),TEMPLATE,file,
   "--url","http://127.0.0.1:"+STUDIO_PORT+"/motion",
   "--fps","24","--crf","21"
  ],{timeout:MAX_SECONDS*1000});
  const fileInfo=await stat(file);
  if(!fileInfo.isFile()||fileInfo.size<5000||fileInfo.size>120_000_000)
   throw Error("invalid_output");
  const probe=await execute("ffprobe",["-v","error","-select_streams","v:0",
   "-show_entries","stream=codec_name,width,height","-of","json",file],{timeout:15000});
  const stream=JSON.parse(probe.stdout).streams?.[0];
  if(stream?.codec_name!=="h264"||stream?.width!==1080||stream?.height!==1920)
   throw Error("invalid_h264");
  // Completion means the ACTUAL decoded AAC has passed technical quality QA.
  // Motion master writes this report after measuring FFmpeg's final MP4 bytes.
  const reportPath=file.replace(/\.mp4$/i,".render-report.json");
  const reportStat=await stat(reportPath);
  if(!reportStat.isFile()||reportStat.size>250_000)
   throw Error("sound_qa_missing");
  const report=JSON.parse(await readFile(reportPath,"utf8"));
  if(report.audioIncluded!==true||report.soundQA?.state!=="measured"||
     report.soundQA?.humanListeningRequired!==true||
     report.finalMasterHumanReviewRequired!==true)
   throw Error("sound_qa_not_cleared");
  const audioQuality=report.soundQA.measurement;
  if(!Number.isFinite(audioQuality?.integratedLUFS)||
     !Number.isFinite(audioQuality?.truePeakDBTP))
   throw Error("sound_qa_bad_measurement");
  log("info","sound_qa_measured:"+id+":LUFS="+audioQuality.integratedLUFS+
    ":DBTP="+audioQuality.truePeakDBTP);
  await db.query(`update motion_render_jobs set state='complete',
   output_bytes=$2,finished_at=now(),updated_at=now()
   where id=$1 and state='running'`,[id,fileInfo.size]);
  log("info","render_complete:"+id+":"+fileInfo.size);
 }catch(e){
  error=e instanceof Error&&/timeout|SIGKILL/i.test(e.message)?"render_timeout":"render_failed";
  log("error","render_failed:"+id+":"+error);
  await unlink(file).catch(()=>{});
  await db.query(`update motion_render_jobs set state='failed',
   error_code=$2,finished_at=now(),updated_at=now()
   where id=$1 and state='running'`,[id,error]).catch(()=>{});
 }finally{jobInProcess=false;}
}
async function cleanOldFiles(){
 for(const item of await readdir(DIR,{withFileTypes:true})){
  // Sidecars include private director frames, cue text and soundtrack; they
  // must expire alongside the MP4, not accumulate on the paid private volume.
  if(!item.isFile()||!/^([a-f0-9-]{36})(?:\.mp4|\.director\.motion\.json|\.director-audit\.json|\.director-contact-sheet\.png|\.score\.wav|\.render-report\.json|\.srt|\.vtt|-narration-guide\.txt|-contact-sheet\.jpg)$/i.test(item.name))continue;
  const p=join(DIR,item.name);
  const s=await stat(p);
  if(Date.now()-s.mtimeMs>7*86400000)await unlink(p).catch(()=>{});
 }
}
process.on("SIGTERM",()=>{shuttingDown=true;studio?.kill("SIGTERM");server.close();});
process.on("SIGINT",()=>{shuttingDown=true;studio?.kill("SIGTERM");server.close();});
try{
 await setupDb();
 // One-time owner-authorized first mastering smoke: only when explicitly
 // configured on Railway, only if the isolated queue has never been used.
 // This consumes ONE of the same 3 daily slots and uses our fixed original cut.
 if(process.env.MOTION_RENDER_FIRST_MASTER_TEST==="true"){
  const existing=await db.query("select count(*)::int as count from motion_render_jobs");
  if(Number(existing.rows[0]?.count||0)===0){
   const {randomUUID}=await import("node:crypto");
   await db.query("insert into motion_render_jobs(id,preset,state) values($1,'promptence_cinema','queued')",[randomUUID()]);
   log("info","first_master_smoke_enqueued_once");
  }
 }
 await launchStudio();
 healthy=true;
 log("info","worker_ready_internal_only");
 let lastClean=0;
 while(!shuttingDown){
  try{
   await work();
   if(Date.now()-lastClean>3600000){await cleanOldFiles();lastClean=Date.now();}
  }catch(e){healthy=false;log("error","queue_poll_error");await delay(3000);healthy=true;}
  await delay(3500);
 }
}finally{
 healthy=false;
 studio?.kill("SIGTERM");server.close();await db.end();
}
