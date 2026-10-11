"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {FORMAT_SIZE,durationOf,type MotionProject} from "@/lib/motion/studio";
import {drawMotionFrame} from "@/lib/motion/render-engine";
import {preloadMotionLogo} from "@/lib/motion/brand-assets";
import styles from "./film-browser-export.module.css";

type Phase="idle"|"playing"|"recording"|"finishing";
type Segment={project:MotionProject;start:number;end:number};
const LIMIT=192; // Browser workprints only; offline Master supports up to 512s.
const FPS=24;
const bitRate=2_500_000;

function clock(n:number){return Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0");}
function mime(){
  if(typeof MediaRecorder==="undefined")return "";
  return ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"]
    .find(t=>MediaRecorder.isTypeSupported(t))||"";
}
function getSceneAt(parts:Segment[],at:number){
  const segment=parts.find(p=>at<p.end)||parts[parts.length-1];
  if(!segment)throw Error("No film chapters");
  return {project:segment.project,local:Math.min(Math.max(0,at-segment.start),durationOf(segment.project)-.0001)};
}
function safeBrowserFilm(projects:MotionProject[]){
  let duration=0;const segments:Segment[]=[];
  if(!projects.length)throw Error("Save at least one chapter first");
  const brand=projects[0].brand,format=projects[0].format;
  for(const project of projects){
    if(project.brand!==brand||project.format!==format)throw Error("Every chapter needs one brand and film format");
    if(!project.scenes.length||project.scenes.length>8)throw Error("Every chapter needs 1–8 scenes");
    if(project.signatureFilm)throw Error("Signature-film art needs the full workstation master");
    for(const shot of project.scenes){
      if(shot.kind==="screen"||shot.mediaId||shot.overlayMediaId)
        throw Error("Real source footage/image overlay needs the workstation Master with approved files");
      if(!Number.isFinite(shot.seconds)||shot.seconds<2||shot.seconds>8)
        throw Error("Invalid film scene duration");
    }
    const len=durationOf(project);
    segments.push({project,start:duration,end:duration+len});
    duration+=len;
  }
  if(duration>LIMIT)throw Error("Browser export is limited to 192s. Use the workstation Master for longer films");
  return {segments,total:duration,brand,format};
}
export default function FilmBrowserExport({chapters,busy,dirty}:{
  chapters:MotionProject[];busy:boolean;dirty:boolean;
}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const raf=useRef<number|null>(null);
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const aborted=useRef(false);
  const pieces=useRef<Blob[]>([]);
  const [phase,setPhase]=useState<Phase>("idle");
  const [position,setPosition]=useState(0);
  const [message,setMessage]=useState("Local browser workprint / graphics only, without soundtrack.");
  const [exportType,setExportType]=useState("");
  const bounds=useMemo(()=>{
    try{return {ok:true as const,...safeBrowserFilm(chapters)}}
    catch(e){return {ok:false as const,reason:e instanceof Error?e.message:String(e)}}
  },[chapters]);
  const active=phase!=="idle";
  const canStart=bounds.ok&&!dirty&&!busy&&!active;
  const format=bounds.ok?FORMAT_SIZE[bounds.format]:FORMAT_SIZE.portrait;
  const width=bounds.ok&&bounds.format==="landscape"?1280:720;
  const height=Math.round(width*format.height/format.width);
  const length=bounds.ok?bounds.total:0;
  const paint=useCallback((second:number)=>{
    if(!bounds.ok||!canvas.current)return;
    const ctx=canvas.current.getContext("2d",{alpha:false});
    if(!ctx)throw Error("Canvas 2D unavailable");
    const shot=getSceneAt(bounds.segments,Math.min(second,Math.max(0,bounds.total-.0001)));
    drawMotionFrame(ctx,shot.project,shot.local,canvas.current.width,canvas.current.height);
  },[bounds]);

  function halt(reason?:string){
    if(raf.current!==null){cancelAnimationFrame(raf.current);raf.current=null;}
    aborted.current=true;
    if(recorder.current?.state==="recording")recorder.current.stop();
    else {stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;}
    if(reason)setMessage(reason);
    setPhase("idle");
  }
  const haltRef=useRef(halt);
  haltRef.current=halt;
  useEffect(()=>()=>{
    haltRef.current();
  },[]);
  useEffect(()=>{
    try {if(bounds.ok&&phase==="idle")paint(0);}catch(e){
      setMessage("GRAPHICS PREVIEW: "+(e instanceof Error?e.message:"Canvas error"));
    }
  },[paint,bounds,phase]);

  // Real-time browser capture requires foreground animation frames.
  useEffect(()=>{
    const listener=()=>{
      if(document.visibilityState!=="visible"&&raf.current!==null)
        haltRef.current("Export/preview interrupted: keep this tab visible while capturing video.");
    };
    document.addEventListener("visibilitychange",listener);
    return()=>document.removeEventListener("visibilitychange",listener);
  },[]);

  async function start(record:boolean){
    if(!canStart||!bounds.ok||!canvas.current)return;
    if(record&&!("captureStream" in canvas.current)){
      setMessage("Canvas stream recording is unsupported on this browser.");return;
    }
    const chosen=record?mime():"";
    if(record&&!chosen){setMessage("No supported MP4/WebM recorder on this device. Try offline Master.");return;}
    try{
      aborted.current=false;
      pieces.current=[];
      if(raf.current!==null)cancelAnimationFrame(raf.current);
      setPosition(0);
      await preloadMotionLogo(bounds.brand);
      if(!canvas.current||aborted.current)return;
      paint(0);
      if(record){
        const media=canvas.current.captureStream(FPS);
        const video=new MediaRecorder(media,{mimeType:chosen,videoBitsPerSecond:bitRate});
        stream.current=media;recorder.current=video;
        video.ondataavailable=e=>{if(e.data.size)pieces.current.push(e.data);};
        video.onerror=()=>{halt("Browser recorder error; use the workstation Master.");};
        video.onstop=()=>{
          media.getTracks().forEach(track=>track.stop());
          stream.current=null;recorder.current=null;
          const cancelled=aborted.current;
          const data=pieces.current;pieces.current=[];
          if(cancelled)return;
          const type=chosen.startsWith("video/mp4")?"mp4":"webm";
          const blob=new Blob(data,{type:chosen});
          if(blob.size<1000||blob.size>120_000_000){
            setMessage("Browser film was empty or above 120MB. Export with the workstation Master.");
            setPhase("idle");return;
          }
          const name="motion-film-visual-workprint-"+Math.round(length)+"s."+type;
          const url=URL.createObjectURL(blob);
          const link=document.createElement("a");
          link.href=url;link.download=name;
          document.body.appendChild(link);link.click();link.remove();
          window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
          setExportType(type.toUpperCase());
          setMessage("VISUAL WORKPRINT DOWNLOADED. "+type.toUpperCase()+
            " / no voice or soundtrack. Inspect all scenes, frame cadence and audio separately before publishing.");
          setPhase("idle");
        };
        video.start(1000);
        setPhase("recording");
        setMessage("Recording entire visual film in real time. Keep this tab open and visible.");
      }else{
        setPhase("playing");
        setMessage("Whole-film preview playing through all saved chapters.");
      }
      const started=performance.now();
      const loop=(now:number)=>{
        if(aborted.current)return;
        const t=Math.min(length,Math.max(0,(now-started)/1000));
        try{paint(t);}catch(e){halt("Canvas render stopped: "+(e instanceof Error?e.message:"unknown error"));return;}
        setPosition(t);
        if(t>=length){
          raf.current=null;
          if(record&&videoRecorderIsRunning(recorder.current)){
            setPhase("finishing");recorder.current?.stop();
          }else setPhase("idle");
        }else raf.current=requestAnimationFrame(loop);
      };
      raf.current=requestAnimationFrame(loop);
    }catch(e){
      halt("Unable to start browser video: "+(e instanceof Error?e.message:String(e)));
    }
  }
  return <section className={styles.box} aria-label="Entire feature film browser preview and recording">
    <div className={styles.heading}><span>01 / ALL-CHAPTER LIVE CANVAS</span><strong>LOCAL WORKPRINT</strong></div>
    <div className={styles.canvasWrap}>
      <canvas ref={canvas} width={width} height={height} aria-label="Full film visual preview"
        style={{aspectRatio:format.width+"/"+format.height}} />
    </div>
    <div className={styles.progress} aria-label="Film progress">
      <div style={{width:(length?position/length*100:0)+"%"}} />
    </div>
    <div className={styles.runtime}><span>{clock(position)}</span><span>{clock(length)}</span></div>
    {!bounds.ok&&<p className={styles.alert} role="status">{bounds.reason}</p>}
    {dirty&&<p className={styles.alert}>SAVE ACTIVE CHAPTER before previewing or exporting. Only saved chapters are included.</p>}
    <div className={styles.actions}>
      <button type="button" disabled={!canStart} onClick={()=>void start(false)}>▶ PLAY WHOLE FILM</button>
      <button type="button" disabled={!canStart} onClick={()=>void start(true)}>↓ EXPORT VISUAL FILM</button>
      {active&&<button type="button" className={styles.stop} onClick={()=>halt("Recording stopped; no partial file published.")}>■ STOP</button>}
    </div>
    <p className={styles.notice} role="status">{phase==="recording"?"● RECORDING / "+clock(position)+" / "+(exportType||"LOCAL"):message}</p>
    <p className={styles.warning}>Browser export records the existing Canvas motion graphics across ALL chapters without AI API or a cloud render job. This is a <b>silent visual workprint</b>, not a finished commercial. Real footage, screenshots, picture-in-picture overlays, continuous music, narrated voice and broadcast-quality frame assurance require the separate workstation Master. Keep the screen awake; background capture is cancelled. Up to 192s, 720p/24fps.</p>
  </section>;
}
function videoRecorderIsRunning(r:MediaRecorder|null){return Boolean(r&&r.state==="recording");}
