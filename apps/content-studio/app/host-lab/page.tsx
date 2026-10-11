"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import styles from "./host-lab.module.css";

type Json={result?:Record<string,unknown>;error?:{code:number;message:string}};
type FilmResult={protocol?:string;scenes:number;durationSeconds:number;title?:string;previewProject:{
  title:string;brand:string;format:string;scenes:Array<{kind:string;eyebrow:string;headline:string;support:string;seconds:number}>;clientBrand?:{name:string;caption:string;accent:string}
};editorUrl:string};
type Status="idle"|"busy"|"pass"|"fail";
type EventLog={event:string;state:Status;message:string;at:string};
const SITE="https://studio.promptence.tech";
const SCENES=[
  {kind:"opener",eyebrow:"MARGARYAN CONTENT STUDIO",headline:"FROM CHAT. TO CINEMA.",support:"First-party motion graphics, no external AI API.",seconds:4},
  {kind:"kinetic",eyebrow:"OUR ENGINE",headline:"REAL FRAMES. REAL CONTROL.",support:"A genuine interactive canvas editor.",seconds:4},
  {kind:"network",eyebrow:"THE TRANSFORMATION",headline:"ONE IDEA. MANY FRAMES.",support:"A storyboard to inspect and approve.",seconds:4},
  {kind:"closer",eyebrow:"YOUR NEXT FILM",headline:"MAKE IT MOVE.",support:"Created through a compatible MCP host.",seconds:4}
] as const;

async function rpc(method:string,params:Record<string,unknown>,id:number){
  const response=await fetch("/api/mcp",{
    method:"POST",
    headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},
    body:JSON.stringify({jsonrpc:"2.0",id,method,params}),
    cache:"no-store"
  });
  const json:Json=await response.json();
  if(!response.ok||json.error||!json.result)throw Error(json.error?.message||"HTTP "+response.status);
  return json.result;
}

