"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./connect.module.css";

type Check = { label: string; status: "pass" | "fail"; detail: string };
type RpcResult = { result?: Record<string, unknown>; error?: { code: number; message: string } };
type Film = { title: string; scenes: Array<{ headline: string }>; brand: string };
type FilmResult = { editorUrl: string; previewProject: Film; durationSeconds: number; scenes: number };

const ENDPOINT = "https://studio.promptence.tech/api/mcp";
const TEST_SCENES = [
  {kind:"opener",eyebrow:"CONTENT STUDIO",headline:"AN IDEA BECOMES A FILM.",support:"Directed in a ChatGPT conversation.",seconds:4},
  {kind:"kinetic",eyebrow:"THE ENGINE",headline:"REAL MOTION. NOT EMPTY PROMISES.",support:"Editable typography, transitions and live pixels.",seconds:4},
  {kind:"network",eyebrow:"THE WORKFLOW",headline:"DIRECT. REVIEW. RENDER.",support:"Your device builds the actual video.",seconds:4},
  {kind:"closer",eyebrow:"MARGARYAN LABS",headline:"CREATE WHAT MOVES PEOPLE.",support:"Procedural motion graphics. No external OpenAI API key.",seconds:4},
] as const;

async function rpc(method: string, params: Record<string, unknown> = {}, id = 1): Promise<Record<string, unknown>> {
  const response = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify({jsonrpc:"2.0",id,method,params}),
    cache: "no-store"
  });
  const json: RpcResult = await response.json();
  if (!response.ok || json.error || !json.result)
    throw Error(json.error?.message || "HTTP " + response.status + " from the MCP endpoint");
  return json.result;
}

