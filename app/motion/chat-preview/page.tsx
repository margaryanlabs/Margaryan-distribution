"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawMotionFrame } from "@/lib/motion/render-engine";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import {
  BRAND_INFO, FORMAT_SIZE, durationOf, makeMotionPreset, sanitizeMotionProject,
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
  const exportW = project.format === "landscape" ? 1280 : project.format === "square" ? 720 : 720;
  const exportH = Math.round(exportW * fmt.height / fmt.width);
  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    drawMotionFrame(ctx, project, time, canvas.width, canvas.height);
  }, [project]);

  useEffect(() => {
    const listener = (e: MessageEvent<unknown>) => {
      // ChatGPT widget is our *direct* parent. Do not listen to arbitrary
      // adjacent frames, URLs or document messages.
      if (e.source !== window.parent || !isPacket(e.data)) return;
      try {
        const raw = e.data.project;
        if (!raw || typeof raw !== "object" || !Array.isArray((raw as MotionProject).scenes))
          throw Error("Invalid film");
        const scenes = (raw as MotionProject).scenes.length;
        if (scenes < 1 || scenes > 8) throw Error("Unsupported scene count");
        const safe = sanitizeMotionProject(raw);
        if (durationOf(safe) > 64 || safe.scenes.some(s => s.mediaId))
          throw Error("Private video/media cannot enter embedded preview");
        setPlaying(false); playbackRef.current = 0;
        setSeek(0); setProject(safe); setReceived(true);
        setNotice("Ready to preview / browser graphics only");
      } catch (err) {
        setNotice("Rejected untrusted film: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
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
      stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {mimeType:type,videoBitsPerSecond:4_000_000});
      chunksRef.current = [];
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => setNotice("Recorder failed; try full Motion Studio export");
      recorder.onstop = () => {
        recordingRef.current = false;
        stream?.getTracks().forEach(t => t.stop());
        const ext = type.startsWith("video/mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current,{type});
        if (blob.size > 0) {
          download(blob,"margaryan-content-studio-"+project.brand+"."+ext);
          setNotice(ext.toUpperCase() + " downloaded. No audio was generated; inspect playback on device.");
        } else setNotice("Recording was empty — try the full editor");
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
      mediaRef.current=null;
      setRecording(false);
      setNotice("Export failed: "+(e instanceof Error?e.message:String(e)));
    }
  }

  return <main style={outer}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:10,letterSpacing:".1em",color:"#b4c1d8"}}>
      <span>◈ {BRAND_INFO[project.brand].name} / LIVE CANVAS</span>
      <span>{project.format.toUpperCase()} · {total.toFixed(1)}S</span>
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
      <button disabled={!received||recording} style={button} type="button" onClick={exportVideo}>{recording?"◌ RECORDING":"↓ EXPORT VIDEO"}</button>
      <span style={{fontSize:10,color:"#a8b3c1"}}>720P · LOCAL · 24FPS</span>
    </div>
    <div role="status" style={{fontSize:10,lineHeight:1.5,marginTop:9,color:"#bfc6d4"}}>{notice}</div>
  </main>;
}
