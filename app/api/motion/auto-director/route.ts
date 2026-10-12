import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {generateAiMotionProject,motionAiDirectorAvailable,motionAiDirectorLimits,motionAiRemaining} from "@/lib/motion/ai-director";
import {type DirectorBrief} from "@/lib/motion/director";
import {latestMotionRenderJobs,queueMotionRender,publicRenderJob} from "@/lib/motion/cloud-render-queue";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BODY=2200;
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer"};
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
function same(a:string,b:string){
 const x=Buffer.from(a,"utf8"),y=Buffer.from(b,"utf8");
 return x.length===y.length&&timingSafeEqual(x,y);
}
function ownerOnly(request:Request){
 const user=process.env.DISTRIBUTION_BASIC_USER,password=process.env.DISTRIBUTION_BASIC_PASSWORD;
 if(!user||!password)return false;
 const header=request.headers.get("authorization")||"";
 if(!header.startsWith("Basic ")||header.length>700)return false;
 try{
  const credentials=Buffer.from(header.slice(6),"base64").toString("utf8");
  const colon=credentials.indexOf(":");
  return colon>=0&&same(credentials.slice(0,colon),user)&&same(credentials.slice(colon+1),password);
 }catch{return false;}
}
function sameOrigin(request:Request){
 try{
  const origin=request.headers.get("origin");
  return !!origin&&new URL(origin).origin===new URL(request.url).origin;
 }catch{return false;}
}
export async function GET(request:Request){
 if(!ownerOnly(request))return respond({error:"owner_login_required"},401);
 const limits=motionAiDirectorLimits();
 if(!limits.enabled)return respond({...limits,remaining:0,
  note:"Owner AI director is disabled. Native code-based film creation remains free and available."});
 try{return respond({...limits,remaining:await motionAiRemaining()});}
 catch{return respond({...limits,enabled:false,remaining:0,error:"quota_store_unavailable"},503);}
}
export async function POST(request:Request){
 if(!ownerOnly(request))return respond({error:"owner_login_required"},401);
 if(!sameOrigin(request))return respond({error:"same_origin_required"},403);
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")
  return respond({error:"json_required"},415);
 if(Number(request.headers.get("content-length")||"0")>MAX_BODY)
  return respond({error:"brief_too_large"},413);
 if(!motionAiDirectorAvailable())return respond({error:"ai_director_disabled"},503);
 let input:{approveTextModelCharge?:unknown;approveCloudRender?:unknown;brief?:DirectorBrief};
 try{
  const raw=await request.text();
  if(raw.length>MAX_BODY)return respond({error:"brief_too_large"},413);
  input=JSON.parse(raw);
 }catch{return respond({error:"invalid_json"},400);}
 if(!input||Array.isArray(input)||input.approveTextModelCharge!==true)
  return respond({error:"explicit_cost_approval_required"},403);
 const requestedRender=input.approveCloudRender===true;
 if(input.approveCloudRender!==undefined&&input.approveCloudRender!==false&&input.approveCloudRender!==true)
  return respond({error:"invalid_render_consent"},400);
 const brief=input.brief;
 if(!brief||typeof brief!=="object"||Array.isArray(brief)||
    typeof brief.prompt!=="string"||brief.prompt.trim().length<12||
    brief.prompt.length>650||!brief.brand||!brief.format)
  return respond({error:"invalid_brief"},400);
 try{
  if(requestedRender){
   if(process.env.MOTION_RENDER_ENABLED!=="true")return respond({error:"render_service_disabled"},503);
   const recent=await latestMotionRenderJobs();
   if(recent.some(j=>j.state==="queued"||j.state==="running"))
    return respond({error:"one_render_at_a_time"},429);
   const now=Date.now();
   if(recent.filter(j=>now-new Date(j.created_at).getTime()<86_400_000).length>=3)
    return respond({error:"daily_render_limit_3"},429);
  }
  const result=await generateAiMotionProject(brief);
  if(!requestedRender)return respond(result);
  const queued=await queueMotionRender(result.project);
  return respond({...result,rendered:false,queued:true,job:publicRenderJob(queued),
    reviewRequired:true,commerciallyApproved:false},202);
 }catch(e){
  const message=e instanceof Error?e.message:"ai_generation_failed";
  if(message==="ai_daily_limit")return respond({error:"ai_daily_limit_8"},429);
  if(message==="MOTION_RENDER_QUEUE_BUSY")return respond({error:"one_render_at_a_time",modelChargeMayHaveOccurred:true},429);
  if(message==="MOTION_RENDER_DAILY_LIMIT")return respond({error:"daily_render_limit_3",modelChargeMayHaveOccurred:true},429);
  if(message==="invalid_brief"||message==="invalid_brand_or_format"||message==="invalid_language"||message==="invalid_style")
   return respond({error:message},400);
  if(message==="ai_director_disabled")return respond({error:message},503);
  // Do not leak third-party errors, operator keys or prompt content.
  return respond({error:"ai_director_failed",message:"The model did not return a valid film. No MP4 was created."},502);
 }
}
