"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawMotionFrame } from "@/lib/motion/render-engine";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import { planBrowserFeature } from "@/lib/motion/film-browser-plan";
import {
  BRAND_INFO, FORMAT_SIZE, durationOf, makeMotionPreset, sanitizeMotionProject,
  type MotionProject
} from "@/lib/motion/studio";

type PreviewPacket = { kind: "margaryan-motion-preview-v1"; project?: unknown; projects?: unknown };
type SeekPacket = {kind:"margaryan-motion-seek-v1"; seconds:unknown};
const isPacket = (input: unknown): input is PreviewPacket =>
  Boolean(input) && typeof input === "object" &&
  (input as PreviewPacket).kind === "margaryan-motion-preview-v1";

const outer = {
  margin: 0, minHeight: "100vh", background: "#06080c", color: "#f5f6fa",
  padding: "12px", fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box"
} as const;
const button = {
  border: "1px solid #454c5a", borderRadius: 8, background: "#232b3b", color: "#f6f7fb",
  padding: "9px 12px", cursor: "pointer", fontWeight: 700, fontSize: 11
} as const;
const download = (blob: Blob, filename: string) => {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
};

export default function ChatMotionPreviewPage() {
  const [chapters, setChapters] = useState<MotionProject[]>(() => [makeMotionPreset("labs")]);
  const project = chapters[0];
  const [received, setReceived] = useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const lastExportRef = useRef<{blob:Blob;filename:string}|null>(null);
  const [seek, setSeek] = useState(0);
  const [notice, setNotice] = useState("Waiting for a ChatGPT film draft");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const playbackRef = useRef(0);
  const recordingRef = useRef(false);
  const discardRef = useRef(false);
  const streamRef = useRef<MediaStream|null>(null);
  const throttleRef = useRef(0);
  const fps = 24;
  const plan = useMemo(() => planBrowserFeature(chapters), [chapters]);
  const total = plan.total;
  const fmt = FORMAT_SIZE[project.format];
  const exportW = project.format === "landscape" ? 1280 : project.format === "square" ? 720 : 720;
  const exportH = Math.round(exportW * fmt.height / fmt.width);
  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    // The same source-safe timeline plan powers the main 300s Motion Studio.
    // Scrubbing, recording and playback all follow one continuous clock.
    const part = plan.segments.find(x=>time<x.end) || plan.segments[plan.segments.length-1];
    if (!part) return;
    const sceneTime = Math.max(0,Math.min(durationOf(part.project)-.001,time-part.start));
    drawMotionFrame(ctx, part.project, sceneTime, canvas.width, canvas.height);
  }, [plan]);

  const planRef=useRef(total);planRef.current=total;
  const renderRef=useRef(render);renderRef.current=render;

  useEffect(() => {
    const listener = (e: MessageEvent<unknown>) => {
      // Only the immediate parent MCP widget can supply a project. Never
      // fetch an arbitrary remote scene, logo, image or video URL.
      if (e.source !== window.parent || !isPacket(e.data)) return;
      try {
        if(recordingRef.current) throw Error("Stop recording before changing a film");
        const packet=e.data;
        const inputs=Array.isArray(packet.projects)?packet.projects:[packet.project];
        if(!inputs.length||inputs.length>5)throw Error("Expected 1–5 editable chapters");
        const safe=inputs.map(raw=>{
          if(!raw||typeof raw!=="object")throw Error("Invalid film chapter");
          const maybe=raw as Record<string,unknown>;
          if(!Array.isArray(maybe.scenes)||maybe.scenes.length<1||maybe.scenes.length>8)
            throw Error("A chapter must have 1–8 scenes");
          const scenes=maybe.scenes as unknown[];
          if(scenes.some(scene=>{
            if(!scene||typeof scene!=="object")return true;
            const shot=scene as Record<string,unknown>;
            return ["mediaId","overlayMediaId","src","url","mediaStart"].some(key=>
              shot[key]!==undefined&&shot[key]!==null);
          }))throw Error("Local media IDs and remote footage cannot enter ChatGPT canvas");
          const project=sanitizeMotionProject(raw);
          if(project.signatureFilm||project.scenes.some(shot=>
            shot.kind==="screen"||shot.kind==="spatial"||shot.mediaId||shot.overlayMediaId))
            throw Error("Source media and GPU footage require full Motion editor");
          return project;
        });
        const bounded=planBrowserFeature(safe);
        if(inputs.length===1&&bounded.total>64)
          throw Error("Single-chapter inline preview must not exceed 64 seconds");
        lastExportRef.current=null;
        setExportReady(false);discardRef.current=false;
        setPlaying(false);playbackRef.current=0;throttleRef.current=0;
        setSeek(0);setChapters(safe);setReceived(true);
        setNotice(safe.length>1
          ? "WHOLE FILM READY / "+safe.length+" acts, "+bounded.total+" seconds. Export is silent and runs in real time."
          : "Ready to preview / browser motion graphics only");
      }catch(err){
        setNotice("Rejected untrusted film: "+(err instanceof Error?err.message:String(err)));
      }
    };
    const seekFromParent=(e:MessageEvent<unknown>)=>{
      if(e.source!==window.parent||!e.data||typeof e.data!=="object")return;
      const packet=e.data as SeekPacket;
      if(packet.kind!=="margaryan-motion-seek-v1")return;
      if(recordingRef.current)return;
      const n=Number(packet.seconds);
      if(!Number.isFinite(n)||n<0||n>planRef.current)return;
      setPlaying(false);playbackRef.current=n;setSeek(n);renderRef.current(n);
    };
    const uploadReply = (e:MessageEvent<unknown>) => {
      if(e.source!==window.parent || !e.data || typeof e.data!=="object")return;
      const message=e.data as {kind?:string;message?:unknown};
      if(message.kind==="margaryan-motion-upload-status-v1" && typeof message.message==="string")
        setNotice(message.message.slice(0,250));
    };
    window.addEventListener("message", uploadReply);
    window.addEventListener("message", listener);
    setHydrated(true);
    window.addEventListener("message", seekFromParent);
    // Handshake ensures the parent MCP widget cannot miss a draft while
    // Next.js hydrates the child React app after the iframe load event.
    if (window.parent !== window) window.parent.postMessage({kind:"margaryan-motion-preview-ready-v1"}, "*");
    return () => {
      window.removeEventListener("message",listener);
      window.removeEventListener("message",uploadReply);
      window.removeEventListener("message",seekFromParent);
    };
  }, []);

  useEffect(() => {void preloadMotionLogo(project.brand).then(()=>render(playbackRef.current));}, [project.brand,render]);

  useEffect(() => {
    render(playbackRef.current);
    if (!playing && !recording) return;
    let raf = 0;
    let frame = -1;
    const start = performance.now() - playbackRef.current * 1000;
    const step = (now: number) => {
      const t = Math.min(total, Math.max(0, (now - start) / 1000));
      const currentFrame = Math.floor(t * fps);
      if (currentFrame !== frame || t === total) {
        frame = currentFrame;
        playbackRef.current = t;
        render(t);
        if(now-throttleRef.current>225||t===total){
          setSeek(t);throttleRef.current=now;
        }
      }
      if (t >= total) {
        if (recordingRef.current && mediaRef.current?.state === "recording") mediaRef.current.stop();
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, recording, total, render]);

  function toggle() {
    if (recording) return;
    if (!playing && seek >= total - 0.1) {playbackRef.current = 0;setSeek(0);}
    setPlaying(!playing);
  }
  function scrub(value: number) {
    if (recording) return;
    setPlaying(false);
    playbackRef.current = value; setSeek(value); render(value);
  }
  function exportVideo() {
    const canvas = canvasRef.current;
    if (!received || !canvas || recording || !("MediaRecorder" in window) || !canvas.captureStream) {
      setNotice("Video export unavailable in this browser or no film was received");
      return;
    }
    const type = ["video/mp4;codecs=avc1.42E01E", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
      .find(x => MediaRecorder.isTypeSupported(x));
    if (!type) {setNotice("Browser has no supported video recorder codec");return;}
    let stream: MediaStream | null = null;
    try {
      setPlaying(false);
      playbackRef.current = 0;
      setSeek(0);
      render(0);
      discardRef.current=false;
      stream = canvas.captureStream(fps);
      streamRef.current=stream;
      // Multi-minute films must fit the 120MB local safety ceiling without
      // falsely advertising a commercial-grade constant-bitrate master.
      const targetBitrate=total>180?2_200_000:total>64?2_800_000:3_500_000;
      const recorder = new MediaRecorder(stream, {mimeType:type,videoBitsPerSecond:targetBitrate});
      chunksRef.current = [];
      lastExportRef.current = null; setExportReady(false);
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => setNotice("Recorder failed; try full Motion Studio export");
      recorder.onstop = () => {
        recordingRef.current = false;
        stream?.getTracks().forEach(t => t.stop());
        streamRef.current=null;
        const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current,{type});
        if (!discardRef.current && blob.size >= 1024 && blob.size <= 120_000_000) {
          const fileName="margaryan-content-studio-"+project.brand+"-"+Math.round(total)+"s."+ext;
          lastExportRef.current={blob,filename:fileName};
          setExportReady(true);
          download(blob,fileName);
          setNotice("WHOLE FILM "+total+"s "+ext.toUpperCase()+" downloaded. Silent 720p workprint; verify every act on your device.");
        } else if(!discardRef.current) setNotice("Recording was empty or exceeded 120MB — use the full editor");
        chunksRef.current = [];
        mediaRef.current = null;
        setRecording(false);
        setPlaying(false);
      };
      mediaRef.current = recorder;
      recordingRef.current = true;
      recorder.start(1000);
      setNotice("Recording in real time on device — " + (type.startsWith("video/mp4")?"MP4":"WebM") + " / no audio");
      setRecording(true);
    } catch(e) {
      recordingRef.current = false;
      stream?.getTracks().forEach(t=>t.stop());
      streamRef.current=null;
      mediaRef.current=null;
      setRecording(false);
      setNotice("Export failed: "+(e instanceof Error?e.message:String(e)));
    }
  }

  function cancelCapture(reason:string){
    if(!recordingRef.current)return;
    discardRef.current=true;
    if(mediaRef.current?.state==="recording")mediaRef.current.stop();
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current=null;
    recordingRef.current=false;setRecording(false);setPlaying(false);
    setNotice(reason);
  }
  // A backgrounded mobile webview cannot reliably record a 300s film.
  // Cancel instead of promising that a stalled tab created a valid movie.
  useEffect(()=>{
    const onHidden=()=>{
      if(document.visibilityState==="hidden"&&recordingRef.current)
        cancelRef.current("Recording cancelled when tab was hidden. Nothing was exported.");
    };
    document.addEventListener("visibilitychange",onHidden);
    return()=>document.removeEventListener("visibilitychange",onHidden);
  },[]);
  const cancelRef=useRef(cancelCapture);cancelRef.current=cancelCapture;
  useEffect(()=>()=>{cancelRef.current("Preview closed — partial capture discarded");},[]);

  async function sendToChatGPT(){
    const file=lastExportRef.current;
    if(!file||recording)return;
    if(file.blob.size>25_000_000){
      setNotice("Video exceeds 25MB ChatGPT transfer limit. Keep the local download.");
      return;
    }
    if(window.parent===window){
      setNotice("ChatGPT storage is available only in an installed ChatGPT plugin.");
      return;
    }
    try{
      const bytes=await file.blob.arrayBuffer();
      // Explicit user action. The parent (MCP Apps widget) validates file and
      // uses the host's optional uploadFile() only when actually supported.
      window.parent.postMessage({
        kind:"margaryan-motion-export-file-v1",
        fileName:file.filename,
        mimeType:file.blob.type.split(";")[0].toLowerCase(),
        bytes
      },"*",[bytes]);
      setNotice("Sent to the ChatGPT app. Upload confirmation will appear here.");
    }catch(error){
      setNotice("ChatGPT upload handoff failed: "+String(error));
    }
  }

  return <main style={outer} data-motion-preview-hydrated={hydrated?"true":"false"}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,letterSpacing:".1em",color:"#b4c1d8"}}>
      <span>◈ {BRAND_INFO[project.brand].name} / LIVE CANVAS</span>
      <span>{project.format.toUpperCase()} · {chapters.length} ACT{chapters.length>1?"S":""} · {total.toFixed(1)}S</span>
    </div>
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:258,maxHeight:270,margin:"10px auto",borderRadius:9,overflow:"hidden",background:"#0c1018"}}>
      <canvas ref={canvasRef} width={exportW} height={exportH}
        style={{display:"block",width:"auto",height:"auto",maxWidth:"100%",maxHeight:270,aspectRatio:fmt.width+"/"+fmt.height}} />
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <button type="button" disabled={!received||recording} style={button} onClick={toggle}>{playing?"Ⅱ PAUSE":"▶ PLAY"}</button>
      <input aria-label="Film playhead" disabled={!received||recording} type="range" min={0} max={total} step={0.05}
        value={seek} onChange={e=>scrub(Number(e.target.value))} style={{flex:1,minWidth:60}}/>
      <span style={{fontSize:10,color:"#bfc5d0"}}>{seek.toFixed(1)}S</span>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:10}}>
      <button disabled={!received||recording} style={button} type="button" onClick={exportVideo}>{recording?"◌ RECORDING":"↓ EXPORT WHOLE FILM"}</button>
      {recording&&<button style={button} type="button" onClick={()=>cancelCapture("Recording cancelled by user. No partial file saved.")}>■ STOP</button>}
      <button disabled={!exportReady||recording} style={button} type="button" onClick={()=>void sendToChatGPT()}>
        ↥ SAVE TO CHATGPT
      </button>
      <span style={{fontSize:10,color:"#a8b3c1"}}>720P · LOCAL · 24FPS · SILENT</span>
    </div>
    <div role="status" style={{fontSize:10,lineHeight:1.5,marginTop:9,color:"#bfc6d4"}}>{notice}</div>
  </main>;
}
