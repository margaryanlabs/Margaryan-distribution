"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {FORMAT_SIZE,durationOf,type MotionProject} from "@/lib/motion/studio";
import {drawMotionFrame} from "@/lib/motion/render-engine";
import {preloadMotionLogo} from "@/lib/motion/brand-assets";
import {planBrowserFeature,type BrowserSegment} from "@/lib/motion/film-browser-plan";
import {prepareFilmAudio,validateSoundSource,type FilmBrowserAudio} from "@/lib/motion/film-audio-mix";
import styles from "./film-browser-export.module.css";

type Phase="idle"|"preparing"|"playing"|"recording"|"finishing";
const FPS=24;
// A 300-second 720p film at 2.2Mbps stays below the 120MB safety cap on most
// browser encoders; actual device encoder bitrate is not guaranteed.
const bitRate=2_200_000;

function clock(n:number){return Math.floor(n/60)+":"+String(Math.floor(n%60)).padStart(2,"0");}
function mime(hasAudio:boolean){
  if(typeof MediaRecorder==="undefined")return "";
  const formats=hasAudio
    ? ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
    : ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  return formats.find(t=>MediaRecorder.isTypeSupported(t))||"";
}
function getSceneAt(parts:BrowserSegment[],at:number){
  const segment=parts.find(p=>at<p.end)||parts[parts.length-1];
  if(!segment)throw Error("No film chapters");
  return {project:segment.project,local:Math.min(Math.max(0,at-segment.start),durationOf(segment.project)-.0001)};
}
export default function FilmBrowserExport({chapters,busy,dirty}:{
  chapters:MotionProject[];busy:boolean;dirty:boolean;
}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const raf=useRef<number|null>(null);
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const audio=useRef<FilmBrowserAudio|null>(null);
  const aborted=useRef(false);
  const startLock=useRef(false);
  const pieces=useRef<Blob[]>([]);
  const lastUI=useRef(0);
  const [phase,setPhase]=useState<Phase>("idle");
  const [voiceFile,setVoiceFile]=useState<File|null>(null);
  const [musicFile,setMusicFile]=useState<File|null>(null);
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [position,setPosition]=useState(0);
  const [message,setMessage]=useState("Local browser workprint / graphics only, without soundtrack.");
  const [exportType,setExportType]=useState("");
  const bounds=useMemo(()=>{
    try{return {ok:true as const,...planBrowserFeature(chapters)}}
    catch(e){return {ok:false as const,reason:e instanceof Error?e.message:String(e)}}
  },[chapters]);
  const active=phase!=="idle";
  const hasAudio=Boolean(voiceFile||musicFile);
  const canStart=bounds.ok&&!dirty&&!busy&&!active&&(!hasAudio||rightsConfirmed);
  function setApprovedFile(kind:"voice"|"music",file:File|null){
    if(file){try{validateSoundSource(file,kind);}catch(e){
      setMessage(e instanceof Error?e.message:String(e));return;
    }}
    if(kind==="voice")setVoiceFile(file);else setMusicFile(file);
    setRightsConfirmed(false);
    setMessage(file?("Local "+kind+" loaded. Confirm you own the rights before capturing audio."):
      "Local audio track cleared; film remains on this device.");
  }
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
    aborted.current=true;startLock.current=false;
    if(recorder.current?.state==="recording")recorder.current.stop();
    else {stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;}
    const stopAudio=audio.current;audio.current=null;
    if(stopAudio)void stopAudio.close();
    if(reason)setMessage(reason);
    setPhase("idle");
  }
  const haltRef=useRef(halt);
  haltRef.current=halt;
  const previousChapters=useRef(chapters);
  useEffect(()=>{
    if(previousChapters.current!==chapters&&(raf.current!==null||startLock.current))
      haltRef.current("Saved chapters changed. Recording cancelled; start a fresh export after reviewing edits.");
    previousChapters.current=chapters;
  },[chapters]);
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
      if(document.visibilityState!=="visible"&&(raf.current!==null||startLock.current))
        haltRef.current("Export/preview interrupted: keep this tab visible while capturing video.");
    };
    document.addEventListener("visibilitychange",listener);
    return()=>document.removeEventListener("visibilitychange",listener);
  },[]);

  async function start(record:boolean){
    if(startLock.current||!canStart||!bounds.ok||!canvas.current)return;
    if(record&&!("captureStream" in canvas.current)){
      setMessage("Canvas stream recording is unsupported on this browser.");return;
    }
    const chosen=record?mime(hasAudio):"";
    if(record&&!chosen){setMessage("No supported MP4/WebM recorder on this device. Try offline Master.");return;}
    startLock.current=true;
    setPhase("preparing");
    setMessage("PREPARING / decoding local audio and original film graphics…");
    try{
      aborted.current=false;
      pieces.current=[];
      if(raf.current!==null)cancelAnimationFrame(raf.current);
      setPosition(0);lastUI.current=0;
      await preloadMotionLogo(bounds.brand);
      if(!canvas.current||aborted.current)return;
      paint(0);
      const mixed=await prepareFilmAudio({voice:voiceFile,music:musicFile},length,rightsConfirmed);
      if(aborted.current){await mixed?.close();return;}
      audio.current=mixed;
      if(record){
        const graphics=canvas.current.captureStream(FPS);
        const media=new MediaStream([...graphics.getVideoTracks(),...(mixed?mixed.stream.getAudioTracks():[])]);
        const video=new MediaRecorder(media,{mimeType:chosen,videoBitsPerSecond:bitRate});
        stream.current=media;recorder.current=video;
        video.ondataavailable=e=>{if(e.data.size)pieces.current.push(e.data);};
        video.onerror=()=>{halt("Browser recorder error; use the workstation Master.");};
        video.onstop=()=>{
          media.getTracks().forEach(track=>track.stop());
          stream.current=null;recorder.current=null;
          const finishedAudio=audio.current;audio.current=null;
          if(finishedAudio)void finishedAudio.close();
          const cancelled=aborted.current;
          const data=pieces.current;pieces.current=[];
          if(cancelled)return;
          const type=chosen.startsWith("video/mp4")?"mp4":"webm";
          const blob=new Blob(data,{type:chosen});
          if(blob.size<1000||blob.size>120_000_000){
            setMessage("Browser film was empty or above 120MB. Export with the workstation Master.");
            setPhase("idle");startLock.current=false;return;
          }
          const name="motion-film-visual-workprint-"+Math.round(length)+"s."+type;
          const url=URL.createObjectURL(blob);
          const link=document.createElement("a");
          link.href=url;link.download=name;
          document.body.appendChild(link);link.click();link.remove();
          window.setTimeout(()=>URL.revokeObjectURL(url),60_000);
          setExportType(type.toUpperCase());
          setMessage("FULL-FILM BROWSER WORKPRINT DOWNLOADED. "+type.toUpperCase()+
            (mixed?" / includes your approved local audio":" / silent visuals only")+
            ". Inspect video, runtime, licensed audio and synchronization before publishing.");
          setPhase("idle");startLock.current=false;
        };
        video.start(1000);
        await mixed?.start();
        setPhase("recording");
        setMessage("Recording full film"+(mixed?" with approved local audio":" (silent)")+
          " in real time. Keep this tab open and visible.");
      }else{
        await mixed?.start();
        setPhase("playing");
        setMessage("Whole-film preview playing"+(mixed?" with your licensed local audio":" silently")+".");
      }
      const started=performance.now();
      const loop=(now:number)=>{
        if(aborted.current)return;
        const t=Math.min(length,Math.max(0,(now-started)/1000));
        try{paint(t);}catch(e){halt("Canvas render stopped: "+(e instanceof Error?e.message:"unknown error"));return;}
        if(now-lastUI.current>220 || t>=length){
          setPosition(t);lastUI.current=now;
        }
        if(t>=length){
          raf.current=null;
          if(record&&videoRecorderIsRunning(recorder.current)){
            setPhase("finishing");recorder.current?.stop();
          }else{
            setPhase("idle");startLock.current=false;
            const finishedAudio=audio.current;audio.current=null;
            if(finishedAudio)void finishedAudio.close();
          }
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
    <div className={styles.soundPanel}>
      <div className={styles.soundHeading}>SOUNDTRACK / YOUR OWN LOCAL AUDIO</div>
      <div className={styles.soundFiles}>
        <label>NARRATION / HUMAN VOICE
          <input disabled={active||busy} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
            onChange={e=>{const file=e.target.files?.[0]||null;e.target.value="";setApprovedFile("voice",file);}}/>
          <small>{voiceFile?voiceFile.name:"No narration attached"}</small>
        </label>
        <label>MUSIC / LICENSED TRACK
          <input disabled={active||busy} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac"
            onChange={e=>{const file=e.target.files?.[0]||null;e.target.value="";setApprovedFile("music",file);}}/>
          <small>{musicFile?musicFile.name:"No music attached"}</small>
        </label>
      </div>
      {(voiceFile||musicFile)&&<>
        <label className={styles.rights}><input type="checkbox" checked={rightsConfirmed} disabled={active}
          onChange={e=>setRightsConfirmed(e.target.checked)}/>
          <span>I own these recordings or have the rights to use and export them. The files stay on this device.</span>
        </label>
        <button className={styles.clearAudio} type="button" disabled={active}
          onClick={()=>{setVoiceFile(null);setMusicFile(null);setRightsConfirmed(false);setMessage("All local soundtrack files cleared.");}}>REMOVE ALL AUDIO</button>
      </>}
    </div>
    <div className={styles.actions}>
      <button type="button" disabled={!canStart} onClick={()=>void start(false)}>▶ PLAY WHOLE FILM</button>
      <button type="button" disabled={!canStart} onClick={()=>void start(true)}>↓ EXPORT VISUAL FILM</button>
      {active&&<button type="button" className={styles.stop} onClick={()=>halt("Recording stopped; no partial file published.")}>■ STOP</button>}
    </div>
    <p className={styles.notice} role="status">{phase==="recording"?"● RECORDING / "+clock(position)+" / "+(exportType||"LOCAL"):message}</p>
    <p className={styles.warning}>Browser export records the existing Canvas graphics across ALL chapters without an API key or cloud rendering. Optionally mix <b>your own licensed music and recorded human voice</b> locally using Web Audio. The music is reduced when narration is present; no generative TTS or library music is supplied. This is still a device-dependent <b>browser workprint</b>, not a broadcast-certified deliverable. Source footage/overlays and guaranteed H.264 frame accuracy require the workstation Master. Keep this tab visible during recording. Max 300s / 720p / 24fps. Older devices may fail long real-time captures; prefer the local FFmpeg master for delivery.</p>
  </section>;
}
function videoRecorderIsRunning(r:MediaRecorder|null){return Boolean(r&&r.state==="recording");}
