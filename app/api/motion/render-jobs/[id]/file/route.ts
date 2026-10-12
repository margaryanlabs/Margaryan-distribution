import {getMotionRenderJob} from "@/lib/motion/cloud-render-queue";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const BASE_HEADERS={"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"};
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 if(process.env.MOTION_RENDER_ENABLED!=="true")
  return Response.json({error:"render_service_disabled"},{status:503,headers:BASE_HEADERS});
 const secret=process.env.MOTION_WORKER_INTERNAL_SECRET;
 const base=process.env.MOTION_WORKER_INTERNAL_URL;
 if(!secret||!base||!/^http:\/\/[a-z0-9.-]+\.railway\.internal:\d+$/.test(base))
  return Response.json({error:"worker_not_configured"},{status:503,headers:BASE_HEADERS});
 try{
  const {id}=await params;
  const job=await getMotionRenderJob(id);
  if(!job)return Response.json({error:"not_found"},{status:404,headers:BASE_HEADERS});
  if(job.state!=="complete")
   return Response.json({error:"video_not_finished"},{status:409,headers:BASE_HEADERS});
  // The token is server-side ONLY; browser never sees the private Railway host.
  const r=await fetch(base+"/file/"+encodeURIComponent(job.id),{
   headers:{authorization:"Bearer "+secret},
   cache:"no-store",signal:AbortSignal.timeout(120000)
  });
  if(!r.ok||!r.body)
   return Response.json({error:"video_temporarily_unavailable"},{status:503,headers:BASE_HEADERS});
  const h=new Headers(BASE_HEADERS);
  h.set("Content-Type","video/mp4");
  h.set("Content-Disposition",'attachment; filename="motion-studio-'+job.id+'.mp4"');
  if(job.output_bytes)h.set("Content-Length",String(job.output_bytes));
  return new Response(r.body,{status:200,headers:h});
 }catch{return Response.json({error:"download_unavailable"},{status:503,headers:BASE_HEADERS});}
}
