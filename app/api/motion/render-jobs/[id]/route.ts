import {NextResponse} from "next/server";
import {getMotionRenderJob,publicRenderJob} from "@/lib/motion/cloud-render-queue";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(process.env.MOTION_RENDER_ENABLED!=="true")return NextResponse.json({error:"render_service_disabled"},{status:503,headers});
 try{
  const {id}=await params;
  const job=await getMotionRenderJob(id);
  if(!job)return NextResponse.json({error:"not_found"},{status:404,headers});
  return NextResponse.json({job:publicRenderJob(job)},{headers});
 }catch{return NextResponse.json({error:"render_store_unavailable"},{status:503,headers});}
}
