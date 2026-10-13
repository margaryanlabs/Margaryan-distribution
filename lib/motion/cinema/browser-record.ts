"use client";

import type { PromptenceFilm } from "./promptence-film";

const DURATION = 10;
const W = 1280, H = 720;
const GREEN = "#9df4c1";
const IVORY = "#f4f0e7";
const smooth = (a:number,b:number,t:number) => {
  const n = Math.max(0,Math.min(1,(t-a)/(b-a)));
  return n*n*(3-2*n);
};

export type CinemaOutput = { blob: Blob; mime: string; extension: "mp4" | "webm"; seconds: number };
export type CinemaRecorderOptions = {
  film: PromptenceFilm;
  onProgress?: (value:number) => void;
  signal?: AbortSignal;
};

function chooseFormat() {
  const types = [
    {mime:"video/mp4;codecs=avc1.42E01E",extension:"mp4" as const},
    {mime:"video/mp4",extension:"mp4" as const},
    {mime:"video/webm;codecs=vp9",extension:"webm" as const},
    {mime:"video/webm;codecs=vp8",extension:"webm" as const},
    {mime:"video/webm",extension:"webm" as const}
  ];
  if (typeof MediaRecorder === "undefined") throw Error("This browser does not support MediaRecorder");
  const selected = types.find(type => MediaRecorder.isTypeSupported(type.mime));
  if (!selected) throw Error("This browser has no supported MP4 or WebM recording encoder");
  return selected;
}

async function officialMark() {
  const img = new Image();
  img.decoding = "async";
  img.src = "/motion/brands/promptence.svg";
  await img.decode();
  if (!img.naturalWidth || !img.naturalHeight) throw Error("Verified Promptence mark failed to load");
  return img;
}

function drawType(ctx:CanvasRenderingContext2D, time:number, mark:HTMLImageElement) {
  const intro = smooth(0,.7,time) * (1-smooth(2.6,3.7,time));
  const bridge = smooth(3.5,4.55,time) * (1-smooth(6.85,8.05,time));
  const closing = smooth(7.65,9.25,time);
  ctx.save();
  // Match the preview frame's restrained vignetting without flattening its WebGL geometry.
  const vignette=ctx.createRadialGradient(640,330,90,640,340,820);
  vignette.addColorStop(0,"#07100c00");vignette.addColorStop(1,"#020503ad");
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#c5d9cb";ctx.font="700 12px Arial, sans-serif";
  ctx.fillText("MARGARYAN LABS",65,52);
  ctx.textAlign="right";ctx.fillText("PRODUCT INTELLIGENCE / 001",1215,52);
  ctx.textAlign="left";
  if (intro>0) {
    ctx.globalAlpha=intro;
    ctx.font="700 14px Arial, sans-serif";ctx.fillStyle=GREEN;
    ctx.fillText("A NEW DECISION LAYER",114,237);
    ctx.font="650 76px Arial, sans-serif";ctx.fillStyle=IVORY;
    ctx.fillText("They ask AI.",112,345);
    ctx.fillStyle=GREEN;ctx.fillText("Who does it choose?",112,440);
  }
  if (bridge>0) {
    ctx.globalAlpha=bridge;
    ctx.font="700 22px Arial, sans-serif";
    ctx.fillStyle="#def7e8";ctx.textAlign="center";
    ctx.fillText("QUESTION  →  OBSERVATION  →  EVIDENCE  →  ACTION",640,614);
    ctx.textAlign="left";
  }
  if (closing>0) {
    ctx.globalAlpha=closing;
    const bg=ctx.createLinearGradient(0,0,1280,700);
    bg.addColorStop(0,"#07100cfb");bg.addColorStop(1,"#07100ce3");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // Fit official logo preserving its original aspect ratio.
    const ratio=mark.naturalWidth/mark.naturalHeight;
    const iconH=90;
    ctx.drawImage(mark,640-iconH*ratio/2,191,iconH*ratio,iconH);
    ctx.fillStyle=IVORY;ctx.textAlign="center";
    ctx.font="700 85px Arial, sans-serif";
    ctx.fillText("PROMPTENCE",640,395);
    ctx.fillStyle=GREEN;ctx.font="700 17px Arial, sans-serif";
    ctx.fillText("AI RECOMMENDATION INTELLIGENCE",640,452);
    ctx.fillStyle=IVORY;ctx.font="700 13px Arial, sans-serif";
    ctx.fillText("BE PART OF THE ANSWER.  ·  PROMPTENCE.TECH",640,548);
    ctx.textAlign="left";
  }
  ctx.globalAlpha=1;
  ctx.fillStyle="#8aa896";ctx.font="700 12px Arial, sans-serif";
  ctx.fillText("PROMPTENCE",65,686);
  ctx.textAlign="right";ctx.fillText("01 / 01 — CINEMATIC PROOF",1215,686);
  ctx.restore();
}

