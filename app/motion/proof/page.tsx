"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {drawProofFrame,PROOF_SECONDS,type ProofMedia} from "@/lib/motion/proof-film";
import {PROOF_DEFAULT_EDL,sanitizeProofEDL,proofSourceTime,type ProofEditDecision} from "@/lib/motion/proof-edl";
import {getLoadedMotionLogo,preloadMotionLogo} from "@/lib/motion/brand-assets";
import {createProofAudioSession,inspectProofAudio} from "@/lib/motion/proof-audio";
import styles from "./proof.module.css";

type ProofBridge = Window & {
  __motionProofFrame?: (time:number)=>Promise<string>;
  __motionProofReady?: boolean;
  __motionProofSource?: "image" | "video";
  __motionProofConfigure?: (changes:Partial<ProofEditDecision>)=>ProofEditDecision;
};
const IMAGE_TYPES=new Set(["image/png","image/jpeg","image/webp"]);
const VIDEO_TYPES=new Set(["video/mp4","video/webm"]);

/** Seek the actual browser-decoded video frame for its exact film time.
 * Called before deterministic offline frame export and during timeline scrubbing.
 * Browser preview during playback uses direct video.play for smooth decode. */
async function seekSourceFrame(media:ProofMedia,seconds:number,force=false,edl:ProofEditDecision=PROOF_DEFAULT_EDL):Promise<void>{
  if(!(media instanceof HTMLVideoElement)||(seconds>=7.55&&!force))return;
  const end=Math.max(.01,media.duration-.11);
  const target=Math.min(proofSourceTime(seconds,media.duration,edl),end);
  if(media.readyState>=2&&Math.abs(media.currentTime-target)<.006)return;
  await new Promise<void>((resolve,reject)=>{
    let finished=false;
    const done=(error?:Error)=>{
      if(finished)return;finished=true;
      clearTimeout(timer);
      media.removeEventListener("seeked",onSeek);
      media.removeEventListener("error",onError);
      if(error)reject(error);else resolve();
    };
    const onSeek=()=>done();
    const onError=()=>done(new Error("Cannot decode local video"));
    const timer=setTimeout(()=>done(new Error("Video seek timed out")),12000);
    media.addEventListener("seeked",onSeek);
    media.addEventListener("error",onError);
    try{media.currentTime=target;}catch(err){done(err instanceof Error?err:new Error(String(err)));}
  });
}
const makeCanvas=(width:number,height:number)=>{
  const c=document.createElement("canvas");c.width=width;c.height=height;return c;
};
export default function ProofDirectorPage(){
  const [source,setSource]=useState<ProofMedia|null>(null);
  const [sourceName,setSourceName]=useState("");
  const [voiceFile,setVoiceFile]=useState<File|null>(null);
  const [musicFile,setMusicFile]=useState<File|null>(null);
  const [voiceUrl,setVoiceUrl]=useState("");
  const [musicUrl,setMusicUrl]=useState("");
  const [voiceInfo,setVoiceInfo]=useState("");
  const [musicInfo,setMusicInfo]=useState("");
  const voiceElement=useRef<HTMLAudioElement>(null);
  const musicElement=useRef<HTMLAudioElement>(null);
  const [logo,setLogo]=useState<HTMLImageElement|null>(null);
  const [seconds,setSeconds]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [showRaw,setShowRaw]=useState(false);
  const [edit,setEdit]=useState<ProofEditDecision>(PROOF_DEFAULT_EDL);
  const editRef=useRef<ProofEditDecision>(PROOF_DEFAULT_EDL);
  const [sourceDuration,setSourceDuration]=useState(8);
  const [exporting,setExporting]=useState(false);
  const [notice,setNotice]=useState("Upload a real, approved Promptence screenshot. Only actual screenshot pixels will enter the movie.");
  const canvas=useRef<HTMLCanvasElement>(null);
  const previewFrame=useRef(0);
  const playingFrom=useRef(0);
  const playBase=useRef(0);
  const sourceRef=useRef<ProofMedia|null>(null);
  const localVideoUrl=useRef<string|null>(null);
  useEffect(()=>()=>{if(localVideoUrl.current)URL.revokeObjectURL(localVideoUrl.current);},[]);
  const logoRef=useRef<HTMLImageElement|null>(null);
  const latestSeconds=useRef(0);
  const exportingRef=useRef(false);
  useEffect(()=>{
    const url=voiceFile?URL.createObjectURL(voiceFile):"";
    setVoiceUrl(url);
    return()=>{if(url)URL.revokeObjectURL(url);};
  },[voiceFile]);
  useEffect(()=>{
    const url=musicFile?URL.createObjectURL(musicFile):"";
    setMusicUrl(url);
    return()=>{if(url)URL.revokeObjectURL(url);};
  },[musicFile]);
  // Preview audio is audible only during explicit user playback. Playback
  // uses original audio files without the speed-ups of earlier bad films.
  useEffect(()=>{
    const elements=[voiceElement.current,musicElement.current];
    if(!playing||exporting){
      for(const el of elements)el?.pause();
      return;
    }
    for(const [i,el] of elements.entries()){
      if(!el||!el.src)continue;
      el.volume=i===0?.95:voiceFile?.12:.35;
      try{el.currentTime=Math.max(0,Math.min(latestSeconds.current,el.duration||10));}catch{}
      void el.play().catch(()=>setNotice("Audio preview blocked by device autoplay; tap Play again."));
    }
    return()=>{for(const el of elements)el?.pause();};
  },[playing,exporting,voiceUrl,musicUrl,voiceFile]);

  useEffect(()=>{
    void preloadMotionLogo("promptence").then(()=>{
      const official=getLoadedMotionLogo("promptence");
      if(official){logoRef.current=official;setLogo(official);}
    });
  },[]);
  const paint=useCallback((at:number)=>{
    const target=canvas.current,src=sourceRef.current;
    if(!target||!src)return;
    const ctx=target.getContext("2d",{alpha:false});
    if(ctx){
      if(showRaw){
        ctx.fillStyle="#07110D";ctx.fillRect(0,0,target.width,target.height);
        const sw=src instanceof HTMLVideoElement?src.videoWidth:src.naturalWidth;
        const sh=src instanceof HTMLVideoElement?src.videoHeight:src.naturalHeight;
        const scale=Math.min(target.width/sw,target.height/sh);
        const w=sw*scale,h=sh*scale;
        if(w>0&&h>0)ctx.drawImage(src,(target.width-w)/2,(target.height-h)/2,w,h);
      } else drawProofFrame(ctx,src,logoRef.current,at,target.width,target.height,editRef.current);
    }
  },[showRaw]);
  function changeEDL(changes:Partial<ProofEditDecision>){
    const video=sourceRef.current;
    const next=sanitizeProofEDL({...editRef.current,...changes},video instanceof HTMLVideoElement?video.duration:8);
    editRef.current=next;setEdit(next);
    if(video instanceof HTMLVideoElement)void seekSourceFrame(video,latestSeconds.current,showRaw,next).then(()=>paint(latestSeconds.current)).catch(err=>setNotice(String(err)));
    else paint(latestSeconds.current);
    return next;
  }
  useEffect(()=>{
    sourceRef.current=source;
    paint(latestSeconds.current);
  },[source,logo,paint]);
  useEffect(()=>{
    // Workstation-only deterministic bridge used by scripts/motion/render-proof.mjs.
    // It consumes exactly the image the operator explicitly uploaded here.
    const host=window as ProofBridge;
    host.__motionProofReady=Boolean(source);
    host.__motionProofSource=source instanceof HTMLVideoElement?"video":"image";
    host.__motionProofConfigure=(changes)=>changeEDL(changes);
    host.__motionProofFrame=async time=>{
      const src=sourceRef.current;
      if(!src)throw new Error("SOURCE GATE: approved screenshot missing");
      const frame=makeCanvas(1080,1920);
      const ctx=frame.getContext("2d",{alpha:false});
      if(!ctx)throw new Error("Canvas unavailable");
      await seekSourceFrame(src,time,false,editRef.current);
      drawProofFrame(ctx,src,logoRef.current,time,1080,1920,editRef.current);
      return frame.toDataURL("image/png").split(",")[1];
    };
    return()=>{delete host.__motionProofFrame;delete host.__motionProofReady;delete host.__motionProofSource;delete host.__motionProofConfigure;};
  },[source]);
  useEffect(()=>{
    if(!playing||!source)return;
    let active=true;
    if(source instanceof HTMLVideoElement){
      source.currentTime=proofSourceTime(latestSeconds.current,source.duration,editRef.current);
      void source.play().catch(()=>setNotice("Unable to play local clip; try pressing Play again."));
    }
    playingFrom.current=performance.now();
    playBase.current=latestSeconds.current;
    const tick=()=>{
      if(!active)return;
      const p=playBase.current+(performance.now()-playingFrom.current)/1000;
      if(p>=PROOF_SECONDS){
        latestSeconds.current=PROOF_SECONDS;setSeconds(PROOF_SECONDS);
        paint(PROOF_SECONDS);setPlaying(false);return;
      }
      if(source instanceof HTMLVideoElement&&p<7.55){
        const desired=proofSourceTime(p,source.duration,editRef.current);
        if(Math.abs(source.currentTime-desired)>.35)source.currentTime=desired;
      }
      latestSeconds.current=p;setSeconds(p);paint(p);
      previewFrame.current=requestAnimationFrame(tick);
    };
    previewFrame.current=requestAnimationFrame(tick);
    return()=>{active=false;cancelAnimationFrame(previewFrame.current);if(source instanceof HTMLVideoElement)source.pause();};
  },[playing,source,paint]);

  async function attach(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    const isImage=IMAGE_TYPES.has(file.type);
    const isVideo=VIDEO_TYPES.has(file.type);
    if(!isImage&&!isVideo){setNotice("Use PNG/JPEG/WebP or a browser-compatible MP4/WebM.");return;}
    if(file.size<100||file.size>(isVideo?180_000_000:12_000_000)){
      setNotice(isVideo?"Video must be under 180 MB.":"Image must be under 12 MB.");return;
    }
    setPlaying(false);
    const url=URL.createObjectURL(file);
    let keepUrl=false;
    try{
      let decoded:ProofMedia;
      if(isVideo){
        const video=document.createElement("video");
        video.preload="auto";video.muted=true;video.playsInline=true;
        const available=new Promise<void>((resolve,reject)=>{
          video.addEventListener("loadeddata",()=>resolve(),{once:true});
          video.addEventListener("error",()=>reject(new Error("Video codec not supported by browser")),{once:true});
        });
        video.src=url;
        await Promise.race([available,new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("Video did not load")),20000))]);
        if(!Number.isFinite(video.duration)||video.duration<8||video.duration>300)throw Error("Real footage must be 8–300 seconds.");
        if(video.videoWidth<720||video.videoHeight<480)throw Error("Source video must have at least 720×480 resolution.");
        decoded=video;keepUrl=true;
      }else{
        const image=new Image();image.src=url;await image.decode();
        if(image.naturalWidth<800||image.naturalHeight<500||image.naturalWidth>8000||image.naturalHeight>8000)
          throw Error("Screenshot must be 800×500 to 8000×8000 px");
        decoded=image;
      }
      if(sourceRef.current instanceof HTMLVideoElement)sourceRef.current.pause();
      const old=localVideoUrl.current;localVideoUrl.current=keepUrl?url:null;
      if(old)URL.revokeObjectURL(old);
      sourceRef.current=decoded;setSource(decoded);setSourceName(file.name);
      const length=decoded instanceof HTMLVideoElement?decoded.duration:8;
      setSourceDuration(length);
      const options=sanitizeProofEDL({...PROOF_DEFAULT_EDL,secondIn:Math.max(0,Math.min(length-2,Math.floor(length*.5)))},length);
      editRef.current=options;setEdit(options);
      latestSeconds.current=0;setSeconds(0);
      setNotice(isVideo?"REAL VIDEO loaded locally. Timeline uses actual decoded frames; no synthetic UI or customer results.":"Real screenshot loaded. Verify provenance and remove sensitive information.");
    }catch(err){setNotice("Source rejected: "+(err instanceof Error?err.message:String(err)));}
    finally{if(!keepUrl)URL.revokeObjectURL(url);}
  }
  function seek(t:number){
    setPlaying(false);latestSeconds.current=t;setSeconds(t);
    const src=sourceRef.current;
    if(src)void seekSourceFrame(src,t,showRaw,editRef.current).then(()=>paint(t)).catch(err=>setNotice(String(err)));
  }
  async function exportContactSheet(){
    const source=sourceRef.current;
    if(!source||exportingRef.current)return;
    setPlaying(false);setExporting(true);exportingRef.current=true;
    try{
      // 3x3 preview demonstrates movement over time, not mere MP4 metadata.
      const shots=[.38,1.3,2.13,2.71,3.62,4.94,6.24,7.82,9.25];
      const tile=makeCanvas(270,480);
      const ctx=tile.getContext("2d",{alpha:false});
      if(!ctx)throw Error("Cannot compose review contact sheet");
      const sheet=makeCanvas(3*270,3*520);
      const board=sheet.getContext("2d",{alpha:false});
      if(!board)throw Error("Cannot create review grid");
      board.fillStyle="#09130F";board.fillRect(0,0,sheet.width,sheet.height);
      for(const [i,time] of shots.entries()){
        await seekSourceFrame(source,time,false,editRef.current);
        drawProofFrame(ctx,source,logoRef.current,time,270,480,editRef.current);
        const x=(i%3)*270,y=Math.floor(i/3)*520;
        board.drawImage(tile,x,y);
        board.fillStyle="#0C2018";board.fillRect(x,y+480,270,40);
        board.fillStyle="#C8EADA";board.font="700 17px Arial,sans-serif";
        board.fillText("FRAME  "+String(i+1).padStart(2,"0")+" / "+time.toFixed(2)+"s",x+16,y+507);
      }
      const blob=await new Promise<Blob>((ok,bad)=>sheet.toBlob(v=>v?ok(v):bad(Error("Sheet export failed")),"image/png"));
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="promptence-10s-director-review-9-frames.png";
      document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),30000);
      setNotice("Nine-frame review sheet created. Compare early, mid and closing frames critically. This is not an automated aesthetic certification.");
    }catch(err){setNotice("Review sheet failed: "+(err instanceof Error?err.message:String(err)));}
    finally{exportingRef.current=false;setExporting(false);}
  }
  async function attachAudio(event:React.ChangeEvent<HTMLInputElement>,kind:"voice"|"music"){
    const file=event.target.files?.[0];
    if(!file)return;
    try{
      const info=await inspectProofAudio(file,kind);
      if(kind==="voice"){setVoiceFile(file);setVoiceInfo(file.name+" · "+info.seconds.toFixed(1)+"s");}
      else{setMusicFile(file);setMusicInfo(file.name+" · "+info.seconds.toFixed(1)+"s");}
      setNotice(kind==="voice"?"Recording loaded locally for review. Human voice quality approval remains required.":"Licensed soundtrack loaded. Confirm rights before distribution.");
    }catch(e){setNotice("Audio rejected: "+(e instanceof Error?e.message:String(e)));}
  }
  async function exportPreview(){
    if(!sourceRef.current||exportingRef.current)return;
    const temp=makeCanvas(540,960);
    const ctx=temp.getContext("2d",{alpha:false});
    if(!ctx){setNotice("Review canvas unavailable");return;}
    const type=[(voiceFile||musicFile)?"video/webm;codecs=vp9,opus":"video/webm;codecs=vp9",(voiceFile||musicFile)?"video/webm;codecs=vp8,opus":"video/webm;codecs=vp8","video/webm"].find(m=>MediaRecorder.isTypeSupported(m));
    if(!type){setNotice("This browser cannot export a WebM review. Use Chromium + the offline MP4 master.");return;}
    setPlaying(false);exportingRef.current=true;setExporting(true);
    let mixedAudio:Awaited<ReturnType<typeof createProofAudioSession>>=null;
    try{
      mixedAudio=await createProofAudioSession(voiceFile,musicFile);
      const videoStream=temp.captureStream(30);
      const stream=mixedAudio
        ? new MediaStream([...videoStream.getVideoTracks(),mixedAudio.track])
        : videoStream;
      const chunks:BlobPart[]=[];
      const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6_000_000});
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const finished=new Promise<void>((resolve,reject)=>{
        recorder.onstop=()=>resolve();recorder.onerror=()=>reject(Error("Recorder failed"));
      });
      let start=0,raf=0;
      let stopped=false;
      const frame=(now:number)=>{
        if(stopped)return;
        if(!start)start=now;
        const t=Math.min(PROOF_SECONDS,(now-start)/1000);
        const clip=sourceRef.current;
        if(clip instanceof HTMLVideoElement&&t<7.55){
          const wanted=proofSourceTime(t,clip.duration,editRef.current);
          if(Math.abs(clip.currentTime-wanted)>.3)clip.currentTime=wanted;
        }
        drawProofFrame(ctx,sourceRef.current!,logoRef.current,t,temp.width,temp.height,editRef.current);
        if(t>=PROOF_SECONDS){stopped=true;recorder.stop();}
        else raf=requestAnimationFrame(frame);
      };
      if(sourceRef.current instanceof HTMLVideoElement){
        sourceRef.current.currentTime=proofSourceTime(0,sourceRef.current.duration,editRef.current);
        await sourceRef.current.play();
      }
      recorder.start(250);
      // Start audio only after the source video is ready and the recorder
      // actually starts. Creating it earlier caused unwanted leading silence.
      mixedAudio?.start();
      raf=requestAnimationFrame(frame);
      await finished.finally(()=>cancelAnimationFrame(raf));
      if(sourceRef.current instanceof HTMLVideoElement)sourceRef.current.pause();
      const blob=new Blob(chunks,{type});
      if(blob.size<10000)throw Error("Review export was empty");
      const href=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=href;
      a.download="promptence-proof-10s-review"+(mixedAudio?"-recorded-audio":"-silent")+".webm";document.body.appendChild(a);a.click();a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(href),60_000);
      setNotice(mixedAudio?"Review WebM exported with user-supplied voice/music. Listen for natural pacing and mix before publishing.":"Silent review WebM exported. No robotic or generated voice was added.");
    }catch(e){setNotice("Export failed: "+(e instanceof Error?e.message:String(e)));}
    finally{
      if(sourceRef.current instanceof HTMLVideoElement)sourceRef.current.pause();
      if(mixedAudio)await mixedAudio.stop().catch(()=>{});
      exportingRef.current=false;setExporting(false);
    }
  }

  return <main className={styles.shell}>
    <audio ref={voiceElement} src={voiceUrl} preload="auto" aria-hidden="true"/>
    <audio ref={musicElement} src={musicUrl} preload="auto" aria-hidden="true"/>
    <header className={styles.header}>
      <div><a className={styles.back} href="/motion?mode=cinematic">← MOTION OS</a>
        <p className={styles.kicker}>MARGARYAN LABS / SOURCE-FIRST FILM PRODUCTION</p>
        <h1>Proof <em>Director.</em></h1>
        <p className={styles.intro}>One ten-second scene that has to earn the right to become a three-minute film. Real Promptence pixels, deliberate camera direction and zero fabricated UI.</p>
      </div>
      <div className={styles.mast}><b>00:10</b><span>PROOF OF DIRECTION</span><span>PORTRAIT · 9:16</span></div>
    </header>
    <div className={styles.grid}>
      <section className={styles.player} aria-label="Video preview">
        <div className={styles.film}>
          <canvas ref={canvas} width={540} height={960} aria-label="10-second cinematic proof preview"/>
          {!source&&<div className={styles.empty}>
            <strong>NO FABRICATED SCREENS.</strong>
            <span>Add authentic product footage or a screenshot to preview the film.</span>
          </div>}
        </div>
        <div className={styles.compare} role="group" aria-label="Compare genuine source footage with directed composition">
          <button type="button" aria-pressed={!showRaw} onClick={()=>setShowRaw(false)} disabled={!source||exporting}>DIRECTED CUT</button>
          <button type="button" aria-pressed={showRaw} onClick={()=>setShowRaw(true)} disabled={!source||exporting}>RAW SOURCE / BEFORE</button>
        </div>
        <div className={styles.transport}>
          <button type="button" disabled={!source||exporting}
            onClick={()=>{if(seconds>=10){latestSeconds.current=0;setSeconds(0);}setPlaying(v=>!v);}}>
            {playing?"❚❚ Pause":"▶ Play"}
          </button>
          <input aria-label="Film playhead" type="range" min="0" max="10" step=".02"
            disabled={!source||exporting} value={seconds}
            onChange={e=>seek(Number(e.target.value))}/>
          <span>{seconds.toFixed(2)} / 10.00s</span>
        </div>
      </section>
      <aside className={styles.controls}>
        <div className={styles.section}>
          <span className={styles.overline}>01 / SOURCE GATE</span>
          <h2>Use real product footage.</h2>
          <p>Import an approved video recording (MP4/WebM, 8 seconds or longer) or screenshot of the real Promptence interface. A real screen recording is the recommended source. Nothing is uploaded or persisted.</p>
          <label className={styles.upload}>
            <span>+ IMPORT REAL VIDEO / SCREENSHOT</span>
            <input data-testid="proof-source-input" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={attach}/>
          </label>
          {sourceName&&<small className={styles.source}>LOCAL SOURCE / {sourceName}</small>}
        </div>
        <div className={styles.section}>
          <span className={styles.overline}>02 / AUTHORED CAMERA</span>
          <h2>Three intentional beats.</h2>
          <div className={styles.beats}>
            <button onClick={()=>seek(.35)} disabled={!source}>00:00 – 00:02 <b>Problem / dark editorial</b></button>
            <button onClick={()=>seek(3.3)} disabled={!source}>00:02 – 00:07 <b>Real image / travelling camera</b></button>
            <button onClick={()=>seek(8.2)} disabled={!source}>00:07 – 00:10 <b>Official mark / clear invitation</b></button>
          </div>
          <p>Every preview frame is drawn for its exact time. No pre-rendered PNG slideshow, random green HUD elements, fictitious rankings or client results.</p>
        </div>
        <div className={styles.section}>
          <span className={styles.overline}>03 / RECORDING & MUSIC</span>
          <h2>No more robotic voices.</h2>
          <p>Add a real voice recording or a licensed, owner-approved AI voice file (natural timing; max 9.8s). You can also add a licensed music file. Both remain in this browser tab, synchronized with the shot preview and mixed into the WebM review export.</p>
          <label className={styles.upload}><span>VOICEOVER / WAV · MP3 · M4A</span>
            <input type="file" data-testid="proof-voice-input" accept="audio/*" disabled={exporting} onChange={e=>void attachAudio(e,"voice")}/>
          </label>
          {voiceFile&&<div className={styles.source}>VOICE / {voiceInfo} <button className={styles.clear} type="button" onClick={()=>{setVoiceFile(null);setVoiceInfo("");}}>Remove</button></div>}
          <label className={styles.upload}><span>LICENSED MUSIC / OPTIONAL</span>
            <input type="file" data-testid="proof-music-input" accept="audio/*" disabled={exporting} onChange={e=>void attachAudio(e,"music")}/>
          </label>
          {musicFile&&<div className={styles.source}>SCORE / {musicInfo} <button className={styles.clear} type="button" onClick={()=>{setMusicFile(null);setMusicInfo("");}}>Remove</button></div>}
          <p className={styles.hint}>Sound source remains entirely local. No voice cloning, robot TTS or automatic speech acceleration. Listen on headphones before approving.</p>
        </div>
        <div className={styles.section}>
          <span className={styles.overline}>04 / FILM GATE</span>
          <h2>Export a review — not an ad.</h2>
          <p>The 540×960 WebM review now includes your voice/music when supplied. If you imported footage, its actual decoded frames are used. A native 1080×1920 H.264/AAC master still requires the workstation exporter.</p>
          <button className={styles.sheetButton} disabled={!source||exporting} onClick={()=>void exportContactSheet()}>REVIEW 9 KEY FRAMES ↗</button>
          <button className={styles.export} disabled={!source||exporting} onClick={exportPreview}>
            {exporting?"ENCODING…":"EXPORT 10s SILENT REVIEW ↗"}
          </button>
          <div className={styles.notice} role="status">{notice}</div>
        </div>
      </aside>
    </div>
    <footer className={styles.footer}>NOT FOR PUBLICATION UNTIL SOURCE · TYPOGRAPHY · AUDIO · FRAME REVIEW HAVE BEEN APPROVED.</footer>
  </main>;
}
