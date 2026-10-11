/**
 * First-party Margaryan Motion Studio MCP server.
 *
 * Actual Streamable HTTP MCP (SDK v2, modern + legacy stateless). These tools
 * manipulate PUBLIC-ONLY editorial project JSON in request memory; they are
 * read-only relative to our server storage. Video requires an operator/worker:
 * NO fake render statuses, no external generator, no arbitrary filesystem,
 * no access to customer data or credentials, no hidden agent subscriptions.
 */
import {createMcpHandler,McpServer} from "@modelcontextprotocol/server";
import {z} from "zod";
import {BRAND_INFO, sanitizeMotionProject, durationOf, type MotionBrand,
 type MotionFormat, type MotionProject} from "@/lib/motion/studio";
import {createKeylessStoryboard} from "@/lib/motion/director";
import {createPromptenceCampaign,createPromptenceSignature} from "@/lib/motion/signature-promptence";
import {makeProductionPack} from "@/lib/motion/production-pack";
import {previewChatMotionPack,createChatMotionPack} from "@/lib/motion/chat-operator";
import {prepareStudioFilm} from "@/lib/motion/start-film";

const FORMAT=z.enum(["portrait","landscape","square"]);
const LANGUAGE=z.enum(["ru","en","hy"]);
const BRAND=z.enum([
 "promptence","veto","raios","labs","ingu","meqena","suren",
 "veto_private","veto_sport","armat","tun","hay_engine","reality_engine"
]);
const json=(value:unknown)=>({content:[{type:"text" as const,text:JSON.stringify(value,null,2)}]});
const readOnly={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const PUBLIC_MODES=[
 {mode:"campaign",pipeline:"native Motion Canvas/3D; local FFmpeg export"},
 {mode:"interaction",pipeline:"Playwright real clicks, native editor and interaction score"},
 {mode:"signature",pipeline:"curated Promptence cinematic timeline"},
 {mode:"product",pipeline:"original approved video/image files required"},
 {mode:"feature",pipeline:"multi-chapter operator-based film"}
] as const;

export function createMotionMcpServer(){
 const server=new McpServer({name:"margaryan-motion-studio",version:"1.0.0"},{
  capabilities:{tools:{}},instructions:
   "Motion Studio makes source-honest film projects. Public MCP tools create and review storyboard JSON ONLY, not final video. " +
   "Never claim an MP4 was rendered by calling storyboard, preview or QA. Actual source media, voice and music need an approved worker/operator. " +
   "All output must be reviewed before commercial publishing."
 });
 server.registerTool("motion_studio_capabilities",{
  title:"Motion Studio Capabilities",
  description:"Read the current first-party Margaryan Motion production capabilities and verify which steps require an actual renderer, voice and approved sources.",
  inputSchema:z.object({}),
  annotations:readOnly
 },async()=>json({
  studio:"Margaryan Motion Studio",protocol:"MCP Streamable HTTP",mode:"public-director",
  connectedThrough:"first-party /api/motion/mcp",apiCredits:0,
  filmModes:PUBLIC_MODES,
  publicDirectorReady:true,storyboardAndPatchReady:true,
  operatorOnly:["browser interaction capture","FFmpeg master","voice synthesis","third-party licensed music","final approval"],
  remoteVideoRenderReady:false,remoteRenderJobsConfigured:false,
  canWriteProjectsToCloud:false,canAccessBrowserMedia:false,
  downloadNote:"Tools return authentic motion-chat-v1 JSON for review/import. MCP connection and production worker are separate authorization steps.",
  reason:"Vercel serverless cannot safely host long-running Chromium/FFmpeg film rendering; owner-authorized persistent compute and result storage must be separately configured."
 }));
 server.registerTool("motion_create_project",{
  title:"Create Editable Motion Project",
  description:"Create a genuine keyless editable Margaryan Motion film storyboard and shot-by-shot production brief. Does NOT render an MP4, does not access private media or execute AI provider APIs.",
  inputSchema:z.object({
   brief:z.string().min(8).max(650).describe("Public-safe creative brief only; no customer details or secrets"),
   brand:BRAND,
   format:FORMAT.default("portrait"),
   language:LANGUAGE.default("ru"),
   style:z.enum(["cinematic","kinetic","technical"]).default("cinematic")
  }),annotations:readOnly
 },async({brief,brand,format,language,style})=>{
  const film=createKeylessStoryboard({prompt:brief,brand:brand as MotionBrand,
   format:format as MotionFormat,language,style});
  const project=sanitizeMotionProject({...film,filmChrome:"clean"});
  return json({
   type:"motion_storyboard",rendered:false,persisted:false,
   project,chatPack:createChatMotionPack(project),
   production:makeProductionPack(project),
   notes:["Public-safe text/graphics proposal. Real product results are never generated.",
    "Review and attach original videos/images in Motion Studio before final rendering.",
    "MCP does not pay for or run a render worker."]});
 });
 server.registerTool("motion_promptence_cut",{
  title:"Create Promptence Film Cut",
  description:"Get original Promptence cinematic/campaign or real-interaction EDIT PLAN. The real-click plan needs separately captured authentic browser footage; this call never clicks a website.",
  inputSchema:z.object({
   cut:z.enum(["campaign","signature","interaction"]),
   format:FORMAT.default("portrait"),
   language:LANGUAGE.default("en")
  }),annotations:readOnly
 },async({cut,format,language})=>{
  const project=cut==="interaction"
   ?prepareStudioFilm({kind:"interaction",brand:"promptence",format:"portrait",language,brief:""})
   :cut==="campaign"
    ?createPromptenceCampaign(language,format)
    :createPromptenceSignature(language,format);
  return json({cut,rendered:false,sourceVideoAttached:false,
   project:sanitizeMotionProject({...project,filmChrome:"clean"}),
   production:makeProductionPack(project),
   operatorInstructions:cut==="interaction"
    ?"For actual browser clicks run npm run motion:interaction -- --out out/motion/promptence-interaction on an authorized worker. Attach real MP4 in Motion Studio."
    :"Review claims and original visual/auditory sources, then export with the native Motion renderer.",
   warning:"Storyboard is not a recorded MP4 or AI measurement result."});
 });
 server.registerTool("motion_review_project",{
  title:"Review Motion Storyboard",
  description:"Inspect a bounded editorial film project (not its actual pixels) for runtime, media requirements, repeated titles and narration estimates. Structural review is NOT an artistic or legal approval.",
  inputSchema:z.object({
   project:z.record(z.string(),z.unknown()).describe("Motion project JSON without private files, secrets or customer data")
  }),annotations:readOnly
 },async({project:input})=>{
  const original=JSON.stringify(input);
  if(original.length>18000||!Array.isArray(input.scenes)||input.scenes.length<1||input.scenes.length>8)
   return {isError:true,content:[{type:"text",text:"Rejected: Motion project must contain 1–8 shots and <=18KB of public editorial JSON."}]};
  const project=sanitizeMotionProject(input as unknown as MotionProject);
  const production=makeProductionPack(project);
  const warnings=[...production.timelineWarnings];
  for(const [i,scene] of project.scenes.entries()){
   if(scene.kind==="screen")warnings.push("Shot "+(i+1)+": original source must be attached and checked; MCP cannot inspect browser-local bytes.");
  }
  if(new Set(project.scenes.map(s=>s.headline.toLowerCase().trim())).size<project.scenes.length)
   warnings.push("Repeated headline across shots.");
  if(new Set(project.scenes.map(s=>s.kind)).size<3)warnings.push("Composition repetition risk: fewer than 3 visual kinds.");
  if(!project.scenes.some(s=>s.kind==="closer"))warnings.push("No dedicated brand CTA closing shot.");
  return json({type:"structural_project_review",rendered:false,
   approvedForPublishing:false,actualFramesInspected:false,
   title:project.title,brand:project.brand,
   seconds:durationOf(project),shots:project.scenes.length,
   warnings,sourceFootageVerified:false,voiceVerified:false,musicRightsVerified:false,
   reviewLevel:"script/storyboard only",
   production});
 });
 server.registerTool("motion_preview_patch",{
  title:"Preview Safe Film Patch",
  description:"Apply an approved motion-chat-v1 patch in memory to public-safe editorial JSON and return the resulting project for human preview. Does not overwrite the user's actual Studio project.",
  inputSchema:z.object({
   currentProject:z.record(z.string(),z.unknown()),
   chatPack:z.record(z.string(),z.unknown())
  }),annotations:readOnly
 },async({currentProject,chatPack})=>{
  if(JSON.stringify(currentProject).length>18000||JSON.stringify(chatPack).length>10000)
   return {isError:true,content:[{type:"text",text:"Patch too large; send only public editorial JSON."}]};
  try{
   const present=sanitizeMotionProject(currentProject as unknown as MotionProject);
   const preview=previewChatMotionPack(chatPack,present);
   return json({rendered:false,persisted:false,requiresExplicitApply:true,
    changes:preview.changes,project:preview.next,
    chatPack:createChatMotionPack(preview.next)});
  }catch(e){
   return {isError:true,content:[{type:"text",text:e instanceof Error?e.message:"Invalid film patch"}]};
  }
 });
 return server;
}
export const motionMcpHandler=createMcpHandler(createMotionMcpServer,{
 legacy:"stateless"
});