export async function recordPromptenceCinema({film,onProgress,signal}:CinemaRecorderOptions):Promise<CinemaOutput> {
  if (typeof window === "undefined") throw Error("Cinema recording requires a browser");
  if (signal?.aborted) throw Error("Video export cancelled");
  const kind=chooseFormat();
  const mark=await officialMark();
  const canvas=document.createElement("canvas");
  canvas.width=W; canvas.height=H;
  const ctx=canvas.getContext("2d",{alpha:false});
  if (!ctx) throw Error("Cinema compositor unavailable");
  const stream=canvas.captureStream(30);
  const track=stream.getVideoTracks()[0];
  if (!track) throw Error("No video track from cinematic compositor");

  let recorder: MediaRecorder;
  try {
    recorder=new MediaRecorder(stream,{mimeType:kind.mime,videoBitsPerSecond:7_000_000});
  } catch(error) {
    stream.getTracks().forEach(t=>t.stop());
    throw Error("Browser could not initialize H.264/VPx video encoder: " + String(error));
  }
  const pieces:BlobPart[]=[];
  let complete:((value:Blob)=>void)|undefined;
  let failed:((error:Error)=>void)|undefined;
  const stopped=new Promise<Blob>((resolve,reject)=>{complete=resolve;failed=reject;});
  let lastError:Error|null=null;
  let ended=false;
  recorder.ondataavailable=e=>{if(e.data.size>0)pieces.push(e.data);};
  recorder.onerror=e=>{lastError=new Error("Video encoder stopped unexpectedly: "+e.type);};
  recorder.onstop=()=>{
    if (lastError) {failed?.(lastError);return;}
    const blob=new Blob(pieces,{type:kind.mime});
    if (blob.size<60_000) failed?.(new Error("Encoder produced an unexpectedly small movie"));
    else complete?.(blob);
  };

  function paint(t:number) {
    film.setTime(Math.min(DURATION,t));
    ctx.drawImage(film.canvas,0,0,W,H);
    drawType(ctx,t,mark);
  }
  let raf=0;
  try {
    paint(0);
    recorder.start(250);
    const started=performance.now();
    await new Promise<void>((resolve,reject)=>{
      const step=(now:number)=>{
        if (signal?.aborted) { reject(new Error("Video export cancelled"));return; }
        if (recorder.state!=="recording") {reject(new Error("Recording stopped before 10 seconds"));return;}
        const t=Math.min(DURATION,(now-started)/1000);
        try {
          paint(t);
          onProgress?.(t/DURATION);
          if (t >= DURATION) {ended=true;resolve();return;}
          raf=requestAnimationFrame(step);
        } catch(error){reject(error instanceof Error?error:new Error(String(error)));}
      };
      raf=requestAnimationFrame(step);
    });
    if (!ended) throw Error("Video capture incomplete");
    recorder.stop();
    const blob=await stopped;
    onProgress?.(1);
    return {blob,mime:kind.mime,extension:kind.extension,seconds:DURATION};
  } catch(error) {
    if (recorder.state!=="inactive") recorder.stop();
    throw error;
  } finally {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach(t=>t.stop());
  }
}