export default function HostLab(){
  const iframe=useRef<HTMLIFrameElement>(null);
  const film=useRef<FilmResult|null>(null);
  const toolEnvelope=useRef<Record<string,unknown>|null>(null);
  const widgetReady=useRef(false);
  const mounted=useRef(true);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [handshake,setHandshake]=useState<Status>("idle");
  const [delivery,setDelivery]=useState<Status>("idle");
  const [revision,setRevision]=useState<Status>("idle");
  const [logs,setLogs]=useState<EventLog[]>([]);
  const [version,setVersion]=useState("");
  const [editorUrl,setEditorUrl]=useState("");
  const [copyDone,setCopyDone]=useState(false);

  const log=useCallback((event:string,state:Status,message:string)=>{
    if(!mounted.current)return;
    setLogs(items=>[...items,{event,state,message,at:new Date().toLocaleTimeString()}].slice(-12));
  },[]);

  const sendResult=useCallback((result:Record<string,unknown>)=>{
    if(!widgetReady.current || !iframe.current?.contentWindow)return false;
    iframe.current.contentWindow.postMessage({jsonrpc:"2.0",method:"ui/notifications/tool-result",params:result},"*");
    return true;
  },[]);

  useEffect(()=>{
    mounted.current=true;
    const receive=(e:MessageEvent)=>{
      if(e.source!==iframe.current?.contentWindow || !e.data || typeof e.data!=="object")return;
      const message=e.data as {jsonrpc?:string;id?:number;method?:string;params?:unknown};
      if(message.jsonrpc!=="2.0")return;
      if(message.method==="ui/initialize" && typeof message.id==="number"){
        const response={
          jsonrpc:"2.0",id:message.id,result:{
            protocolVersion:"2026-01-26",
            hostInfo:{name:"Margaryan MCP Apps Test Host — NOT CHATGPT",version:"0.5.0"},
            hostCapabilities:{},
            hostContext:{theme:"dark",displayMode:"inline",locale:"en"}
          }
        };
        iframe.current?.contentWindow?.postMessage(response,"*");
        setHandshake("pass");
        log("MCP Apps UI/INITIALIZE","pass","Real resource HTML connected to our local simulated host bridge.");
      } else if(message.method==="ui/notifications/initialized"){
        widgetReady.current=true;
        log("WIDGET INITIALIZED","pass","Standard ui/notifications/initialized received from MCP Apps widget.");
        if(toolEnvelope.current){
          const sent=sendResult(toolEnvelope.current);
          if(sent){setDelivery("pass");log("TOOL RESULT DELIVERY","pass","Queued Motion tool result delivered to the live widget.");}
        }
      } else if(message.method==="ui/update-model-context"){
        log("MODEL CONTEXT","pass","Widget supplied model-visible status to test host.");
      }
    };
    window.addEventListener("message",receive);
    return ()=>{mounted.current=false;window.removeEventListener("message",receive);};
  },[log,sendResult]);

  useEffect(()=>{
    let alive=true;
    async function prepare(){
      setHandshake("busy");
      log("MCP RESOURCE FETCH","busy","Fetching real MCP Apps HTML resource through live tools endpoint.");
      try{
        const server=await rpc("initialize",{protocolVersion:"2025-06-18",
          capabilities:{},clientInfo:{name:"Margaryan Host Acceptance Lab",version:"0.5.0"}},1);
        const details=server.serverInfo as {name?:string;version?:string};
        if(details?.name!=="margaryan-content-studio")throw Error("Wrong MCP server identity");
        if(alive)setVersion(String(details.version||"unknown"));
        const resources=await rpc("resources/list",{},2);
        const resource=(resources.resources as Array<{uri:string}>).find(x=>x.uri.startsWith("ui://margaryan-content-studio/"));
        if(!resource)throw Error("No MCP Apps UI resource");
        const read=await rpc("resources/read",{uri:resource.uri},3);
        const html=(read.contents as Array<{mimeType:string;text:string}>)[0];
        if(html.mimeType!=="text/html;profile=mcp-app"||!html.text.includes('id="player"'))
          throw Error("MCP Apps HTML format is invalid");
        if(alive && iframe.current){
          // Real widget returned by /api/mcp; not a fake player or screenshot.
          // This is OUR OWN trusted resource code, never arbitrary remote HTML.
          // Sandbox permits scripts and nested on-origin Canvas player testing;
          // no top navigation, webcam, mic capture, forms or popups allowed.
          iframe.current.srcdoc=html.text;
          setLoaded(true);
          log("MCP RESOURCE FETCH","pass","Received and embedded "+html.text.length+" bytes of genuine MCP Apps widget HTML.");
        }
      }catch(err){
        if(alive){setHandshake("fail");log("MCP RESOURCE FETCH","fail",String(err));}
      }
    }
    void prepare();
    return ()=>{alive=false;};
  },[log]);

  async function createFilm(){
    if(busy)return;
    setBusy(true);setDelivery("busy");setRevision("idle");setCopyDone(false);
    log("CREATE MOTION FILM","busy","Requesting 16s four-scene client-branded draft from real MCP endpoint.");
    try{
      const result=await rpc("tools/call",{name:"create_motion_film",arguments:{
        title:"CONTENT STUDIO / INTERACTIVE HOST DEMO",brand:"labs",
        client_brand_name:"STUDIO DEMO",client_brand_caption:"REAL MOTION THROUGH CHATGPT",
        client_brand_accent:"#B8D0F1",format:"portrait",language:"en",
        qualityMode:"signature",scenes:SCENES
      }},4);
      if(result.isError)throw Error("MCP tool reported isError");
      const structured=result.structuredContent as FilmResult;
      if(structured?.scenes!==4||structured?.durationSeconds!==16||
         !structured?.editorUrl?.startsWith(SITE+"/motion?"))
        throw Error("Film response missing valid original Motion project");
      film.current=structured;toolEnvelope.current=result;setEditorUrl(structured.editorUrl);
      const sent=sendResult(result);
      if(sent){setDelivery("pass");log("TOOL RESULT DELIVERY","pass","16s motion project sent to real live iframe over ui/notifications/tool-result.");}
      else log("TOOL RESULT DELIVERY","busy","Waiting for widget handshake; project queued.");
    }catch(err){setDelivery("fail");log("CREATE MOTION FILM","fail",String(err));}
    finally{setBusy(false);}
  }
  async function reviseFilm(){
    if(busy||!film.current)return;
    setBusy(true);setRevision("busy");
    log("REVISION VIA MCP","busy","Changing shot 02 headline and client brand accent, then updating the same live player.");
    try{
      const result=await rpc("tools/call",{name:"revise_motion_film",arguments:{
        current_project:film.current.previewProject,
        changes:[
          {target:"scene",index:1,set:{headline:"FILM REVISED LIVE IN THE HOST."}},
          {target:"project",set:{clientBrand:{accent:"#D8C4F9"}}}
        ]
      }},5);
      if(result.isError)throw Error("Tool revision returned isError");
      const project=(result.structuredContent as FilmResult).previewProject;
      if(project.scenes[1].headline!=="FILM REVISED LIVE IN THE HOST."||
         project.clientBrand?.accent!=="#D8C4F9")
         throw Error("Patch did not update the correct shot and accent");
      film.current=result.structuredContent as FilmResult;
      toolEnvelope.current=result;
      if(!sendResult(result))throw Error("Widget was not initialized to receive revision");
      setEditorUrl(film.current.editorUrl);
      setRevision("pass");
      log("REVISION VIA MCP","pass","Shot 02 and client accent changed using actual revision tool and host notification.");
    }catch(err){setRevision("fail");log("REVISION VIA MCP","fail",String(err));}
    finally{setBusy(false);}
  }

  const status=(value:Status)=>value==="pass"?"PASS":value==="fail"?"FAIL":value==="busy"?"TESTING":"NOT TESTED";
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><Link href="/">MARGARYAN / CONTENT STUDIO</Link><span>MCP APPS HOST COMPATIBILITY LAB</span></header>
    <div className={styles.eyebrow}>LAB 02 / FROM MCP TOOL TO LIVE CANVAS</div>
    <h1>Connect the model.<br/><em>See the actual film.</em></h1>
    <p className={styles.lead}>This page simulates the MCP Apps message bridge locally. It fetches the same interactive widget served to ChatGPT, sends real create/revision tool calls and loads the original Motion Canvas into the widget. This is an integration test, <strong>not proof of installation inside ChatGPT</strong>.</p>
    <div className={styles.grid}>
      <section className={styles.player}>
        <div className={styles.bar}><strong>REAL MCP APPS WIDGET</strong><span>STANDARD JSON-RPC / UI INITIALIZE</span></div>
        <iframe ref={iframe} title="Content Studio live MCP Apps widget inside test host"
          sandbox="allow-scripts allow-same-origin allow-downloads" className={styles.frame}/>
        <div className={styles.note}>Uses first-party HTML returned by our live MCP server. No fake render, Cloud API, stock video or provider billing. Inline nested frame permissions may still differ from ChatGPT's real sandbox.</div>
      </section>
      <section className={styles.inspector}>
        <div className={styles.bar}><strong>INTEGRATION ACCEPTANCE</strong><span>SERVER v{version||"…"}</span></div>
        <div className={styles.checks}>
          <div><b>01 · HOST HANDSHAKE</b><span data-status={handshake}>{status(handshake)}</span></div>
          <div><b>02 · CREATE & DELIVER</b><span data-status={delivery}>{status(delivery)}</span></div>
          <div><b>03 · REVISE & DISPLAY</b><span data-status={revision}>{status(revision)}</span></div>
        </div>
        <button className={styles.primary} disabled={busy||!loaded||handshake!=="pass"}
          onClick={()=>void createFilm()}>{busy?"WORKING…":"01 / CREATE DEMO FILM ↗"}</button>
        <button className={styles.secondary} disabled={busy||!film.current||delivery!=="pass"}
          onClick={()=>void reviseFilm()}>02 / REVISE FILM IN SAME PLAYER ↗</button>
        {editorUrl&&<a className={styles.secondary} target="_blank" rel="noopener noreferrer"
          href={editorUrl}>03 / OPEN FULL EDITOR FOR REVIEW ↗</a>}
        <div className={styles.log}>
          <strong>LIVE EVENT LOG</strong>
          {logs.map((event,i)=><div key={i} className={styles.event} data-status={event.state}>
            <div><span>{event.at}</span><b>{event.event}</b></div><p>{event.message}</p>
          </div>)}
          {!logs.length&&<p>Connecting to the real MCP server…</p>}
        </div>
      </section>
    </div>
    <div className={styles.next}><strong>Final release gate:</strong> In an actual ChatGPT conversation, a user must install the custom plugin, request a film, verify the real embedded player and browser export, and authorize any ChatGPT file-library upload. This simulated host does not bypass that step. For a genuine device video codec test, open <Link href="/quality-lab">VIDEO QUALITY LAB ↗</Link>.</div>
    <footer><Link href="/connect">CONNECT PLUGIN ↗</Link><Link href="/diagnostics">SERVER 9/9 ↗</Link><Link href="/quality-lab">REAL VIDEO QUALITY ↗</Link></footer>
  </div></main>;
}
