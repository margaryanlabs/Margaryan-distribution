"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import type { MotionProject } from "@/lib/motion/studio";
import { inspectVoiceSignal, type VoiceSignalReview } from "@/lib/motion/voice-quality";
import { durationOf } from "@/lib/motion/studio";
import styles from "./voice-booth.module.css";

type Props={
  project:MotionProject;
  busy:boolean;
  onAccept:(file:File)=>void;
};
type BoothState="idle"|"recording"|"review";
const supportedMime=()=>{
  if(typeof MediaRecorder==="undefined")return null;
  for(const mime of ["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"])
    if(MediaRecorder.isTypeSupported(mime))return mime;
  return null;
};
const fmt=(t:number)=>String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0");
export default function VoiceBooth({project,busy,onAccept}:Props){
  const [state,setState]=useState<BoothState>("idle");
  const [message,setMessage]=useState("Record genuine human narration in this browser. Nothing is uploaded or sent to a voice AI.");
  const [clip,setClip]=useState<File|null>(null);
  const [url,setURL]=useState<string|null>(null);
  const [seconds,setSeconds]=useState(0);
  const [level,setLevel]=useState(0);
  const [quality,setQuality]=useState<VoiceSignalReview|null>(null);
  const [qualityPending,setQualityPending]=useState(false);
  const [qualityNote,setQualityNote]=useState("Record or upload a real narration. Silent recordings are not approved.");
  const [monitor,setMonitor]=useState(true);
  const rec=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const context=useRef<AudioContext|null>(null);
  const timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const elapsed=useRef(0);
  const active=useRef(true);
  const stop=useCallback(()=>{
    if(timer.current){clearInterval(timer.current);timer.current=null;}
    const recorder=rec.current;
    if(recorder?.state==="recording")recorder.stop();
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;
    if(context.current)void context.current.close().catch(()=>undefined);
    context.current=null;
    rec.current=null;
    setLevel(0);
  },[]);
  useEffect(()=>{
    active.current=true;
    return()=>{active.current=false;stop();};
  },[stop]);
  useEffect(()=>{
    if(!clip){setURL(null);setQuality(null);return;}
    const source=URL.createObjectURL(clip);
    setURL(source);
    return()=>URL.revokeObjectURL(source);
  },[clip]);
  useEffect(()=>{
    if(!clip){setQualityPending(false);return;}
    let activeReview=true;
    setQualityPending(true);setQuality(null);
    void (async()=>{
      if(!window.AudioContext)throw Error("AudioContext unsupported");
      const ctx=new AudioContext();
      try{
        const decoded=await ctx.decodeAudioData(await clip.arrayBuffer());
        const result=inspectVoiceSignal(decoded);
        if(activeReview){setQuality(result);setQualityNote(result.notes.length?result.notes.join(" · "):
          "Voice peaks and average level fall within broad technical ranges. Listen for room echo, noise and diction.");}
      }finally{await ctx.close().catch(()=>undefined);}
    })().catch(error=>{
      if(activeReview){setQuality(null);setQualityNote("Browser cannot measure this recording's audio samples ("+
        (error instanceof Error?error.message:String(error))+
        "). Listen manually before attaching; decoding compatibility varies by browser.");}
    }).finally(()=>{if(activeReview)setQualityPending(false);});
    return()=>{activeReview=false;};
  },[clip]);
  const duration=durationOf(project);
  const maxRecord=Math.min(120,Math.max(8,Math.ceil(duration)+12));
  const start=async()=>{
    if(busy||state==="recording")return;
    if(!navigator.mediaDevices?.getUserMedia){
      setMessage("Microphone recording requires HTTPS and browser media permissions.");
      return;
    }
    const mime=supportedMime();
    if(!mime){setMessage("This browser does not support audio recording. Upload a WAV/MP3/M4A instead.");return;}
    try{
      setClip(null);setURL(null);setSeconds(0);setLevel(0);
      const media=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false
      });
      if(!active.current){media.getTracks().forEach(track=>track.stop());return;}
      stream.current=media;
      const recorder=new MediaRecorder(media,{mimeType:mime,audioBitsPerSecond:128_000});
      rec.current=recorder;
      const parts:BlobPart[]=[];
      recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};
      recorder.onerror=()=>{if(active.current)setMessage("Recorder error. Re-check microphone access and try again.");stop();};
      recorder.onstop=()=>{
        const actualType=recorder.mimeType||mime;
        media.getTracks().forEach(track=>track.stop());
        if(!active.current)return;
        const bytes=new Blob(parts,{type:actualType});
        if(bytes.size<900){
          setState("idle");setMessage("No usable microphone signal was captured. Try again.");
        }else if(bytes.size>15_000_000){
          setState("idle");setMessage("Recording exceeds 15MB. Make a shorter take.");
        }else{
          const ext=actualType.includes("mp4")?"m4a":actualType.includes("ogg")?"ogg":"webm";
          const name="motion-real-narration-"+Date.now()+"."+ext;
          setClip(new File([bytes],name,{type:actualType,lastModified:Date.now()}));
          setState("review");
          setMessage("Human voice recorded locally. Listen to the take before attaching to the film.");
        }
      };
      recorder.start(200);
      elapsed.current=performance.now();
      setState("recording");setMessage("RECORDING / microphone active. Speak naturally with pauses between scenes.");
      timer.current=setInterval(()=>{
        const t=(performance.now()-elapsed.current)/1000;
        if(active.current)setSeconds(t);
        if(t>=maxRecord||t>=120)stop();
      },125);
      // Visual-only microphone meter, never sends waveform to a provider.
      if(monitor){
        try{
          const ctx=new AudioContext();context.current=ctx;
          const input=ctx.createMediaStreamSource(media);
          const analyser=ctx.createAnalyser();analyser.fftSize=256;input.connect(analyser);
          const cells=new Uint8Array(analyser.fftSize);
          const measure=()=>{
            if(!active.current||rec.current!==recorder||recorder.state!=="recording")return;
            analyser.getByteTimeDomainData(cells);
            let sum=0;for(const v of cells){const x=(v-128)/128;sum+=x*x;}
            setLevel(Math.min(1,Math.sqrt(sum/cells.length)*4.2));
          };
          // Sample meter at 8Hz; minimize React work during real-time recording.
          const previous=timer.current;
          if(previous)clearInterval(previous);
          timer.current=setInterval(()=>{
            const t=(performance.now()-elapsed.current)/1000;
            if(active.current){setSeconds(t);measure();}
            if(t>=maxRecord)stop();
          },125);
        }catch{setLevel(0);}
      }
    }catch(e){stop();setState("idle");
      setMessage("MICROPHONE: "+(e instanceof Error?e.message:String(e)));
    }
  };
  const take=()=>{
    if(!clip||busy||qualityPending||quality?.state==="blocked")return;
    onAccept(clip);
    setMessage("Real recorded voice attached to film. Check Voice track timing and listen before final export.");
  };
  const saveTake=()=>{
    if(!url||!clip)return;
    const a=document.createElement("a");a.href=url;a.download=clip.name;
    document.body.appendChild(a);a.click();a.remove();
  };
  const cues=project.scenes.map((shot,index)=>({
    index:index+1,
    seconds:shot.seconds,
    line:(shot.voiceCue||[shot.headline,shot.support].filter(Boolean).join(". ")).trim()
  }));
  return <section className={styles.booth} aria-label="Local human voice recording booth">
    <div className={styles.top}><span>LOCAL / HUMAN PERFORMANCE</span><strong>VOICE BOOTH</strong></div>
    <h3>Record the real voice.</h3>
    <p className={styles.info}>No voice clone, no external TTS, no API key. Your browser records your microphone, then you decide whether the take belongs in the commercial.</p>
    <div className={styles.meter} aria-label="Microphone input level">
      <div className={styles.meterFill} style={{width:Math.round(level*100)+"%"}}/>
    </div>
    <div className={styles.clock}>
      <strong data-recording={state==="recording"}>{state==="recording"?"● REC":"◌ READY"}</strong>
      <span>{fmt(seconds)} <small>/ {fmt(maxRecord)} maximum</small></span>
    </div>
    <div className={styles.actions}>
      {state!=="recording"&&<button disabled={busy} type="button" className={styles.record}
        onClick={()=>void start()}>{state==="review"?"● RECORD NEW TAKE":"● START RECORDING"}</button>}
      {state==="recording"&&<button type="button" className={styles.stop} onClick={()=>stop()}>■ STOP RECORDING</button>}
      {clip&&state==="review"&&<button type="button"
        disabled={busy||qualityPending||quality?.state==="blocked"} onClick={take}>
        ✓ ATTACH HUMAN VOICE
      </button>}
      {clip&&state==="review"&&<button type="button" onClick={saveTake}>↓ SAVE ORIGINAL TAKE</button>}
    </div>
    {url&&state==="review"&&<audio className={styles.audio} src={url} controls preload="metadata" />}
    {clip&&state==="review"&&<div className={styles.signal} data-state={quality?.state||"unverified"}>
      <strong>LOCAL AUDIO INSPECTION / {qualityPending?"ANALYSING":quality?.state.toUpperCase()||"MANUAL REVIEW"}</strong>
      {quality&&<small>PEAK {(quality.peak*100).toFixed(1)}% · RMS {(quality.rms*100).toFixed(1)}%
        · CLIPPED {quality.clippedPercent.toFixed(2)}% · {quality.duration.toFixed(1)} SEC</small>}
      <p>{qualityPending?"Reading real microphone samples locally…":qualityNote}</p>
    </div>}
    <label className={styles.monitor}><input type="checkbox" checked={monitor}
      disabled={state==="recording"} onChange={e=>setMonitor(e.target.checked)}/>
      Show live microphone input meter</label>
    <div className={styles.script}>
      <div className={styles.scriptTitle}><strong>DIRECTOR'S NARRATION CUES</strong><span>{cues.length} SHOTS · {duration.toFixed(1)} SEC</span></div>
      {cues.map(cue=><div className={styles.cue} key={cue.index}>
        <small>{String(cue.index).padStart(2,"0")} / {cue.seconds.toFixed(1)}s</small>
        <p>{cue.line||"No narration direction for this shot."}</p>
      </div>)}
    </div>
    <p className={styles.notice} role="status">{message}</p>
    <small className={styles.privacy}>Microphone turns on only when you press START and switches off when recording stops. Takes are in local browser memory until you save or attach them. Microphone access may be unsupported in embedded browsers.</small>
  </section>;
}
