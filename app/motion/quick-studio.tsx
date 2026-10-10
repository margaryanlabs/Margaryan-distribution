"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND_INFO, FORMAT_SIZE, type MotionBrand, type MotionFormat } from "@/lib/motion/studio";
import { PORTFOLIO, PORTFOLIO_BRANDS } from "@/lib/motion/portfolio";
import { preloadMotionLogo } from "@/lib/motion/brand-assets";
import {
  createQuickProject, sanitizeQuickProject, quickDuration, quickShotAt,
  type QuickLanguage, type QuickProject
} from "@/lib/motion/quick-project";
import { drawQuickFrame, quickSourceStatus, type QuickMediaAsset } from "@/lib/motion/quick-render";
import styles from "./quick-studio.module.css";

const KEY="margaryan-motion-quick-project-v1";
const SOURCE_TYPES=new Set(["image/png","image/jpeg","image/webp","video/mp4","video/webm","video/quicktime"]);
function saveBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function mediaFromFile(file:File):Promise<QuickMediaAsset>{
  if(!SOURCE_TYPES.has(file.type))throw new Error("Use PNG/JPEG/WebP or browser-supported MP4/WebM/MOV.");
  if(file.size<100||file.size>150_000_000)throw new Error("Media must be between 100 bytes and 150 MB.");
  const type=file.type.startsWith("image/")?"image" as const:"video" as const;
  const url=URL.createObjectURL(file);
  try{
    if(type==="image"){
      const image=new Image();image.src=url;await image.decode();
      if(image.naturalWidth<240||image.naturalHeight<240)throw new Error("Image resolution must be at least 240px on each side.");
      return {url,file,type,element:image};
    }
    const video=document.createElement("video");
    video.muted=true;video.playsInline=true;video.loop=true;video.preload="auto";video.src=url;
    await new Promise<void>((resolve,reject)=>{
      let finished=false;
      const timeout=window.setTimeout(()=>finish(new Error("Video decode timed out; try H.264 MP4.")),15000);
      function finish(error?:Error){
        if(finished)return;finished=true;clearTimeout(timeout);
        video.removeEventListener("loadeddata",onData);
        video.removeEventListener("error",onError);
        if(error)reject(error);else resolve();
      }
      function onData(){finish();}
      function onError(){finish(new Error("Your browser cannot decode this clip. Convert it to H.264 MP4."));}
      video.addEventListener("loadeddata",onData);
      video.addEventListener("error",onError);
      video.load();
    });
    if(!Number.isFinite(video.duration)||video.duration<=0)throw new Error("Video duration invalid.");
    return {url,file,type,element:video};
  }catch(error){URL.revokeObjectURL(url);throw error;}
}
function cleanMedia(media:QuickMediaAsset){
  if(media.type==="video"){
    const v=media.element as HTMLVideoElement;v.pause();v.removeAttribute("src");v.load();
  }
  URL.revokeObjectURL(media.url);
}
function formatTime(t:number){const m=Math.floor(t/60);const sec=Math.floor(t%60);return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");}
const MAX_AUDIO=30_000_000;
export default function QuickStudio() {
  const [project,setProject]=useState<QuickProject>(()=>createQuickProject());
  const [loaded,setLoaded]=useState(false);
  const [selected,setSelected]=useState(0);
  const [assetsRevision,setAssetsRevision]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [position,setPosition]=useState(0);
  const [exporting,setExporting]=useState(false);
  const [progress,setProgress]=useState(0);
  const [audio,setAudio]=useState<File|null>(null);
  const [notice,setNotice]=useState("QUICK: upload actual clips/screens for every shot. No fake footage or remote uploads.");
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const assets=useRef<Map<string,QuickMediaAsset>>(new Map());
  const currentFrame=useRef(0);
  const activeVideo=useRef<number|null>(null);
  const projectRef=useRef(project);
  const running=useRef(false);
  const [fontLoaded,setFontLoaded]=useState(false);

  const duration=quickDuration(project);
  const shown=project.shots[Math.min(selected,project.shots.length-1)];
  const dims=FORMAT_SIZE[project.format];
  const previewWidth=project.format==="landscape"?800:project.format==="square"?640:540;
  const previewHeight=Math.round(previewWidth*dims.height/dims.width);
  const assetCount=project.shots.filter(shot=>assets.current.has(shot.id)).length;
  const status=quickSourceStatus(project,assets.current);

  useEffect(()=>{
    try{
      const stored=window.localStorage.getItem(KEY);
      if(stored)setProject(sanitizeQuickProject(JSON.parse(stored)));
    }catch{ /* Reject stale or malformed local storyboards. */ }
    setLoaded(true);
  },[]);
  useEffect(()=>{
    projectRef.current=project;
    if(loaded)try{window.localStorage.setItem(KEY,JSON.stringify(project));}
    catch{setNotice("Browser storage could not save the storyboard; export project JSON.");}
    void preloadMotionLogo(project.brand).then(()=>setAssetsRevision(n=>n+1));
  },[project,loaded]);
  useEffect(()=>{
    document.fonts.load('800 30px "Noto Sans Armenian"',"ՀԱՅԵՐԵՆ")
      .then(found=>setFontLoaded(found.length>0)).catch(()=>setFontLoaded(false));
  },[]);
  useEffect(()=>{
    const files=assets.current;
    return()=>{files.forEach(cleanMedia);files.clear();};
  },[]);
  const redraw=()=>{
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext("2d",{alpha:false});
    if(canvas&&ctx)drawQuickFrame(ctx,projectRef.current,currentFrame.current,canvas.width,canvas.height,assets.current);
  };
  useEffect(()=>{redraw();},[project,position,assetsRevision,fontLoaded]);

  function pauseVideos(){
    assets.current.forEach(asset=>{if(asset.type==="video")(asset.element as HTMLVideoElement).pause();});
    activeVideo.current=null;
  }
  function resetMedia(){
    pauseVideos();assets.current.forEach(cleanMedia);assets.current.clear();setAssetsRevision(n=>n+1);
  }
  function jumpTo(t:number){
    const current=projectRef.current;
    const time=Math.max(0,Math.min(quickDuration(current)-.01,t));
    currentFrame.current=time;setPosition(time);
    pauseVideos();
    const {shot,elapsed}=quickShotAt(current,time);
    const asset=assets.current.get(shot.id);
    if(asset?.type==="video"){
      const v=asset.element as HTMLVideoElement;
      if(v.duration>0)v.currentTime=Math.min(v.duration-.03,elapsed%v.duration);
    }
  }
  function update(next:QuickProject){
    try{
      const value=sanitizeQuickProject(next);
      setProject(value);projectRef.current=value;
      const total=quickDuration(value);
      if(currentFrame.current>=total)jumpTo(0);
    }catch(error){setNotice(error instanceof Error?error.message:"Project validation failed");}
  }
  function changeBrand(brand:MotionBrand){
    if(exporting)return;
    resetMedia();setSelected(0);jumpTo(0);
    setProject(createQuickProject(brand,project.language,project.format));
    setNotice("Brand loaded. Media from prior projects was cleared to avoid inaccurate product footage.");
  }
  function changeLanguage(language:QuickLanguage){
    if(exporting)return;
    resetMedia();setSelected(0);jumpTo(0);
    setProject(createQuickProject(project.brand,language,project.format));
    setNotice("Loaded a fresh "+language.toUpperCase()+" editorial draft. Please proofread claims and reattach approved footage.");
  }
  function changeFormat(format:MotionFormat){update({...project,format});}
  function updateShot(field:"title"|"subtitle"|"seconds"|"visual",value:string|number){
    update({...project,shots:project.shots.map((shot,i)=>i===selected?{...shot,[field]:value}:shot)});
  }
  async function attach(file:File|undefined){
    if(!file||exporting)return;
    try{
      const shot=shown;
      const value=await mediaFromFile(file);
      const previous=assets.current.get(shot.id);
      if(previous)cleanMedia(previous);
      assets.current.set(shot.id,value);
      setAssetsRevision(n=>n+1);
      setNotice("Source loaded for shot "+(selected+1)+": "+file.name+". Review license, authenticity and private data.");
    }catch(error){setNotice(error instanceof Error?error.message:"Media file could not be opened.");}
  }
  function copyPrior(){
    if(selected<1)return;
    const prior=assets.current.get(project.shots[selected-1].id);
    if(!prior)return;
    void attach(prior.file);
  }
  function selectShot(i:number){
    setPlaying(false);running.current=false;
    setSelected(i);
    jumpTo(project.shots.slice(0,i).reduce((sum,x)=>sum+x.seconds,0));
  }
  function preview(){
    if(exporting)return;
    if(playing){running.current=false;setPlaying(false);pauseVideos();return;}
    if(currentFrame.current>=duration-.1)jumpTo(0);
    setPlaying(true);running.current=true;
    let last=performance.now();
    let lastVideo=-1;
    const cycle=(now:number)=>{
      if(!running.current)return;
      const p=projectRef.current;
      const at=quickShotAt(p,currentFrame.current);
      if(at.index!==lastVideo){
        pauseVideos();
        const src=assets.current.get(at.shot.id);
        if(src?.type==="video"){
          const v=src.element as HTMLVideoElement;
          v.currentTime=Math.min(Math.max(0,v.duration-.04),at.elapsed%v.duration);
          void v.play().catch(()=>setNotice("Video preview could not play this media on this device."));
        }
        lastVideo=at.index;
      }
      currentFrame.current=Math.min(quickDuration(p),currentFrame.current+Math.min(.1,(now-last)/1000));
      last=now;
      redraw();
      if(currentFrame.current>=quickDuration(p)-.001){
        running.current=false;setPlaying(false);pauseVideos();setPosition(quickDuration(p));return;
      }
      if(Math.floor(now/140)!==Math.floor((now-16)/140))setPosition(currentFrame.current);
      requestAnimationFrame(cycle);
    };
    requestAnimationFrame(cycle);
  }
  async function exportFilm(){
    if(exporting)return;
    setPlaying(false);running.current=false;pauseVideos();
    const p=sanitizeQuickProject(project);
    const {ready,missing}=quickSourceStatus(p,assets.current);
    if(!ready){
      setNotice("SOURCE GATE: upload authentic media for all "+missing.length+" missing shot(s) before export.");
      return;
    }
    const supported=typeof HTMLCanvasElement!=="undefined"&&"captureStream" in HTMLCanvasElement.prototype;
    if(!supported||typeof MediaRecorder==="undefined"){
      setNotice("Browser capture unsupported. Use latest desktop Chrome/Edge.");
      return;
    }
    const candidates=audio?
      ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"]:
      ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"];
    const mime=candidates.find(type=>MediaRecorder.isTypeSupported(type));
    if(!mime){setNotice("This browser cannot record a local film in a supported format.");return;}
    setExporting(true);setProgress(0);
    let ctxAudio:AudioContext|null=null;
    let stream:MediaStream|null=null;
    let rec:MediaRecorder|null=null;
    let raf=0;
    let soundtrack:AudioBufferSourceNode|null=null;
    try{
      await preloadMotionLogo(p.brand);
      await document.fonts.ready;
      if(p.language==="hy"&&!fontLoaded){
        throw new Error("Armenian font did not load. Check connection and reload before export to avoid broken letters.");
      }
      const canvas=document.createElement("canvas");
      canvas.width=FORMAT_SIZE[p.format].width;canvas.height=FORMAT_SIZE[p.format].height;
      const ctx=canvas.getContext("2d",{alpha:false});
      if(!ctx)throw new Error("Canvas context unavailable.");
      drawQuickFrame(ctx,p,0,canvas.width,canvas.height,assets.current);
      stream=canvas.captureStream(30);
      if(audio){
        if(audio.size>MAX_AUDIO||!audio.type.startsWith("audio/"))throw new Error("Music must be audio/* and under 30 MB.");
        ctxAudio=new AudioContext();
        await ctxAudio.resume();
        const decoded=await ctxAudio.decodeAudioData(await audio.arrayBuffer());
        if(decoded.duration+1<quickDuration(p)){
          throw new Error("Soundtrack is shorter than the film. Upload a longer audio file.");
        }
        const mixer=ctxAudio.createMediaStreamDestination();
        soundtrack=ctxAudio.createBufferSource();soundtrack.buffer=decoded;
        const gain=ctxAudio.createGain();gain.gain.value=.78;
        soundtrack.connect(gain).connect(mixer);
        const track=mixer.stream.getAudioTracks()[0];
        if(!track)throw new Error("Audio mixing failed.");
        stream.addTrack(track);
      }
      const chunks:BlobPart[]=[];
      rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:9_000_000});
      const recorder=rec;
      const total=quickDuration(p);
      const started=new Promise<void>((resolve,reject)=>{
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onerror=()=>reject(new Error("Browser video encoder failed."));
        recorder.onstop=()=>resolve();
      });
      rec.start(800);
      soundtrack?.start();
      const zero=performance.now();
      let lastIndex=-1,hadError=false;
      const animation=(now:number)=>{
        if(!recorder||recorder.state!=="recording")return;
        const t=Math.min(total,(now-zero)/1000);
        const shot=quickShotAt(p,t);
        if(shot.index!==lastIndex){
          pauseVideos();
          const asset=assets.current.get(shot.shot.id);
          if(asset?.type==="video"){
            const video=asset.element as HTMLVideoElement;
            video.currentTime=Math.max(0,video.duration>.05?Math.min(video.duration-.05,shot.elapsed):0);
            void video.play().catch(()=>{
              hadError=true;
              setNotice("VIDEO DECODE FAILED: rerender after converting source to H.264 MP4.");
              if(recorder.state==="recording")recorder.stop();
            });
          }
          lastIndex=shot.index;
        }
        drawQuickFrame(ctx,p,t,canvas.width,canvas.height,assets.current);
        setProgress(Math.round(t/total*100));
        if(t>=total){recorder.stop();return;}
        raf=requestAnimationFrame(animation);
      };
      raf=requestAnimationFrame(animation);
      await started;
      if(hadError)throw new Error("Unable to decode video footage during export. No partial film was downloaded.");
      if(!chunks.length)throw new Error("Browser encoded an empty film.");
      const ext=mime.includes("mp4")?"mp4":"webm";
      saveBlob(new Blob(chunks,{type:mime}),"margaryan-quick-"+p.brand+"-"+p.language+"."+ext);
      const manifest={
        schema:"margaryan-motion-production-receipt/v1",
        generatedAt:new Date().toISOString(),
        mode:"quick",renderer:"in-browser-canvas-mediarecorder",brand:p.brand,
        language:p.language,format:p.format,seconds:quickDuration(p),
        encodedContainer:ext,audioRequested:Boolean(audio),
        shots:p.shots.map(shot=>{
          const file=assets.current.get(shot.id)?.file;
          return {id:shot.id,title:shot.title,seconds:shot.seconds,mediaFilename:file?.name||null,reviewRequired:true};
        }),
        validation:"Export completed locally; codec, legal clearance and artistic review still required.",
        provenance:"User-selected local files; no automated license verification or server upload."
      };
      saveBlob(new Blob([JSON.stringify(manifest,null,2)],{type:"application/json"}),"margaryan-quick-"+p.brand+"-receipt.json");
      setNotice("Export complete: "+ext.toUpperCase()+" recorded locally. Review playback and license/rights before publishing.");
    }catch(error){
      setNotice(error instanceof Error?error.message:"Quick export failed");
    }finally{
      cancelAnimationFrame(raf);
      if(rec&&rec.state==="recording")rec.stop();
      soundtrack?.stop();
      if(ctxAudio)await ctxAudio.close().catch(()=>{});
      stream?.getTracks().forEach(track=>track.stop());
      pauseVideos();
      setExporting(false);
    }
  }
  async function copyExternalBrief(){
    const p=project;
    const brief=[
      "MARGARYAN MOTION OS / QUICK / OPTIONAL EXTERNAL SOURCE GENERATION",
      "Brand: "+BRAND_INFO[p.brand].name,
      "Format: "+(p.format==="portrait"?"9:16":p.format==="square"?"1:1":"16:9"),
      "Language: "+p.language.toUpperCase(),
      "Create original CINEMATIC B-ROLL ONLY (no burned-in text).",
      "Use physically coherent realistic lighting, premium art direction, restrained smooth camera, no random artificial effects.",
      "Do not invent logos, app screens, customer testimonials, brand rankings, profits, prices or fake marketplace listings.",
      "Actual brand UI screenshots are supplied separately in Motion OS.",
      "Scene beats:",
      ...p.shots.map((shot,i)=>String(i+1)+". "+shot.title+" — "+shot.subtitle+" ("+shot.seconds+" seconds)"),
      "Deliver separate clean source clips, without on-screen labels or copyrighted third-party ads. Import each finished MP4 into Quick Studio.",
      "Confirm all usage rights before distribution."
    ].join("\n");
    try{await navigator.clipboard.writeText(brief);
      setNotice("External shot brief copied. You may create authorized footage in Higgsfield, then import exported MP4s here. No API link or credits were used.");
    }catch{setNotice("Clipboard blocked by browser. Use a secure desktop session or manually copy the project script.");}
  }
  function saveProject(){
    saveBlob(new Blob([JSON.stringify(project,null,2)],{type:"application/json"}),
      "motion-quick-"+project.brand+"-"+project.language+".json");
    setNotice("Saved editable Quick storyboard. Reattach original media when reopening; media bytes are not embedded in JSON.");
  }
  async function importProject(file?:File){
    if(!file)return;
    try{
      if(file.size>120_000)throw new Error("Project JSON is too large");
      const next=sanitizeQuickProject(JSON.parse(await file.text()));
      resetMedia();setProject(next);projectRef.current=next;setSelected(0);jumpTo(0);
      setNotice("Quick draft loaded. Reattach source files before producing a video.");
    }catch(error){setNotice(error instanceof Error?error.message:"Invalid project JSON");}
  }
  return <div className={styles.quick} style={{"--quick-accent":project.brand==="meqena"?"#E32C48":BRAND_INFO[project.brand].accent} as React.CSSProperties}>
    <section className={styles.intro}>
      <span>MODE 02 / FAST REAL-FOOTAGE PRODUCTION</span>
      <h2>Quick Studio<span>.</span></h2>
      <p>Make a real advertisement from approved photos, product screens, videos (including exported AI footage) and your soundtrack. Everything renders in this browser. No Higgsfield login or API is linked; it does not create AI footage by itself.</p>
    </section>
    <div className={styles.notice} role="status">{notice}</div>
    <div className={styles.columns}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><b>01 / SOURCE & STORY</b><span>LOCAL-FIRST</span></div>
        <label className={styles.input}><span>PORTFOLIO BRAND</span><select value={project.brand} disabled={exporting} onChange={e=>changeBrand(e.target.value as MotionBrand)}>
          {PORTFOLIO_BRANDS.map(id=><option key={id} value={id}>{BRAND_INFO[id].name}</option>)}
        </select></label>
        <p className={styles.source}>{PORTFOLIO[project.brand].logoStatus==="source-verified"?"✓ Source-derived logo":"! Official logo pending source verification"} · {PORTFOLIO[project.brand].product}</p>
        <label className={styles.input}><span>TEXT LANGUAGE</span><select value={project.language} disabled={exporting} onChange={e=>changeLanguage(e.target.value as QuickLanguage)}>
          <option value="hy">Հայերեն</option><option value="ru">Русский</option><option value="en">English</option>
        </select></label>
        <label className={styles.input}><span>PROJECT TITLE</span><input value={project.name} maxLength={100} disabled={exporting} onChange={e=>update({...project,name:e.target.value})}/></label>
        <div className={styles.externalTool}>
          <b>OPTIONAL / HIGGSFIELD FOOTAGE</b>
          <span>Use your connected external video service to create source clips, then bring the finished MP4s back here. This Studio does not charge or contact Higgsfield.</span>
          <div>
            <a href="https://higgsfield.ai/" target="_blank" rel="noopener noreferrer">OPEN HIGGSFIELD ↗</a>
            <button type="button" onClick={()=>{void copyExternalBrief();}}>COPY FILM BRIEF</button>
          </div>
        </div>
        <div className={styles.panelHead}><b>02 / FILM FORMAT</b><span>9:16 · 1:1 · 16:9</span></div>
        <div className={styles.format}>
          {(["portrait","square","landscape"] as MotionFormat[]).map(x=><button key={x} type="button"
            data-selected={project.format===x} disabled={exporting} onClick={()=>changeFormat(x)}>
            {x==="portrait"?"9:16":x==="square"?"1:1":"16:9"}</button>)}
        </div>
        <div className={styles.panelHead}><b>03 / EDIT SHOT</b><span>{selected+1} / {project.shots.length}</span></div>
        <div className={styles.shotStack}>{project.shots.map((shot,i)=><button key={shot.id} type="button"
          data-selected={selected===i} disabled={exporting} onClick={()=>selectShot(i)}>
          <span>0{i+1} / {shot.seconds}s {assets.current.has(shot.id)?"● SOURCE":"○ MISSING"}</span>
          <strong>{shot.title}</strong>
        </button>)}</div>
        <label className={styles.input}><span>HEADLINE / ARMENIAN SUPPORTED</span><textarea value={shown.title} rows={2}
          disabled={exporting} maxLength={100} onChange={e=>updateShot("title",e.target.value)}/></label>
        <label className={styles.input}><span>SECONDARY LINE</span><textarea value={shown.subtitle} rows={2}
          disabled={exporting} maxLength={155} onChange={e=>updateShot("subtitle",e.target.value)}/></label>
        <label className={styles.input}><span>SHOT DURATION / {shown.seconds.toFixed(1)}s</span>
          <input type="range" min="2" max="8" step=".5" value={shown.seconds} disabled={exporting}
            onChange={e=>updateShot("seconds",Number(e.target.value))}/></label>
        <label className={styles.input}><span>SOURCE CROP</span><select value={shown.visual} disabled={exporting}
          onChange={e=>updateShot("visual",e.target.value)}>
          <option value="fill">Full cinematic crop</option><option value="contain">Entire source (letterbox)</option>
        </select></label>
        <label className={styles.media}><b>IMPORT REAL FOOTAGE / IMAGE</b>
          <span>MP4, WebM, MOV / PNG, JPEG, WebP · max 150 MB · stored only in this tab.</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp,.mp4,.webm,.mov"
            disabled={exporting} onChange={e=>{void attach(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/>
        </label>
        {assets.current.get(shown.id)&&<div className={styles.assetInfo}>
          <b>✓ {assets.current.get(shown.id)?.file.name}</b>
          <button type="button" disabled={exporting} onClick={()=>{
            const a=assets.current.get(shown.id);if(a)cleanMedia(a);
            assets.current.delete(shown.id);setAssetsRevision(n=>n+1);
          }}>Remove</button>
        </div>}
        {selected>0&&assets.current.has(project.shots[selected-1].id)&&<button type="button"
          className={styles.secondary} disabled={exporting} onClick={copyPrior}>↳ Reuse previous shot footage</button>}
        <label className={styles.media}><b>OPTIONAL LICENSED MUSIC / SOUNDTRACK</b>
          <span>MP3, WAV, M4A · max 30 MB · user-approved recording only.</span>
          <input type="file" accept="audio/*" disabled={exporting} onChange={e=>{
            const file=e.currentTarget.files?.[0]||null;e.currentTarget.value="";
            if(file&&file.size>MAX_AUDIO){setNotice("Soundtrack exceeds 30MB");return;}
            setAudio(file);
          }}/>
          {audio&&<small>Selected: {audio.name} · <button type="button" onClick={()=>setAudio(null)}>remove</button></small>}
        </label>
        <div className={styles.tools}><button type="button" disabled={exporting} onClick={saveProject}>SAVE QUICK PROJECT</button>
          <label>IMPORT PROJECT<input type="file" accept=".json,application/json" disabled={exporting}
            onChange={e=>{void importProject(e.currentTarget.files?.[0]);e.currentTarget.value="";}}/></label>
        </div>
      </section>
      <section className={styles.stage}>
        <div className={styles.stageHead}><strong>LIVE QUICK CANVAS</strong><span>{BRAND_INFO[project.brand].name} · {project.language.toUpperCase()}</span></div>
        <div className={styles.canvasWell}>
          <canvas ref={canvasRef} width={previewWidth} height={previewHeight}
            style={{aspectRatio:String(dims.width)+"/"+String(dims.height)}} aria-label="Local quick ad film preview"/>
        </div>
        <div className={styles.transport}>
          <button type="button" disabled={exporting} onClick={preview}>{playing?"Ⅱ":"▶"}</button>
          <input aria-label="Scrub quick film" type="range" min="0" max={duration} step=".05" value={position}
            disabled={exporting} onChange={e=>{setPlaying(false);running.current=false;jumpTo(Number(e.currentTarget.value));}}/>
          <span>{formatTime(position)} / {formatTime(duration)}</span>
        </div>
        <div className={styles.qa}>
          <b>PRODUCTION SOURCES: {assetCount}/{project.shots.length}</b>
          <span data-ok={status.ready}>{status.ready?"ALL SHOTS SOURCED · HUMAN RIGHTS REVIEW STILL REQUIRED":
            status.missing.length+" shot(s) missing source media · export is blocked"}</span>
          <small>NO SYNTHETIC PRODUCT METRICS · NO AUTO-PUBLISH · NO HIGGSFIELD API CHARGES</small>
        </div>
        <button type="button" className={styles.export} disabled={exporting||!status.ready||playing}
          onClick={()=>void exportFilm()}>
          {exporting?"EXPORTING "+progress+"%":status.ready?"RENDER QUICK FILM / LOCAL EXPORT ↗":"ADD REAL MEDIA TO ALL SHOTS"}
        </button>
        <p className={styles.disclaimer}>Browser video export usually produces WebM; MP4 depends on your device. The video is recorded in real time, and the tab should remain visible. Input files stay local. To create original generated footage externally (Higgsfield or another provider), export it there and import it above. This is a real editor, not a claim of direct cloud integration. Source authenticity, font rendering, music rights and visual quality need your approval.</p>
      </section>
    </div>
  </div>;
}
