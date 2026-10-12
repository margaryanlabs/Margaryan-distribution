import {NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {generateAiMotionProject,motionAiDirectorAvailable,motionAiDirectorLimits,motionAiRemaining} from "@/lib/motion/ai-director";
import {type DirectorBrief} from "@/lib/motion/director";

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
 let input:{approveTextModelCharge?:unknown;brief?:DirectorBrief};
 try{
  const raw=await request.text();
  if(raw.length>MAX_BODY)return respond({error:"brief_too_large"},413);
  input=JSON.parse(raw);
 }catch{return respond({error:"invalid_json"},400);}
 if(!input||Array.isArray(input)||input.approveTextModelCharge!==true)
  return respond({error:"explicit_cost_approval_required"},403);
 const brief=input.brief;
 if(!brief||typeof brief!=="object"||Array.isArray(brief)||
    typeof brief.prompt!=="string"||brief.prompt.trim().length<12||
    brief.prompt.length>650||!brief.brand||!brief.format)
  return respond({error:"invalid_brief"},400);
 try{
  const result=await generateAiMotionProject(brief);
  return respond(result);
 }catch(e){
  const message=e instanceof Error?e.message:"ai_generation_failed";
  if(message==="ai_daily_limit")return respond({error:"ai_daily_limit_8"},429);
  if(message==="invalid_brief"||message==="invalid_brand_or_format"||message==="invalid_language"||message==="invalid_style")
   return respond({error:message},400);
  if(message==="ai_director_disabled")return respond({error:message},503);
  // Do not leak third-party errors, operator keys or prompt content.
  return respond({error:"ai_director_failed",message:"The model did not return a valid film. No MP4 was created."},502);
 }
}
