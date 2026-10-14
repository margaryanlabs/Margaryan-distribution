"use client";

import {useEffect,useRef,useState} from "react";
import type {V9Film} from "@/lib/motion/cinema/promptence-film-v9";
import styles from "./v9.module.css";

const TOTAL=8;
const clip=(x:number)=>Math.min(TOTAL,Math.max(0,x));

export default function PromptenceCinematicV9(){
 const mount=useRef<HTMLDivElement>(null);
 const shot=useRef<V9Film|null>(null);
 const animation=useRef<number|null>(null);
 const started=useRef(0);
 const realSource=useRef(false);
 const [isExport,setExport]=useState(false);
 const [ready,setReady]=useState(false);
 const [sourceReady,setSourceReady]=useState(false);
 const [seconds,setSeconds]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [error,setError]=useState("");
 const [status,setStatus]=useState("PREPARING REAL 3D");
 useEffect(()=>{
  let closed=false;
  const exportMode=new URLSearchParams(window.location.search).has("export");
  setExport(exportMode);
  window.__motionCinemaReady=false;
  window.__motionCinemaError=undefined;
  realSource.current=false;
  void import("@/lib/motion/cinema/promptence-film-v9").then(async({createV9Film})=>{
    if(closed||!mount.current)return;
    const film=createV9Film(exportMode?1920:1280,exportMode?1080:720);
    shot.current=film;
    film.canvas.className=styles.webgl;
    mount.current.appendChild(film.canvas);
    window.__motionCinemaSeek=async t=>{
      if(!Number.isFinite(t)||t<0||t>TOTAL)throw Error("V9 seek out of bounds");
      film.setTime(t);setSeconds(t);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    };
    window.__motionCinemaHasSource=()=>realSource.current;
    window.__motionCinemaReady=true;setReady(true);
    setStatus("V9 CINEMATIC 3D STUDIO READY");
    if(!exportMode){
      try {
        const res=await fetch("/api/motion/cinema-public-capture",{cache:"no-store"});
        if(!res.ok)throw Error("Could not load public homepage capture");
        const blob=await res.blob();
        if(closed)return;
        await film.setScreen(new File([blob],"promptence-public.png",{type:"image/png"}));
        realSource.current=true;
        setSourceReady(true);
        film.setTime(0);
        setStatus("AUTHENTIC PUBLIC PRODUCT SCREEN LOADED");
      }catch(e){if(!closed)setStatus("CONCEPT ONLY — REAL CAPTURE UNAVAILABLE");}
    }
  }).catch(e=>{
   if(closed)return;
   const detail=e instanceof Error?e.message:String(e);
   window.__motionCinemaError=detail;
   setStatus("WEBGL ERROR");setError(detail);
  });
  return ()=>{
    closed=true;if(animation.current!==null)cancelAnimationFrame(animation.current);
    shot.current?.dispose();shot.current=null;
    window.__motionCinemaReady=false;
    delete window.__motionCinemaSeek;delete window.__motionCinemaHasSource;
  };
 },[]);
 function stop(){
   if(animation.current!==null)cancelAnimationFrame(animation.current);
   animation.current=null;setPlaying(false);
 }
 function play(){
   if(!shot.current||playing)return;
   started.current=performance.now()-seconds*1000;
   setPlaying(true);
   const tick=(now:number)=>{
     const time=clip((now-started.current)/1000);
     shot.current?.setTime(time);setSeconds(time);
     if(time<TOTAL)animation.current=requestAnimationFrame(tick);
     else{animation.current=null;setPlaying(false);}
   };
   animation.current=requestAnimationFrame(tick);
 }
 async function importSource(file:File|undefined){
   if(!file||!shot.current)return;
   try{
    await shot.current.setScreen(file);
    realSource.current=true;
    setSourceReady(true);
    shot.current.setTime(seconds);
    setStatus("APPROVED REAL PRODUCT SCREEN INSTALLED");setError("");
   }catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 return <main className={styles.root} style={isExport?{
   position:"fixed",inset:0,width:1920,height:1080,padding:0,
   zIndex:2147483647,background:"#050c08",isolation:"isolate",overflow:"hidden"
  }:undefined}>
  {!isExport&&<header className={styles.heading}>
   <div className={styles.crumb}><a href="/motion/cinema">← CINEMATIC ENGINE</a><span> / V9 ART DIRECTOR</span></div>
   <div className={styles.name}><span>PRODUCT CINEMA · EIGHT SECOND REAL 3D SHOT</span>
    <h1>Real 3D cinema. <i>Not another generated image.</i></h1>
    <p>An authored laptop model, studio-lit metallic keyboard, physical basalt set, atmospheric ring light, moving camera and truthful capability panels.</p>
   </div><div className={styles.state}>{status}</div>
  </header>}
  <section className={styles.stage}>
    <div id="cinema-film-frame" ref={mount} className={styles.frame}
      style={isExport?{width:1920,height:1080,aspectRatio:"auto",border:"none"}:undefined}>
      <div className={styles.corners}>
       <span>MARGARYAN LABS / PROMPTENCE</span><span>SHOT 001 — PHYSICAL LAPTOP AND STUDIO</span>
      </div>
      <div className={styles.footer}><span>PROMPTENCE</span><span>BE PART OF THE ANSWER.</span></div>
    </div>
  </section>
  {isExport&&<input data-testid="cinema-source" type="file"
   accept="image/png,image/jpeg,image/webp" style={{position:"absolute",opacity:0,width:1,height:1}}
   onChange={e=>void importSource(e.target.files?.[0])}/>}
  {!isExport&&<div className={styles.controls}>
   <div className={styles.timeline}>
    <button disabled={!ready} onClick={()=>playing?stop():play()}>{playing?"Ⅱ PAUSE":"▶ PLAY THE SHOT"}</button>
    <input disabled={!ready} aria-label="V9 film playhead" type="range" min="0" max="8" step=".01"
     value={seconds} onChange={e=>{
      stop();const t=clip(Number(e.target.value));shot.current?.setTime(t);setSeconds(t);
     }}/>
    <output>{seconds.toFixed(2)} / 08.00</output>
   </div>
   <div className={styles.master}>
     <div><small>VERIFIED V9 NATIVE 3D VIDEO</small>
       <strong>8 SEC · 1920×1080 · 192 ACTUAL WEBGL FRAMES · ORIGINAL MUSIC</strong>
       <span>Real photographed public Promptence UI mapped onto modelled laptop. Framebuffer and H.264/AAC checks passed. Creative workprint, not release approval.</span>
     </div>
     <a href="https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/1a4864a6-557e-46c1-ba27-f956d36c2dbc.mp4"
       target="_blank" rel="noopener noreferrer">▶ WATCH REAL V9 MP4</a>
   </div>
   <div className={styles.beats}>
    {[{at:.7,n:"01",title:"STUDIO REVEAL"},{at:3.3,n:"02",title:"REAL PRODUCT"},{at:6.65,n:"03",title:"CAPABILITIES IN SPACE"}].map(b=>
    <button key={b.n} disabled={!ready} onClick={()=>{stop();shot.current?.setTime(b.at);setSeconds(b.at)}}>
     <small>{b.n}</small><strong>{b.title}</strong><span>↗</span>
    </button>)}
   </div>
   <div className={styles.provenance}>
    <div><strong>WHAT IS REAL?</strong><p>The screen is an unchanged screenshot of the public Promptence homepage captured October 14, 2026. The device, keys, stage, background rocks and translucent feature panels are generated as separate 3D objects. Panel descriptions are factual capability labels, not fabricated AI metrics.</p></div>
    <span className={sourceReady?styles.success:styles.warning}>
      {sourceReady?"REAL PUBLIC SCREEN ACTIVE":"CONCEPT SCREEN — IMPORT REAL CAPTURE"}
    </span>
    <label>REPLACE PRODUCT CAPTURE<input type="file" accept="image/png,image/jpeg,image/webp"
      onChange={e=>void importSource(e.target.files?.[0])}/></label>
   </div>
   {error&&<div className={styles.error} role="alert">{error}</div>}
   <p className={styles.disclaimer}>An eight-second code-rendered art-direction benchmark, not an approved advertisement. The finished MP4 is mastered separately with exact-timestamp Chromium/WebGL + FFmpeg and reviewed frame by frame.</p>
  </div>}
 </main>;
}