export default function ConnectPage() {
  const [busy,setBusy] = useState(false);
  const [checks,setChecks] = useState<Check[]>([]);
  const [demo,setDemo] = useState<string | null>(null);
  const [revised,setRevised] = useState<string | null>(null);
  const [copied,setCopied] = useState(false);

  // For remote acceptance tests: /connect?autotest=1 executes the same real
  // browser-to-server protocol checks as the manual button, without any keys.
  useEffect(()=>{
    if(new URLSearchParams(window.location.search).get("autotest")==="1") void diagnose();
    // Intentionally only on first browser mount; manual reruns remain possible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  async function diagnose() {
    if (busy) return;
    setBusy(true);setChecks([]);setDemo(null);setRevised(null);
    const results: Check[] = [];
    function report(label:string, status:"pass"|"fail", detail:string) {
      results.push({label,status,detail});setChecks([...results]);
    }
    let stopped=false;
    let film: FilmResult | null = null;
    try {
      const hello=await rpc("initialize",{
        protocolVersion:"2025-06-18",capabilities:{},
        clientInfo:{name:"Margaryan public readiness check",version:"0.3.0"}
      },101);
      const info=hello.serverInfo as {name?:string;version?:string}|undefined;
      if(info?.name!=="margaryan-content-studio") throw Error("Unexpected MCP server: "+String(info?.name));
      report("MCP INITIALIZE","pass","Server "+info.name+" · v"+String(info.version)+" · HTTPS POST");
    } catch (e) {report("MCP INITIALIZE","fail",String(e));stopped=true;}
    if(!stopped) try {
      const answer=await rpc("tools/list",{},102);
      const names=(answer.tools as Array<{name:string}>|undefined)?.map(t=>t.name)||[];
      if(!names.includes("create_motion_film") || !names.includes("revise_motion_film"))
        throw Error("Film creation or revision tool missing");
      if(names.includes("create_motion_feature_film"))
        throw Error("Unreleased long-film tool should not be exposed");
      report("TOOL DISCOVERY","pass","Create + Revise · "+names.length+" public tools");
    } catch (e) {report("TOOL DISCOVERY","fail",String(e));stopped=true;}
    if(!stopped) try {
      const listed=await rpc("resources/list",{},103);
      const ui=(listed.resources as Array<{uri:string}>|undefined)?.find(x=>x.uri?.startsWith("ui://margaryan-content-studio/"));
      if(!ui) throw Error("MCP Apps player template not advertised");
      const read=await rpc("resources/read",{uri:ui.uri},104);
      const content=(read.contents as Array<{mimeType:string;text:string}>|undefined)?.[0];
      if(content?.mimeType!=="text/html;profile=mcp-app" || !content.text.includes("/motion/chat-preview"))
        throw Error("Player resource missing or incompatible");
      report("CHATGPT PLAYER","pass","MCP Apps HTML resource with first-party Motion Canvas");
    } catch(e) {report("CHATGPT PLAYER","fail",String(e));stopped=true;}
    if(!stopped) try {
      const output=await rpc("tools/call",{
        name:"create_motion_film",
        arguments:{title:"MARGARYAN / MOTION DEMO",brand:"labs",client_brand_name:"STUDIO DEMO",client_brand_caption:"PRODUCED FROM CHATGPT",client_brand_accent:"#B7C5E9",format:"portrait",language:"en",qualityMode:"signature",scenes:TEST_SCENES}
      },105);
      if(output.isError)throw Error("Create tool returned isError");
      film=output.structuredContent as FilmResult;
      if(!film || film.scenes!==4 || !film.editorUrl.startsWith("https://studio.promptence.tech/motion?") ||
         film.previewProject?.scenes?.length!==4)throw Error("Invalid film draft or wrong host");
      setDemo(film.editorUrl);
      report("REAL FILM CREATION","pass","4 validated scenes · "+film.durationSeconds+"s · editor handoff verified");
    } catch(e) {report("REAL FILM CREATION","fail",String(e));stopped=true;}
    if(!stopped && film) try {
      const output=await rpc("tools/call",{
        name:"revise_motion_film",
        arguments:{
          current_project:film.previewProject,
          changes:[{target:"scene",index:1,set:{headline:"LIVE MOTION. FULL CONTROL."}},
            {target:"project",set:{clientBrand:{accent:"#D8C4F9"}}}]
        }
      },106);
      if(output.isError)throw Error("Revision tool returned isError");
      const revision=output.structuredContent as FilmResult;
      if(!revision?.editorUrl?.startsWith("https://studio.promptence.tech/motion?") ||
         revision.previewProject.scenes[1].headline!=="LIVE MOTION. FULL CONTROL.")
        throw Error("Revision did not change the selected shot");
      setRevised(revision.editorUrl);
      report("SCENE REVISION","pass","Shot 02 updated without generating a video file or exposing local media");
    } catch(e) {report("SCENE REVISION","fail",String(e));stopped=true;}
    try {
      const res=await fetch("/api/worker/private", {cache:"no-store"});
      if(res.status!==404)throw Error("Unexpected status "+res.status+" — private path should be absent");
      report("CRM ISOLATION","pass","Private worker API absent on the public Studio host (404)");
    } catch(e) {report("CRM ISOLATION","fail",String(e));}
    setBusy(false);
  }
  const pass=checks.filter(x=>x.status==="pass").length;
  const fail=checks.filter(x=>x.status==="fail").length;
  return <main className={styles.wrap}>
    <header className={styles.nav}>
      <Link href="/" className={styles.identity}>MARGARYAN <span>LABS</span></Link>
      <div className={styles.badge}>CONTENT STUDIO / CHATGPT</div>
    </header>
    <div className={styles.eyebrow}>INTEGRATION LAB / PUBLIC BETA</div>
    <h1>Connect your<br/><em>creative engine.</em></h1>
    <p className={styles.lead}>One conversation drives the storyboard. Our original Motion Engine renders the animation. No separate OpenAI API key is needed for this workflow.</p>
    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.number}>01 / CONNECT TO CHATGPT</div>
        <h2>Install the creative tools</h2>
        <p>In ChatGPT, go to Plugins and add a custom MCP server if your plan and workspace allow it. Use this exact HTTPS endpoint.</p>
        <div className={styles.endpoint}><code>{ENDPOINT}</code><button onClick={async()=>{try{await navigator.clipboard.writeText(ENDPOINT);setCopied(true)}catch{setCopied(false)}}}>{copied?"COPIED":"COPY"}</button></div>
        <p className={styles.muted}>This beta exposes two read-only film planning tools. It does not access your ChatGPT messages outside approved tool calls and does not store client footage on our server.</p>
        <div className={styles.commands}>
          <strong>Try asking ChatGPT:</strong>
          <p>“Create a 25-second premium motion-graphics video about my company in portrait format. Show a strong opening and a final CTA.”</p>
        </div>
      </section>
      <section className={styles.card}>
        <div className={styles.number}>02 / VERIFY LIVE TRANSPORT</div>
        <h2>Real-time system test</h2>
        <p>This diagnostic sends real JSON-RPC requests to our deployed MCP endpoint, creates a sample film draft and verifies editing works. It does not make AI API requests or render an MP4.</p>
        <button disabled={busy} className={styles.run} onClick={()=>void diagnose()}>{busy?"TESTING CONNECTION…":"RUN COMPLETE CONNECTION TEST ↗"}</button>
        <p className={styles.muted}>Server-only proof: <Link href="/diagnostics" style={{color:"#c8ddf9",fontWeight:800}}>VIEW 7 LIVE PROTOCOL CHECKS ↗</Link>. This report does not depend on browser fetch permissions.</p>
        <div className={styles.tally}>
          <span>{checks.length?pass+" PASS / "+fail+" FAIL":"NOT TESTED YET"}</span>
          <span>{checks.length+"/6"}</span>
        </div>
        <div role="status" aria-live="polite" className={styles.checks}>
          {checks.map(x=><div key={x.label} className={styles.check} data-status={x.status}>
            <b>{x.status==="pass"?"✓":"×"}</b><span><strong>{x.label}</strong><small>{x.detail}</small></span>
          </div>)}
          {!checks.length&&<span className={styles.muted}>Run the diagnostic to validate the production MCP endpoint.</span>}
        </div>
        {(demo||revised)&&<div className={styles.buttons}>
          {demo&&<a target="_blank" rel="noopener noreferrer" href={demo}>OPEN DEMO FILM ↗</a>}
          {revised&&<a target="_blank" rel="noopener noreferrer" href={revised}>OPEN REVISED FILM ↗</a>}
        </div>}
      </section>
    </div>
    <div className={styles.notice}><strong>What this test does not prove</strong> · Actual installation inside ChatGPT, nested iframe CSP permissions, successful video export on your device, and optional ChatGPT file upload require a real client acceptance test. No subscription or billing is active in this beta.</div>
    <footer><Link href="/motion">OPEN FULL MOTION STUDIO ↗</Link><span>PROCEDURAL MOTION / NOT PHOTOREAL AI VIDEO</span></footer>
  </main>;
}
