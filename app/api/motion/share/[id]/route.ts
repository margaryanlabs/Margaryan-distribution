import {getMotionRenderJob,validJobId} from "@/lib/motion/cloud-render-queue";
import {verifyMotionShare} from "@/lib/motion/owner-oauth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const h={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer"};
const fail=(message:string,status:number)=>Response.json({error:message},{status,headers:h});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const u=new URL(request.url);
 const exp=Number(u.searchParams.get("exp")||"0"),sig=u.searchParams.get("sig")||"";
 if(!validJobId(id)||!verifyMotionShare(id,exp,sig))return fail("expired_or_invalid_link",403);
 if(process.env.MOTION_RENDER_ENABLED!=="true")return fail("worker_unavailable",503);
 const privateHost=process.env.MOTION_WORKER_INTERNAL_URL||"";
 const secret=process.env.MOTION_WORKER_INTERNAL_SECRET||"";
 if(!/^http:\/\/[a-z0-9.-]+\.railway\.internal:\d+$/.test(privateHost)||secret.length<32)
  return fail("worker_unavailable",503);
 try{
  const job=await getMotionRenderJob(id);
  if(!job||job.state!=="complete")return fail("file_not_available",404);
  const result=await fetch(privateHost+"/file/"+id,{
   cache:"no-store",headers:{Authorization:"Bearer "+secret},
   signal:AbortSignal.timeout(120000)
  });
  if(!result.ok||!result.body)return fail("file_not_available",503);
  const outgoing=new Headers(h);
  outgoing.set("Content-Type","video/mp4");
  outgoing.set("Content-Disposition",'attachment; filename="Margaryan-Motion-'+id+'.mp4"');
  if(job.output_bytes)outgoing.set("Content-Length",String(job.output_bytes));
  return new Response(result.body,{headers:outgoing});
 }catch{return fail("file_not_available",503);}
}
