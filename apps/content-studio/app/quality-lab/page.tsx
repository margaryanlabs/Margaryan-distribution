"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {drawMotionFrame} from "@/lib/motion/render-engine";
import {createProceduralSoundtrack,type ProceduralAudioSession} from "@/lib/motion/sound-engine";
import {preloadMotionLogo} from "@/lib/motion/brand-assets";
import {makeMotionPreset,type MotionProject} from "@/lib/motion/studio";
import styles from "./quality-lab.module.css";

type Result={label:string;status:"pass"|"warn"|"fail";detail:string};
const FPS=24,WIDTH=720,HEIGHT=1280,DURATION=6;
function makeTestFilm():MotionProject{
  const base=makeMotionPreset("labs","portrait");
  return {...base,title:"CONTENT STUDIO / VIDEO PROOF",brand:"labs",format:"portrait",
    filmChrome:"clean",qualityMode:"signature",
    scenes:[
      {id:"qa-1",kind:"kinetic",eyebrow:"CONTENT STUDIO",headline:"REAL PIXELS. REAL MOTION.",
        support:"Browser based frame rendering.",seconds:3},
      {id:"qa-2",kind:"network",eyebrow:"CHAPTER TWO",headline:"SOMETHING MOVES.",
        support:"Editable original Motion Engine.",seconds:3}
    ]
  };
}
function comparison(a:Uint8ClampedArray,b:Uint8ClampedArray){
  let changed=0,total=0,nonblank=0;
  for(let y=16;y<HEIGHT;y+=64)for(let x=16;x<WIDTH;x+=64){
    const i=(y*WIDTH+x)*4;
    const diff=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
    if(diff>18)changed++;
    if(a[i]>7||a[i+1]>7||a[i+2]>7)nonblank++;
    total++;
  }
  return {changed,total,nonblank};
}
function sizeText(bytes:number){return(bytes/1024/1024).toFixed(2)+" MB";}
async function metadata(blob:Blob){
  const url=URL.createObjectURL(blob);
  try{
    return await new Promise<{width:number;height:number;duration:number}>((resolve,reject)=>{
      const element=document.createElement("video");
      const timer=window.setTimeout(()=>{element.removeAttribute("src");element.load();reject(Error("Browser decoder timed out."));},9000);
      element.preload="metadata";
      element.onloadedmetadata=()=>{window.clearTimeout(timer);resolve({width:element.videoWidth,height:element.videoHeight,duration:element.duration});};
      element.onerror=()=>{window.clearTimeout(timer);reject(Error("Browser cannot decode the recorded file."));};
      element.src=url;
    });
  }finally{URL.revokeObjectURL(url);}
}
export default function QualityLab(){
  const [running,setRunning]=useState(false);
  const [withSound,setWithSound]=useState(false);
  const [results,setResults]=useState<Result[]>([]);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState("");
  const [format,setFormat]=useState("");
  const [file,setFile]=useState<Blob|null>(null);
  const [fileName,setFileName]=useState("");
  const [playUrl,setPlayUrl]=useState("");
  const canvas=useRef<HTMLCanvasElement>(null);
  const alive=useRef(true);
  const liveURL=useRef<string|null>(null);
  const mediaRef=useRef<MediaRecorder|null>(null);
  const abort=useRef(false);
  const project=useRef<MotionProject>(makeTestFilm());
  useEffect(()=>{alive.current=true;abort.current=false;return ()=>{
    alive.current=false;abort.current=true;
    if(liveURL.current)URL.revokeObjectURL(liveURL.current);
    const recorder=mediaRef.current;
    try{if(recorder?.state==="recording")recorder.stop();}catch{/* best effort */}
  };},[]);

  const push=(label:string,status:Result["status"],detail:string)=>{
    if(alive.current)setResults(v=>[...v,{label,status,detail}]);
  };
  const test=useCallback(async()=>{
    if(running)return;
    abort.current=false;
    setRunning(true);setError("");setProgress(0);setResults([]);
    setFile(null);setFormat("");setFileName("");
    if(liveURL.current)URL.revokeObjectURL(liveURL.current);
    liveURL.current=null;setPlayUrl("");
    let stream:MediaStream|null=null;
    let session:ProceduralAudioSession|null=null;
    let recorder:MediaRecorder|null=null;
    try{
      const node=canvas.current;
      if(!node)throw Error("Canvas not mounted");
      node.width=WIDTH;node.height=HEIGHT;
      const context=node.getContext("2d",{willReadFrequently:true});
      if(!context)throw Error("Canvas 2D is unavailable");
      if(!("MediaRecorder" in window)||!node.captureStream)throw Error("This browser has no canvas recording interface");
      await preloadMotionLogo("labs");
      const film=project.current;
      drawMotionFrame(context,film,0.5,WIDTH,HEIGHT);
      const a=context.getImageData(0,0,WIDTH,HEIGHT).data;
      drawMotionFrame(context,film,4.5,WIDTH,HEIGHT);
      const b=context.getImageData(0,0,WIDTH,HEIGHT).data;
      const check=comparison(a,b);
      if(check.nonblank===0)throw Error("Black or blank canvas — film did not render");
      push("CANVAS PIXELS","pass","Original Motion Engine painted "+WIDTH+" × "+HEIGHT+" on the local canvas.");
      if(check.changed/check.total<=.03)push("ANIMATION DIFFERENCE","warn","Only "+Math.round(check.changed/check.total*100)+"% sampled pixels changed. Review the actual scene animation.");
      else push("ANIMATION DIFFERENCE","pass",Math.round(check.changed/check.total*100)+"% sampled pixels differ between two shots.");
      if(abort.current)throw Error("Cancelled");
      const choices=withSound?
        ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]:
        ["video/mp4;codecs=avc1.42E01E","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
      const codec=choices.find(value=>MediaRecorder.isTypeSupported(value));
      if(!codec)throw Error("No supported MP4/WebM MediaRecorder codec");
      const videoStream=node.captureStream(FPS);
      stream=videoStream;
      push("VIDEO CODEC","pass",codec+" · "+FPS+" FPS requested (not guaranteed actual).");
      if(withSound){
        session=await createProceduralSoundtrack(film,{synth:true});
        if(abort.current)throw Error("Cancelled");
        stream.addTrack(session.track);
        push("AUDIO TRACK","pass","Original keyless sound-engine produced an audio track. Audible quality still needs listening.");
      }
      recorder=new MediaRecorder(stream,{mimeType:codec,videoBitsPerSecond:3_800_000});
      mediaRef.current=recorder;
      const chunks:Blob[]=[];
      recorder.ondataavailable=(event)=>{if(event.data?.size)chunks.push(event.data);};
      const stopped=new Promise<Blob>((resolve,reject)=>{
        recorder!.onerror=()=>reject(Error("Browser encoder reported an error."));
        recorder!.onstop=()=>resolve(new Blob(chunks,{type:recorder!.mimeType||codec}));
      });
      drawMotionFrame(context,film,0,WIDTH,HEIGHT);
      recorder.start(250);
      session?.start();
      push("MEDIA RECORDER","pass","Recording original animated pixels locally for "+DURATION+" seconds.");
      const begun=performance.now(),maximum=begun+Math.max(DURATION*1000*3,17500);
      await new Promise<void>((resolve,reject)=>{
        function frame(now:number){
          if(abort.current){reject(Error("Cancelled"));return;}
          const elapsed=(now-begun)/1000;
          drawMotionFrame(context!,film,Math.min(elapsed,DURATION),WIDTH,HEIGHT);
          if(alive.current)setProgress(Math.round(Math.min(1,elapsed/DURATION)*100));
          if(now>maximum){reject(Error("Real-time recording exceeded the browser time budget"));return;}
          if(elapsed>=DURATION){resolve();return;}
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
      if(recorder.state==="recording")recorder.stop();
      const blob=await Promise.race([
        stopped,
        new Promise<never>((_,reject)=>window.setTimeout(()=>reject(Error("MediaRecorder did not finish encoding.")),9000))
      ]);
      if(blob.size<2048)throw Error("Encoded file is empty or implausibly small ("+blob.size+" bytes)");
      const ext=codec.startsWith("video/mp4")?"mp4":"webm";
      const name="content-studio-video-proof-"+new Date().toISOString().slice(0,10)+"."+ext;
      push("ENCODED VIDEO","pass",ext.toUpperCase()+" · "+sizeText(blob.size)+" · original "+WIDTH+" × "+HEIGHT+" canvas.");
      setFormat(ext.toUpperCase());setFile(blob);setFileName(name);
      const url=URL.createObjectURL(blob);
      liveURL.current=url;setPlayUrl(url);
      try{
        const info=await metadata(blob);
        if(info.width!==WIDTH||info.height!==HEIGHT)push("DECODED DIMENSIONS","fail","Expected "+WIDTH+"×"+HEIGHT+", decoded "+info.width+"×"+info.height);
        else push("DECODED DIMENSIONS","pass",info.width+"×"+info.height+" confirmed by local browser decoder.");
        if(Number.isFinite(info.duration)&&info.duration>0){
          const ok=info.duration>=DURATION-1&&info.duration<=DURATION+2.5;
          push("DECODED DURATION",ok?"pass":"fail",info.duration.toFixed(2)+" seconds (expected about 6.0 seconds).");
        }else{
          push("DECODED DURATION","warn","Browser returned "+String(info.duration)+" for this "+ext.toUpperCase()+" blob. Playback must be checked manually.");
        }
      }catch(err){push("LOCAL DECODER","fail",err instanceof Error?err.message:String(err));}
      push("PRIVACY","pass","Render, pixels, audio (if enabled) and video blob stayed on this device. No upload calls were made.");
    }catch(e){const msg=e instanceof Error?e.message:String(e);if(alive.current){setError(msg);push("RENDER FAILED","fail",msg);}}
    finally{
      if(recorder?.state==="recording"){try{recorder.stop();}catch{/* best effort */}}
      stream?.getTracks().forEach(t=>t.stop());
      if(session)void session.close();
      mediaRef.current=null;
      if(alive.current)setRunning(false);
    }
  },[running,withSound]);

  const passed=results.filter(x=>x.status==="pass").length;
  const failed=results.filter(x=>x.status==="fail").length;
  return <main className={styles.page}>
    <div className={styles.shell}>
      <nav className={styles.nav}><Link href="/">MARGARYAN LABS <span>/ CONTENT STUDIO</span></Link><span>QUALITY ENGINEERING / PUBLIC BETA</span></nav>
      <div className={styles.eyebrow}>LAB 01 / REAL VIDEO OUTPUT</div>
      <h1>Prove the film.<br/><em>Not the promise.</em></h1>
      <p className={styles.lead}>This is an actual on-device acceptance test. It paints moving frames using the same production Motion Engine, records a six-second 720 × 1280 video, decodes the resulting file and gives you the original pixels to inspect. No AI API, account or server-side render.</p>
      <div className={styles.content}>
        <section className={styles.preview}>
          <div className={styles.label}><span>LIVE CANVAS</span><span>720 × 1280 / 24 FPS REQUESTED</span></div>
          <div className={styles.stage}><canvas ref={canvas} width={WIDTH} height={HEIGHT}/></div>
          <div className={styles.controls}>
            <label className={styles.toggle}><input type="checkbox" checked={withSound} disabled={running} onChange={e=>setWithSound(e.target.checked)}/> TEST ORIGINAL SOUND ENGINE</label>
            <button className={styles.run} disabled={running} onClick={()=>void test()}>{running?"◌ ENCODING — "+progress+"%":"▶ RUN REAL VIDEO TEST"}</button>
          </div>
          {running&&<div className={styles.progress}><div style={{width:progress+"%"}}/></div>}
          {error&&<p className={styles.error} role="alert">{error}</p>}
        </section>
        <section className={styles.report}>
          <div className={styles.label}><span>DEVICE ACCEPTANCE</span><span>{passed} PASS / {failed} FAIL</span></div>
          <h2>Actual browser proof.</h2>
          {results.length===0?<p className={styles.empty}>No test has run on this device yet. Press RUN REAL VIDEO TEST to inspect your browser's genuine export capabilities.</p>:
          <div className={styles.results} role="status" aria-live="polite">{results.map((result,i)=><div className={styles.result} key={i} data-status={result.status}>
            <b>{result.status==="pass"?"✓":result.status==="warn"?"!":"×"}</b>
            <div><strong>{result.label}</strong><p>{result.detail}</p></div>
          </div>)}</div>}
          {file&&playUrl&&<div className={styles.playback}>
            <div className={styles.label}><span>RECORDED FILE</span><span>{format} · {sizeText(file.size)}</span></div>
            <video controls playsInline preload="metadata" src={playUrl} aria-label="Play the encoded local proof video"/>
            <a className={styles.download} download={fileName} href={playUrl}>↓ DOWNLOAD ACTUAL {format} FILE</a>
          </div>}
          <div className={styles.disclaimer}><strong>What this verifies:</strong> local canvas paint, frame changes, encode, file size and browser decode. <strong>What it does not:</strong> ChatGPT installation, actual user voice/music synchronization, background-tab export, other devices, professional visual quality or publishing rights. Listen and watch the file before approving commercial output.</div>
        </section>
      </div>
      <footer><Link href="/motion">OPEN FULL MOTION STUDIO ↗</Link><Link href="/connect">CONNECT TO CHATGPT ↗</Link><Link href="/privacy">PRIVACY ↗</Link></footer>
    </div>
  </main>;
}
