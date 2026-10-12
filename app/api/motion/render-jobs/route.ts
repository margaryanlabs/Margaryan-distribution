import {NextResponse} from "next/server";
import {latestMotionRenderJobs,queueMotionRender,publicRenderJob} from "@/lib/motion/cloud-render-queue";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"};
const answer=(x:unknown,status=200)=>NextResponse.json(x,{status,headers});
function originMatches(request:Request){
 try{
  const origin=request.headers.get("origin");
  // Browser-initiated writes must have an exact same-origin Origin.
  return !!origin && new URL(origin).origin===new URL(request.url).origin;
 }catch{return false;}
}
export async function GET(){
 try{
  if(process.env.MOTION_RENDER_ENABLED!=="true")return answer({enabled:false,jobs:[]});
  return answer({enabled:true,engine:"Margaryan Motion Studio Chromium/FFmpeg",
   limit:{concurrent:1,per24Hours:3},jobs:(await latestMotionRenderJobs()).map(publicRenderJob)});
 }catch{return answer({enabled:false,error:"render_store_unavailable"},503);}
}
export async function POST(request:Request){
 if(process.env.MOTION_RENDER_ENABLED!=="true")
  return answer({error:"render_service_disabled"},503);
 if(!originMatches(request))return answer({error:"same_origin_required"},403);
 if(request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()!=="application/json")
  return answer({error:"json_required"},415);
 if(Number(request.headers.get("content-length")||0)>1000)
  return answer({error:"request_too_large"},413);
 try{
  const raw=await request.text();
  if(raw.length>1000)return answer({error:"request_too_large"},413);
  const body=JSON.parse(raw) as Record<string,unknown>;
  // No public URL, filesystem paths, user media or arbitrary project scripts.
  if(!body||Array.isArray(body)||Object.keys(body).length!==1||
     body.preset!=="promptence_cinema")
   return answer({error:"unsupported_preset"},400);
  const created=await queueMotionRender();
  return answer({accepted:true,job:publicRenderJob(created),
    warning:"Private original Motion Cinema review draft. Music generated locally; natural narration and final approval are not included."},202);
 }catch(e){
  if(e instanceof Error&&e.message==="MOTION_RENDER_QUEUE_BUSY")
   return answer({error:"one_render_at_a_time"},429);
  if(e instanceof Error&&e.message==="MOTION_RENDER_DAILY_LIMIT")
   return answer({error:"daily_budget_limit_3"},429);
  return answer({error:"render_queue_unavailable"},503);
 }
}
