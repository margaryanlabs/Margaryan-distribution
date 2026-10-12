import {Pool} from "pg";
import {randomUUID} from "node:crypto";
import {sanitizeMotionProject,type MotionProject} from "./studio";

/** Isolated, durable private queue for the OWN Motion Chromium/FFmpeg engine. */
export type MotionRenderState="queued"|"running"|"complete"|"failed";
export interface MotionRenderJob {
 id:string; preset:"promptence_cinema"|"owner_ai"; state:MotionRenderState;
 project_json:unknown|null;
 created_at:string;updated_at:string;started_at:string|null;finished_at:string|null;
 output_bytes:string|null;error_code:string|null;
}
declare global{var __motionRenderPg:Pool|undefined;var __motionRenderSchema:Promise<void>|undefined;}
const SAFE_KINDS=new Set(["opener","statement","network","kinetic","orbit","spatial","closer"]);
/** The worker receives only an intentionally tiny scene grammar, never HTML,
 * executable source, external media paths or arbitrary image/video references.
 */
export function validateOwnerMotionProject(raw:unknown):MotionProject{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))
  throw Error("invalid_owner_project");
 const obj=raw as Record<string,unknown>;
 const serialized=JSON.stringify(obj);
 if(!serialized||serialized.length>16000)throw Error("invalid_owner_project_size");
 if(/"(?:mediaId|overlayMediaId|screenMediaId|sourceUrl|mediaUrl|filePath|html|script|code|url)"\s*:/i.test(serialized))
  throw Error("owner_project_media_not_allowed");
 if(!Array.isArray(obj.scenes)||obj.scenes.length<5||obj.scenes.length>8)
  throw Error("owner_project_scene_count");
 if(!["portrait","square","landscape"].includes(String(obj.format)))
  throw Error("owner_project_format");
 if(!["promptence","veto","raios","labs","ingu","meqena","suren","veto_private",
  "veto_sport","armat","tun","hay_engine","reality_engine"].includes(String(obj.brand)))
  throw Error("owner_project_brand");
 const safeScenes=obj.scenes.map((entry:unknown,i:number)=>{
  if(!entry||typeof entry!=="object"||Array.isArray(entry))
   throw Error("owner_project_scene_invalid");
  const scene=entry as Record<string,unknown>;
  if(!SAFE_KINDS.has(String(scene.kind))||typeof scene.headline!=="string"||
    scene.headline.trim().length<3||scene.headline.length>100||
    typeof scene.seconds!=="number"||scene.seconds<2||scene.seconds>8)
   throw Error("owner_project_scene_invalid");
  const bound=(val:unknown,max:number)=>typeof val==="string"?val.slice(0,max):"";
  return {
   id:"scene-"+(i+1),kind:scene.kind,
   headline:bound(scene.headline,100),
   eyebrow:bound(scene.eyebrow,65),
   support:bound(scene.support,150),
   seconds:scene.seconds,
   camera:["inherit","locked","push","pull","drift"].includes(String(scene.camera))?scene.camera:"inherit",
   transition:["auto","dissolve","wipe","slash","cut","zoom","flash","slide","grid"].includes(String(scene.transition))
    ?scene.transition:"auto",
   titleTreatment:["editorial","mask","kinetic","minimal"].includes(String(scene.titleTreatment))
    ?scene.titleTreatment:"editorial"
  };
 });
 const total=safeScenes.reduce((sum,scene)=>sum+scene.seconds,0);
 if(total>60||total<15)throw Error("owner_project_timeline_invalid");
 const project=sanitizeMotionProject({
  version:1,brand:obj.brand,format:obj.format,
  language:["ru","en","hy"].includes(String(obj.language))?obj.language:"ru",
  style:["cinematic","kinetic","technical"].includes(String(obj.style))?obj.style:"cinematic",
  title:typeof obj.title==="string"?obj.title.slice(0,125):"MARGARYAN ORIGINAL",
  qualityMode:"signature",filmChrome:"clean",scenes:safeScenes
 });
 if(project.scenes.some(scene=>scene.mediaId||scene.overlayMediaId||scene.kind==="screen"))
  throw Error("owner_project_source_blocked");
 return project;
}
function pool(){
 const url=(process.env.DISTRIBUTION_DATABASE_URL||"").trim();
 if(!url)throw Error("MOTION_RENDER_DATABASE_UNAVAILABLE");
 if(!globalThis.__motionRenderPg)globalThis.__motionRenderPg=new Pool({
  connectionString:url,max:3,connectionTimeoutMillis:9000,
  idleTimeoutMillis:20000,allowExitOnIdle:true
 });
 return globalThis.__motionRenderPg;
}
export async function motionRenderDb(){
 if(!globalThis.__motionRenderSchema){
  globalThis.__motionRenderSchema=pool().query(`
   create table if not exists motion_render_jobs (
    id uuid primary key,
    preset text not null check (preset in ('promptence_cinema','owner_ai')),
    state text not null check (state in ('queued','running','complete','failed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    output_bytes bigint,
    error_code text
   );
   alter table motion_render_jobs drop constraint if exists motion_render_jobs_preset_check;
   alter table motion_render_jobs add constraint motion_render_jobs_preset_check
    check (preset in ('promptence_cinema','owner_ai'));
   alter table motion_render_jobs add column if not exists project_json jsonb;
   create index if not exists motion_render_jobs_recent on motion_render_jobs(created_at desc);
  `).then(()=>undefined).catch(e=>{globalThis.__motionRenderSchema=undefined;throw e;});
 }
 await globalThis.__motionRenderSchema;
 return pool();
}
export function validJobId(id:string){
 return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
}
export function publicRenderJob(row:MotionRenderJob){
 return {
  id:row.id,preset:row.preset,state:row.state,
  createdAt:row.created_at,startedAt:row.started_at,finishedAt:row.finished_at,
  bytes:row.output_bytes?Number(row.output_bytes):null,
  errorCode:row.error_code,
  reviewRequired:true,commerciallyApproved:false,
  ...(row.state==="complete"?{download:"/api/motion/render-jobs/"+row.id+"/file"}:{})
 };
}
export async function queueMotionRender(ownerProject?:MotionProject){
 const project=ownerProject?validateOwnerMotionProject(ownerProject):null;
 const db=await motionRenderDb();
 const connection=await db.connect();
 try{
  await connection.query("begin");
  await connection.query("select pg_advisory_xact_lock(263404, 20261012)");
  const active=await connection.query<{count:string}>(`
   select count(*)::text as count from motion_render_jobs
   where state in ('queued','running')`);
  if(Number(active.rows[0].count)>=1)throw Error("MOTION_RENDER_QUEUE_BUSY");
  const daily=await connection.query<{count:string}>(`
   select count(*)::text as count from motion_render_jobs
   where created_at > now() - interval '24 hours'`);
  if(Number(daily.rows[0].count)>=3)throw Error("MOTION_RENDER_DAILY_LIMIT");
  const id=randomUUID();
  const result=await connection.query<MotionRenderJob>(`
   insert into motion_render_jobs(id,preset,state,project_json)
    values($1,$2,'queued',$3::jsonb)
   returning *`,[id,project?"owner_ai":"promptence_cinema",project?JSON.stringify(project):null]);
  await connection.query("commit");
  return result.rows[0];
 }catch(e){await connection.query("rollback");throw e;}
 finally{connection.release();}
}
export async function getMotionRenderJob(id:string){
 if(!validJobId(id))return null;
 const db=await motionRenderDb();
 const result=await db.query<MotionRenderJob>(
  "select * from motion_render_jobs where id=$1 limit 1",[id]);
 return result.rows[0]||null;
}
export async function latestMotionRenderJobs(){
 const db=await motionRenderDb();
 const result=await db.query<MotionRenderJob>(
  "select * from motion_render_jobs order by created_at desc limit 12");
 return result.rows;
}
export async function claimMotionRenderJob(){
 const db=await motionRenderDb();
 const result=await db.query<MotionRenderJob>(`
  update motion_render_jobs set state='running',started_at=now(),updated_at=now()
  where id=(
   select id from motion_render_jobs where state='queued'
   order by created_at asc for update skip locked limit 1
  ) returning *`);
 return result.rows[0]||null;
}
export async function finishMotionRenderJob(id:string,ok:boolean,bytes=0,error=""){
 const db=await motionRenderDb();
 await db.query(`
  update motion_render_jobs
  set state=$2,finished_at=now(),updated_at=now(),output_bytes=$3,error_code=$4
  where id=$1 and state='running'`,[
   id,ok?"complete":"failed",ok?bytes:null,ok?null:error.slice(0,80)||"render_failed"
  ]);
}
export async function recoverStaleMotionRenders(){
 const db=await motionRenderDb();
 await db.query(`
  update motion_render_jobs set state='failed',error_code='worker_interrupted',
   finished_at=now(),updated_at=now()
  where state='running' and started_at < now() - interval '20 minutes'`);
}
