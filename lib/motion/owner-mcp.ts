import {createMcpHandler,McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import {queueMotionRender,getMotionRenderJob,latestMotionRenderJobs,publicRenderJob} from "@/lib/motion/cloud-render-queue";
import {signedMotionShare,MOTION_OAUTH_ISSUER} from "@/lib/motion/owner-oauth";
const json=(x:unknown)=>({content:[{type:"text" as const,text:JSON.stringify(x,null,2)}]});
const read={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
export function createMotionOwnerServer(){
 const server=new McpServer({name:"margaryan-motion-studio-owner",version:"1.0.0"},{
  capabilities:{tools:{}},
  instructions:"Authenticated operator-only Motion Studio tools. Creating a film incurs Railway CPU/storage charges; the user must approve the action. The fixed Promptence film is REVIEW-ONLY, without professional TTS or certified media. Never describe a queued job as a rendered MP4."
 });
 server.registerTool("motion_owner_render_history",{
  title:"My Motion Render History",
  description:"See current state, quality warning and download readiness of your private Margaryan Motion Railway job queue. Requires owner OAuth.",
  inputSchema:z.object({}),
  annotations:read
 },async()=>{
  if(process.env.MOTION_RENDER_ENABLED!=="true")
   return {isError:true,content:[{type:"text",text:"Cloud render disabled."}]};
  try{return json({jobs:(await latestMotionRenderJobs()).map(publicRenderJob),
   billedExternallyByVideoProvider:false,
   computeProvider:"Railway (usage billed)",
   ownerAuthRequired:true,limitPer24h:3});
  }catch{return {isError:true,content:[{type:"text",text:"Private render queue unavailable."}]};}
 });
 server.registerTool("motion_owner_render_status",{
  title:"Private Motion MP4 Render Status",
  description:"Check an actual render by UUID; report queued/running/complete/failed without inventing output.",
  inputSchema:z.object({id:z.string().uuid()}),
  annotations:read
 },async({id})=>{
  try{
   const job=await getMotionRenderJob(id);
   if(!job)return {isError:true,content:[{type:"text",text:"Render job not found."}]};
   return json({job:publicRenderJob(job),actualMP4Rendered:job.state==="complete",
    mustReviewFinalFilm:true});
  }catch{return {isError:true,content:[{type:"text",text:"Cannot read private Motion job."}]};}
 });
 server.registerTool("motion_owner_render_create",{
  title:"Create MP4 With Our Motion Engine — Railway Compute",
  description:"Owner-authorized ACTION: queue ONE fixed Promptence 36-second H264/AAC video on our own Railway Chromium/FFmpeg. Uses billable Railway compute/storage; 1 concurrent job, max 3 in 24h. Do not call without the user's explicit request and confirmation. No real scan, no user files, no third-party generator. Draft needs quality review.",
  inputSchema:z.object({
   preset:z.literal("promptence_cinema"),
   acknowledge_railway_compute_charges:z.literal(true),
   confirm_review_draft:z.literal(true)
  }),annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false,openWorldHint:false}
 },async()=>{
  if(process.env.MOTION_RENDER_ENABLED!=="true")
   return {isError:true,content:[{type:"text",text:"Motion worker is disabled."}]};
  try{
   const job=await queueMotionRender();
   return json({accepted:true,job:publicRenderJob(job),engine:"OWN MARGARYAN MOTION",
    quality:"review-draft",message:"Railway render queued, not yet complete; check motion_owner_render_status.",
    billedProvider:"Railway CPU, RAM and private volume",videoGeneratorUsed:"none",
    narrationIncluded:false,originalMotionMusic:true});
  }catch(e){
   const reason=e instanceof Error?e.message:"unknown";
   return {isError:true,content:[{type:"text",text:
    reason==="MOTION_RENDER_QUEUE_BUSY"?"One film is already in progress.":
    reason==="MOTION_RENDER_DAILY_LIMIT"?"The 3 renders/24 h owner budget gate has been reached.":
    "Could not queue an MP4. No completed render was reported."}]};
  }
 });
 server.registerTool("motion_owner_download_link",{
  title:"Generate Time-Limited Motion MP4 Download Link",
  description:"For a completed PRIVATE Motion job, create a short-lived 5-minute signed HTTPS download URL to hand to the owner. Anyone holding that URL until expiry could download the film; only share on owner's request.",
  inputSchema:z.object({id:z.string().uuid(),
   acknowledge_temporary_link_visibility:z.literal(true)}),
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}
 },async({id})=>{
  try{
   const job=await getMotionRenderJob(id);
   if(!job||job.state!=="complete")return {isError:true,content:[{type:"text",text:"MP4 not finished or not found."}]};
   const exp=Math.floor(Date.now()/1000)+300;
   const sig=signedMotionShare(id,exp);
   return json({id,link:MOTION_OAUTH_ISSUER+"/api/motion/share/"+id+"?exp="+exp+"&sig="+sig,
    expiresInSeconds:300,requiresHumanReview:true,
    warning:"Secret-bearing link: anyone with URL may download until expiry. This video is not approved commercial content."});
  }catch{return {isError:true,content:[{type:"text",text:"Private download link unavailable."}]};}
 });
 return server;
}
export const ownerMotionMcpHandler=createMcpHandler(createMotionOwnerServer,{legacy:"stateless"});
