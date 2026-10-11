"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawMotionFrame } from "@/lib/motion/render-engine";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import { createProceduralSoundtrack, type ProceduralAudioSession } from "@/lib/motion/sound-engine";
import {
  BRAND_INFO, clientBrandInfo, FORMAT_SIZE, durationOf, makeMotionPreset, sanitizeMotionProject,
  type MotionProject
} from "@/lib/motion/studio";

type PreviewPacket = { kind: "margaryan-motion-preview-v1"; project: unknown };
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
  const [project, setProject] = useState<MotionProject>(() => makeMotionPreset("labs"));
  const [received, setReceived] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const exportingRef = useRef(false);
  const [includeScore, setIncludeScore] = useState(false);
  const [narrationFile,setNarrationFile] = useState<File|null>(null);
  const [musicFile,setMusicFile] = useState<File|null>(null);
  const [logoName,setLogoName] = useState<string|null>(null);
  const [logoAnchor,setLogoAnchor] = useState<"top-right"|"bottom-right"|"top-left">("bottom-right");
  const [logoVersion,setLogoVersion] = useState(0);
  const logoRef=useRef<HTMLImageElement|null>(null);
  const logoUrlRef=useRef<string|null>(null);
  const projectIdentityRef=useRef<string|null>(null);
  const [fullHD, setFullHD] = useState(false);
  const audioRef = useRef<ProceduralAudioSession|null>(null);
  const [exportReady, setExportReady] = useState(false);
  const lastExportRef = useRef<{blob:Blob;filename:string}|null>(null);
  const [seek, setSeek] = useState(0);
  const [notice, setNotice] = useState("Waiting for a ChatGPT film draft");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const playbackRef = useRef(0);
  const recordingRef = useRef(false);
  const fps = 24;
  const total = durationOf(project);
  const fmt = FORMAT_SIZE[project.format];
  const exportW = project.format === "landscape" ? (fullHD ? 1920 : 1280) : (fullHD ? 1080 : 720);
  const exportH = Math.round(exportW * fmt.height / fmt.width);
  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    drawMotionFrame(ctx, project, time, canvas.width, canvas.height);
    // Genuine customer-supplied artwork, composed by the browser on EVERY
    // rendered frame and therefore included in the local exported video.
    // Never embedded in ChatGPT tools, submitted to a backend or copied to the
    // URL handoff. No image generation API or paid media infrastructure.
    const logo=logoRef.current;
    if(logo && logo.complete && logo.naturalWidth && logo.naturalHeight){
      const w=canvas.width,h=canvas.height;
      const ratio=logo.naturalWidth/logo.naturalHeight;
      const maxW=w*.24, maxH=h*.105;
      const boxW=Math.min(maxW,maxH*ratio);
      const boxH=boxW/ratio;
      const pad=Math.max(15,Math.round(w*.035));
      const x=logoAnchor==="top-left"?pad:w-pad-boxW;
      const y=logoAnchor==="bottom-right"?h-pad-boxH:pad;
      const bg=Math.max(9,Math.round(w*.015));
      ctx.save();
      ctx.fillStyle="rgba(5,9,16,.62)";
      ctx.beginPath();
      ctx.roundRect(x-bg,y-bg,boxW+2*bg,boxH+2*bg,Math.min(18,bg));
      ctx.fill();
      ctx.drawImage(logo,x,y,boxW,boxH);
      ctx.restore();
    }
  }, [project,logoAnchor,logoVersion]);

  useEffect(() => {
    const listener = (e: MessageEvent<unknown>) => {
      // ChatGPT widget is our *direct* parent. Do not listen to arbitrary
      // adjacent frames, URLs or document messages.
      if (e.source !== window.parent || !isPacket(e.data)) return;
      try {
        if(exportingRef.current)throw Error("Export in progress — finish it before replacing the film");
        const raw = e.data.project;
        if (!raw || typeof raw !== "object" || !Array.isArray((raw as MotionProject).scenes))
          throw Error("Invalid film");
        const scenes = (raw as MotionProject).scenes.length;
        if (scenes < 1 || scenes > 8) throw Error("Unsupported scene count");
        const safe = sanitizeMotionProject(raw);
        if (durationOf(safe) > 64 || safe.scenes.some(s => s.mediaId))
          throw Error("Private video/media cannot enter embedded preview");
        // A new customer film must never inherit the previous customer's
        // private local logo/audio assets when ChatGPT revises the project.
        // A revision of the same brand/title may keep files in the editor;
        // changes to identity always clear user media to avoid contamination.
        if(projectIdentityRef.current !== safe.title+"|"+safe.brand+"|"+String(safe.clientBrand?.name||"")){
          const old=logoUrlRef.current;
          if(old) URL.revokeObjectURL(old);
          logoUrlRef.current=null;logoRef.current=null;
          setLogoName(null);setLogoVersion(v=>v+1);
          setNarrationFile(null);setMusicFile(null);
        }
        projectIdentityRef.current=safe.title+"|"+safe.brand+"|"+String(safe.clientBrand?.name||"");
        lastExportRef.current = null;
        setExportReady(false);
        setPlaying(false); playbackRef.current = 0;
        setSeek(0); setProject(safe); setReceived(true);
        setNotice("Ready to preview / browser graphics only");
      } catch (err) {
        setNotice("Rejected untrusted film: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    const uploadReply = (e:MessageEvent<unknown>) => {
      if(e.source!==window.parent || !e.data || typeof e.data!=="object")return;
      const message=e.data as {kind?:string;message?:unknown};
      if(message.kind==="margaryan-motion-upload-status-v1" && typeof message.message==="string")
        setNotice(message.message.slice(0,250));
    };
    window.addEventListener("message", uploadReply);
    window.addEventListener("message", listener);
    // Handshake ensures the parent MCP widget cannot miss a draft while
    // Next.js hydrates the child React app after the iframe load event.
    if (window.parent !== window) window.parent.postMessage({kind:"margaryan-motion-preview-ready-v1"}, "*");
    return () => {
      window.removeEventListener("message",listener);
      window.removeEventListener("message",uploadReply);
    };
  }, []);

  useEffect(() => {void preloadMotionLogo(project.brand).then(()=>render(playbackRef.current));}, [project.brand,render]);
  useEffect(()=>()=>{if(logoUrlRef.current)URL.revokeObjectURL(logoUrlRef.current);},[]);

  async function loadLocalLogo(file:File|null){
    if(exportingRef.current||recording||preparing)return;
    if(!file)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5_000_000||file.size<32){
      setNotice("Logo rejected: choose PNG/JPG/WebP under 5MB, no SVG or remote URLs.");
      return;
    }
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.decoding="async";
    try{
      img.src=url;
      await img.decode();
      if(img.naturalWidth<30||img.naturalHeight<30||img.naturalWidth>4096||img.naturalHeight>4096||
         img.naturalWidth*img.naturalHeight>8_000_000)throw Error("Artwork dimensions out of range (30–4096px / 8MP max)");
      if(exportingRef.current)throw Error("Export started while reading the logo");
      if(logoUrlRef.current)URL.revokeObjectURL(logoUrlRef.current);
      logoUrlRef.current=url;logoRef.current=img;
      setLogoName(file.name.slice(0,70));setLogoVersion(v=>v+1);
      setExportReady(false);lastExportRef.current=null;
      setNotice("Local logo loaded into live Canvas and export. File never leaves this browser.");
    }catch(err){
      URL.revokeObjectURL(url);
      setNotice("Cannot decode logo: "+(err instanceof Error?err.message:String(err)));
    }
  }
  function clearLogo(){
    if(exportingRef.current)return;
    if(logoUrlRef.current)URL.revokeObjectURL(logoUrlRef.current);
    logoUrlRef.current=null;logoRef.current=null;
    setLogoName(null);setLogoVersion(v=>v+1);
    setExportReady(false);lastExportRef.current=null;
  }
  useEffect(() => {render(playbackRef.current);},[render,fullHD]);

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
        setSeek(t);
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
    if (recording || preparing) return;
    if (!playing && seek >= total - 0.1) {playbackRef.current = 0;setSeek(0);}
    setPlaying(!playing);
  }
  function scrub(value: number) {
    if (recording || preparing) return;
    setPlaying(false);
    playbackRef.current = value; setSeek(value); render(value);
  }
  async function exportVideo() {
    const canvas = canvasRef.current;
    if (!received || !canvas || recording || preparing || exportingRef.current || !("MediaRecorder" in window) || !canvas.captureStream) {
      setNotice("Video export unavailable in this browser or no film was received");
      return;
    }
    const hasAudio=Boolean(includeScore||narrationFile||musicFile);
    const codecs = hasAudio
      ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus","video/webm"]
      : ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9",
          "video/webm;codecs=vp8","video/webm"];
    const type = codecs.find(x => MediaRecorder.isTypeSupported(x));
    if (!type) {setNotice("Browser has no supported video recorder codec");return;}
    exportingRef.current = true;
    setPreparing(true);
    setNotice("Preparing local video and optional audio tracks…");
    let stream: MediaStream | null = null;
    let audioSession: ProceduralAudioSession | null = null;
    let recorderFailed = false;
    try {
      setPlaying(false);
      playbackRef.current = 0;
      setSeek(0);
      render(0);
      stream = canvas.captureStream(fps);
      if(hasAudio) {
        // Reuse the SAME keyless soundtrack engine as the full Motion Studio.
        // No voice clone, external provider, paid model, or music license.
        audioSession = await createProceduralSoundtrack(project,{
          synth:includeScore,
          voiceover:narrationFile,
          music:musicFile
        });
        audioRef.current = audioSession;
        stream.addTrack(audioSession.track);
      }
      const recorder = new MediaRecorder(stream, {mimeType:type,videoBitsPerSecond:fullHD?7_000_000:4_000_000});
      chunksRef.current = [];
      lastExportRef.current = null; setExportReady(false);
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recorderFailed=true;
        setNotice("Video encoding failed. Export was cancelled rather than delivering a corrupt video.");
        try{if(recorder.state==="recording")recorder.stop();}catch{ /* browser already stopped */ }
      };
      recorder.onstop = () => {
        recordingRef.current = false;
        exportingRef.current = false;
        stream?.getTracks().forEach(t => t.stop());
        const audio = audioRef.current;
        audioRef.current = null;
        void audio?.close();
        const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current,{type});
        if (!recorderFailed && blob.size > 0) {
          const fileName="margaryan-content-studio-"+project.brand+"."+ext;
          lastExportRef.current={blob,filename:fileName};
          setExportReady(true);
          download(blob,fileName);
          setNotice(ext.toUpperCase() + " downloaded ("+(fullHD?"1080p":"720p")+"). " +
            (hasAudio?"Selected local narration/music + optional synthesized score included.":"Silent film.")+" Inspect playback on device.");
        } else setNotice("Recording was empty — try the full editor");
        chunksRef.current = [];
        mediaRef.current = null;
        setRecording(false);
        setPlaying(false);
      };
      mediaRef.current = recorder;
      recordingRef.current = true;
      recorder.start(1000);
      audioSession?.start();
      setNotice("Recording on device — " + (type.startsWith("video/mp4")?"MP4":"WebM") +
        " / "+(fullHD?"1080p":"720p")+" / "+(hasAudio?"licensed/local audio mix":"silent"));
      setRecording(true);
      setPreparing(false);
    } catch(e) {
      exportingRef.current = false;
      setPreparing(false);
      recordingRef.current = false;
      stream?.getTracks().forEach(t=>t.stop());
      const audio = audioRef.current;
      audioRef.current = null;
      void audio?.close();
      mediaRef.current=null;
      setRecording(false);
      setNotice("Export failed: "+(e instanceof Error?e.message:String(e)));
    }
  }

  async function sendToChatGPT(){
    const file=lastExportRef.current;
    if(!file||recording||preparing)return;
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

  return <main style={outer}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,letterSpacing:".1em",color:"#b4c1d8"}}>
      <span>◈ {clientBrandInfo(project).name} / LIVE CANVAS</span>
      <span>{project.format.toUpperCase()} · {total.toFixed(1)}S</span>
    </div>
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:258,maxHeight:270,margin:"10px auto",borderRadius:9,overflow:"hidden",background:"#0c1018"}}>
      <canvas ref={canvasRef} width={exportW} height={exportH}
        style={{display:"block",width:"auto",height:"auto",maxWidth:"100%",maxHeight:270,aspectRatio:fmt.width+"/"+fmt.height}} />
    </div>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <button type="button" disabled={!received||recording||preparing} style={button} onClick={toggle}>{playing?"Ⅱ PAUSE":"▶ PLAY"}</button>
      <input aria-label="Film playhead" disabled={!received||recording||preparing} type="range" min={0} max={total} step={0.05}
        value={seek} onChange={e=>scrub(Number(e.target.value))} style={{flex:1,minWidth:60}}/>
      <span style={{fontSize:10,color:"#bfc5d0"}}>{seek.toFixed(1)}S</span>
    </div>
    <details style={{border:"1px solid #28303d",borderRadius:9,padding:"8px 10px",margin:"9px 0 0",background:"#121824"}}>
      <summary style={{fontSize:11,color:"#c3d2e8",letterSpacing:".05em",fontWeight:800,cursor:"pointer"}}>＋ BRAND LOGO & VOICE / MUSIC (LOCAL FILES)</summary>
      <p style={{fontSize:10,lineHeight:1.5,color:"#9eafc6",margin:"8px 0"}}>Use artwork/audio you own or are licensed to use. Nothing is uploaded to Margaryan servers. Files stay in this browser while the film is open.</p>
      <div style={{display:"grid",gap:9}}>
        <label style={{fontSize:11,color:"#d1dceb",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          LOGO (PNG / JPEG / WEBP, ≤5MB)
          <input aria-label="Upload a local brand logo" disabled={recording||preparing}
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" type="file"
            style={{fontSize:10,maxWidth:260}}
            onChange={e=>{void loadLocalLogo(e.target.files?.[0]||null);e.currentTarget.value="";}}/>
        </label>
        {logoName&&<div style={{fontSize:10,color:"#b5d8c7",display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}>
          ✓ {logoName}
          <select aria-label="Logo placement" disabled={recording||preparing}
            value={logoAnchor} onChange={e=>{setLogoAnchor(e.target.value as "top-right"|"bottom-right"|"top-left");lastExportRef.current=null;setExportReady(false);}}
            style={{background:"#111827",color:"#e8edf3",padding:5,border:"1px solid #394b65"}}>
            <option value="bottom-right">BOTTOM RIGHT</option>
            <option value="top-right">TOP RIGHT</option>
            <option value="top-left">TOP LEFT</option>
          </select>
          <button style={button} type="button" onClick={clearLogo} disabled={recording||preparing}>REMOVE</button>
        </div>}
        <label style={{fontSize:11,color:"#d1dceb",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          NARRATION (audio, ≤15MB)
          <input aria-label="Add local narration" disabled={recording||preparing}
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" type="file" style={{fontSize:10,maxWidth:260}}
            onChange={e=>{const file=e.currentTarget.files?.[0]||null;
              if(file&&file.type.startsWith("audio/")&&file.size<=15_000_000){
                setNarrationFile(file);lastExportRef.current=null;setExportReady(false);
                setNotice("Narration loaded. The entire trimmed voice segment must fit the film duration.");
              }else if(file)setNotice("Narration rejected: audio under 15MB required");
              e.currentTarget.value="";
            }}/>
          {narrationFile&&<button style={button} type="button" disabled={recording||preparing}
            onClick={()=>{setNarrationFile(null);lastExportRef.current=null;setExportReady(false);}}>REMOVE VOICE</button>}
        </label>
        {narrationFile&&<div style={{fontSize:10,color:"#aebdd1"}}>✓ {narrationFile.name.slice(0,60)}</div>}
        <label style={{fontSize:11,color:"#d1dceb",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          OWNED / LICENSED MUSIC (audio, ≤30MB)
          <input aria-label="Add local music" disabled={recording||preparing}
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" type="file" style={{fontSize:10,maxWidth:260}}
            onChange={e=>{const file=e.currentTarget.files?.[0]||null;
              if(file&&file.type.startsWith("audio/")&&file.size<=30_000_000){
                setMusicFile(file);lastExportRef.current=null;setExportReady(false);
                setNotice("Music loaded. Use only media you own or are licensed to publish.");
              }else if(file)setNotice("Music rejected: audio under 30MB required");
              e.currentTarget.value="";
            }}/>
          {musicFile&&<button style={button} type="button" disabled={recording||preparing}
            onClick={()=>{setMusicFile(null);lastExportRef.current=null;setExportReady(false);}}>REMOVE MUSIC</button>}
        </label>
        {musicFile&&<div style={{fontSize:10,color:"#aebdd1"}}>✓ {musicFile.name.slice(0,60)}</div>}
      </div>
    </details>
    <div style={{display:"flex",gap:12,marginTop:10,marginBottom:8,alignItems:"center",flexWrap:"wrap",fontSize:10,color:"#c7ccda"}}>
      <label style={{display:"inline-flex",alignItems:"center",gap:5}}>
        <input disabled={recording||preparing} checked={fullHD} type="checkbox" onChange={e=>setFullHD(e.target.checked)}/>
        FULL HD / 1080P
      </label>
      <label style={{display:"inline-flex",alignItems:"center",gap:5}}>
        <input disabled={recording||preparing} checked={includeScore} type="checkbox" onChange={e=>setIncludeScore(e.target.checked)}/>
        ORIGINAL SOUNDTRACK / EXPORT ONLY
      </label>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
      <button disabled={!received||recording||preparing} style={button} type="button" onClick={()=>void exportVideo()}>{preparing?"◌ PREPARING":recording?"◌ RECORDING":"↓ EXPORT VIDEO"}</button>
      <button disabled={!exportReady||recording||preparing} style={button} type="button" onClick={()=>void sendToChatGPT()}>
        ↥ SAVE TO CHATGPT
      </button>
      <span style={{fontSize:10,color:"#a8b3c1"}}>{fullHD?"1080P":"720P"} · LOCAL · 24FPS</span>
    </div>
    <div role="status" style={{fontSize:10,lineHeight:1.5,marginTop:9,color:"#bfc6d4"}}>{notice}</div>
  </main>;
}
