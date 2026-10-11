import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ENDPOINT = "https://studio.promptence.tech/api/mcp";
type Check = { name: string; ok: boolean; note: string; milliseconds: number };
type Json = { result?: Record<string, unknown>; error?: { code: number; message: string } };
const SCENES = [
  { kind:"opener",eyebrow:"TEST",headline:"IDEAS INTO MOTION.",support:"Directed through ChatGPT.",seconds:3 },
  { kind:"network",eyebrow:"PRODUCTION",headline:"REAL EDITABLE FRAMES.",support:"Rendered on your device.",seconds:3 },
  { kind:"closer",eyebrow:"MARGARYAN LABS",headline:"MAKE IT MOVE.",support:"Keyless beta.",seconds:3 }
];
async function call(method: string, params: Record<string,unknown>, id: number) {
  const began=Date.now();
  const r=await fetch(ENDPOINT,{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},
    cache:"no-store",
    signal:AbortSignal.timeout(9000),
    body:JSON.stringify({jsonrpc:"2.0",id,method,params})
  });
  const json=await r.json() as Json;
  if(!r.ok || json.error || !json.result) throw Error(json.error?.message||"HTTP "+r.status);
  return { result:json.result, milliseconds:Date.now()-began };
}
function card(name:string, ok:boolean, note:string, ms:number):Check{return {name,ok,note,milliseconds:ms};}
async function run():Promise<Check[]> {
  const checks: Check[]=[];
  let info:Record<string,unknown>|null=null;
  let film:Record<string,unknown>|null=null;
  try {
    const r=await call("initialize",{
      protocolVersion:"2025-06-18",capabilities:{},clientInfo:{name:"Content Studio Public Probe",version:"0.3.0"}
    },21);
    info=r.result;
    checks.push(card("JSON-RPC INITIALIZE",true,String((info.serverInfo as {name?:string}).name),r.milliseconds));
  }catch(e){checks.push(card("JSON-RPC INITIALIZE",false,String(e),0));return checks;}
  try {
    const r=await call("tools/list",{},22);
    const names=(r.result.tools as Array<{name:string}>).map(x=>x.name);
    const pass=names.length===2&&names.includes("create_motion_film")&&names.includes("revise_motion_film");
    checks.push(card("PUBLIC TOOL DISCOVERY",pass,names.join(", "),r.milliseconds));
    if(!pass)return checks;
  }catch(e){checks.push(card("PUBLIC TOOL DISCOVERY",false,String(e),0));return checks;}
  try {
    const r=await call("resources/list",{},23);
    const uri=((r.result.resources as Array<{uri:string}>)[0]).uri;
    if(!uri.startsWith("ui://margaryan-content-studio/"))throw Error("Unexpected player URI");
    checks.push(card("MCP APPS RESOURCE DISCOVERY",true,uri,r.milliseconds));
    try {
      const q=await call("resources/read",{uri},24);
      const first=(q.result.contents as Array<{mimeType:string;text:string}>)[0];
      if(first.mimeType!=="text/html;profile=mcp-app"||!first.text.includes("ui/initialize")||!first.text.includes("/motion/chat-preview"))
        throw Error("Malformed HTML player");
      checks.push(card("MCP APPS PLAYER FETCH",true,first.text.length+" HTML characters",q.milliseconds));
    }catch(e){checks.push(card("MCP APPS PLAYER FETCH",false,String(e),0));}
  }catch(e){checks.push(card("MCP APPS RESOURCE DISCOVERY",false,String(e),0));}
  try {
    const r=await call("tools/call",{name:"create_motion_film",arguments:{
      title:"CONTENT STUDIO / DIAGNOSTIC",brand:"labs",format:"portrait",language:"en",scenes:SCENES
    }},25);
    if(r.result.isError)throw Error("Tool returned isError");
    film=r.result.structuredContent as Record<string,unknown>;
    if(!film||typeof film.editorUrl!=="string"||!film.editorUrl.startsWith("https://studio.promptence.tech/motion")||film.scenes!==3)
      throw Error("Invalid film URL or scene count");
    checks.push(card("CREATE EDITABLE FILM",true,"3 shots / "+String(film.durationSeconds)+" seconds",r.milliseconds));
  }catch(e){checks.push(card("CREATE EDITABLE FILM",false,String(e),0));}
  if(film)try {
    const r=await call("tools/call",{name:"revise_motion_film",arguments:{
      current_project:film.previewProject,changes:[{target:"scene",index:1,set:{headline:"REAL MOTION. FULL CONTROL."}}]
    }},26);
    if(r.result.isError)throw Error("Tool returned isError");
    const updated=(r.result.structuredContent as {previewProject?:{scenes?:Array<{headline:string}>}}).previewProject;
    if(updated?.scenes?.[1]?.headline!=="REAL MOTION. FULL CONTROL.")throw Error("Revision did not modify scene 02");
    checks.push(card("REVISION ROUND-TRIP",true,"Updated shot 02",r.milliseconds));
  }catch(e){checks.push(card("REVISION ROUND-TRIP",false,String(e),0));}
  try {
    const before=Date.now();
    const r=await fetch("https://studio.promptence.tech/api/worker/private",{cache:"no-store",signal:AbortSignal.timeout(9000)});
    checks.push(card("PRIVATE CRM ISOLATION",r.status===404,"private /api/worker/private returned "+r.status,Date.now()-before));
  }catch(e){checks.push(card("PRIVATE CRM ISOLATION",false,String(e),0));}
  return checks;
}
export default async function DiagnosticsPage(){
  const checks=await run();
  const good=checks.filter(x=>x.ok).length;
  const full=checks.length===7&&good===7;
  return <main style={{background:"#090c10",color:"#eaf0f8",minHeight:"100vh",fontFamily:"system-ui,sans-serif",padding:"clamp(25px,7vw,85px) 24px"}}>
  <div style={{maxWidth:890,margin:"auto"}}>
  <Link href="/connect" style={{color:"#98abc5",textDecoration:"none",letterSpacing:".12em",fontSize:12,fontWeight:700}}>← CONTENT STUDIO / CONNECT</Link>
  <div style={{borderTop:"1px solid #2d3846",marginTop:30,paddingTop:32,fontSize:11,letterSpacing:".15em",color:"#94a9c7"}}>PRODUCTION CONNECTIVITY / SERVER-TO-SERVER REAL HTTP</div>
  <h1 style={{fontSize:"clamp(36px,6vw,65px)",letterSpacing:"-.055em",lineHeight:1.08,margin:"16px 0 12px"}}>A connection you<br/><span style={{color:"#91a5be"}}>can actually test.</span></h1>
  <p style={{color:"#a9b4c4",maxWidth:650,lineHeight:1.65}}>Independent checks send real JSON-RPC POST requests to the publicly deployed MCP endpoint. No AI models or paid APIs are called. This is not proof that ChatGPT has installed the plugin or that a video has been exported.</p>
  <div style={{display:"flex",gap:10,alignItems:"center",padding:"15px 0 25px",borderBottom:"1px solid #334052"}}>
  <span style={{borderRadius:6,background:full?"#1a382d":"#3c2d21",color:full?"#acecc9":"#f9c99e",padding:"10px 14px",fontSize:14,fontWeight:800}}>{good}/{checks.length} CHECKS PASSED</span>
  <span style={{fontSize:11,color:"#92a1b6"}}>{full?"TRANSPORT READY":"INVESTIGATION REQUIRED"}</span></div>
  {checks.map(x=><div key={x.name} style={{display:"flex",justifyContent:"space-between",gap:14,borderBottom:"1px solid #242d38",padding:"17px 0"}}>
    <div><strong style={{fontSize:12,letterSpacing:".065em"}}>{x.ok?"✓":"×"} {x.name}</strong><p style={{fontSize:12,color:"#9aaac0",overflowWrap:"anywhere",margin:"6px 0 0"}}>{x.note}</p></div>
    <div style={{fontSize:11,color:x.ok?"#a6d9bc":"#ffb2a7",whiteSpace:"nowrap"}}>{x.ok?"PASS":"FAIL"} · {x.milliseconds}ms</div>
  </div>)}
  <p style={{marginTop:40,color:"#8091a6",fontSize:12,lineHeight:1.7}}>This page performs only stateless checks against pre-approved test content. Data is not persisted. Usage limits, in-ChatGPT iframe rendering, mobile exports, voice and file-library uploads remain separate acceptance gates.</p>
  <Link href="/connect" style={{textDecoration:"none",color:"#c9d9ee",fontSize:12,fontWeight:800}}>OPEN INSTALL GUIDE ↗</Link>
  </div></main>;
}
