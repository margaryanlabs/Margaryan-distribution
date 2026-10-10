import { durationOf, FORMAT_SIZE, type MotionProject } from "./studio";
import { drawMotionFrame } from "./render-engine";
import { preloadMotionLogo } from "./brand-assets";
import { hasProductScreen } from "./screen-media";

/**
 * Aesthetic reference comparisons are descriptive statistics, NOT a neural
 * quality score or proof that our film matches/exceeds an advertising example.
 * All processing stays in the user's browser. Original content is not copied.
 */
export interface FrameSignals {
  luma: number;
  contrast: number;
  saturation: number;
  darkShare: number;
  edgeDensity: number;
  black: boolean;
}
export interface ReferenceSample {
  percent: number;
  timestampOur: number;
  timestampReference: number;
  ours: FrameSignals;
  reference: FrameSignals;
  difference: number;
}
export interface ReferenceComparison {
  brand: string;
  language: string;
  filmSeconds: number;
  referenceSeconds: number;
  format: string;
  frames: ReferenceSample[];
  signals: {
    referenceDarkPercent: number;
    filmDarkPercent: number;
    meanLumaDifference: number;
    meanSaturationDifference: number;
    contrastDifference: number;
    meanFrameDifference: number;
    ourShotCount: number;
    shotLengthMean: number;
  };
  notes: string[];
  humanReviewRequired: true;
  sourceStored: false;
  metricsOnly: true;
  contactSheet: Blob;
}
function sampleSignals(data:ImageData):FrameSignals {
  const {width:w,height:h}=data;
  const n=w*h;
  const luma=new Float32Array(n);
  let sum=0,sumsq=0,satur=0,dark=0,edges=0;
  for(let i=0;i<n;i++){
    const j=i*4;
    const r=data.data[j],g=data.data[j+1],b=data.data[j+2];
    const l=.2126*r+.7152*g+.0722*b;
    luma[i]=l;sum+=l;sumsq+=l*l;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    satur+=max===0?0:(max-min)/max;
    if(l<48)dark++;
  }
  const average=sum/n;
  const variance=Math.max(0,sumsq/n-average*average);
  const sd=Math.sqrt(variance);
  for(let y=1;y<h-1;y+=2){
    for(let x=1;x<w-1;x+=2){
      const here=y*w+x;
      const gradient=Math.abs(luma[here]-luma[here-1])+
        Math.abs(luma[here]-luma[here-w]);
      if(gradient>24)edges++;
    }
  }
  const samples=Math.max(1,Math.floor((w-2)/2)*Math.floor((h-2)/2));
  return {
    luma:+average.toFixed(2),
    contrast:+sd.toFixed(2),
    saturation:+(satur/n*100).toFixed(2),
    darkShare:+(dark/n*100).toFixed(2),
    edgeDensity:+(edges/samples*100).toFixed(2),
    black:average<6&&sd<7
  };
}
function frameDifference(a:ImageData,b:ImageData){
  if(a.width!==b.width||a.height!==b.height)throw new Error("Mismatched analysis dimensions");
  let diff=0;
  for(let i=0;i<a.data.length;i+=4){
    diff+=Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2]);
  }
  return +(diff/(a.width*a.height*3)).toFixed(2);
}
function mean(items:number[]){return items.reduce((a,b)=>a+b,0)/Math.max(1,items.length);}
const SAMPLE_PERCENT=[.04,.16,.29,.42,.55,.68,.81,.95] as const;
function assertReadyFile(file:File){
  if(file.size<15_000||file.size>150_000_000)throw new Error("Reference must be 15KB–150MB.");
  const allowed=["video/mp4","video/webm","video/quicktime","video/x-m4v"];
  const validType=allowed.includes(file.type)||/\.(mp4|webm|mov|m4v)$/i.test(file.name);
  if(!validType)throw new Error("Reference must be MP4, WebM or MOV. Your browser must support the codec.");
}
function onceEvent<T extends Event>(element:EventTarget,name:string,timeout=12000):Promise<T>{
  return new Promise<T>((resolve,reject)=>{
    const timer=setTimeout(()=>{clean();reject(new Error("Reference video decoding/seek timed out. Try an H.264 MP4."));},timeout);
    function clean(){clearTimeout(timer);element.removeEventListener(name,success);element.removeEventListener("error",failure);}
    function success(e:Event){clean();resolve(e as T);}
    function failure(){clean();reject(new Error("The browser could not decode the reference video."));}
    element.addEventListener(name,success,{once:true});
    element.addEventListener("error",failure,{once:true});
  });
}
async function seek(video:HTMLVideoElement,t:number){
  // Avoid waiting for a seeked event when the target is already current.
  if(Math.abs(video.currentTime-t)<.015&&video.readyState>=2)return;
  const promise=onceEvent<Event>(video,"seeked",14000);
  video.currentTime=t;
  await promise;
}
export async function compareFilmWithReference(project:MotionProject,file:File):Promise<ReferenceComparison>{
  assertReadyFile(file);
  if(project.scenes.some(s=>s.kind==="screen")&&!hasProductScreen(project.brand)){
    throw new Error("Upload your real product screenshot before comparing this film.");
  }
  const objectUrl=URL.createObjectURL(file);
  const video=document.createElement("video");
  video.preload="auto";
  video.muted=true;
  video.playsInline=true;
  video.crossOrigin="anonymous"; // blob: only; no network video fetch.
  const filmSeconds=durationOf(project);
  try {
    const pending=onceEvent<Event>(video,"loadeddata",16000);
    video.src=objectUrl;
    video.load();
    await pending;
    const referenceSeconds=video.duration;
    if(!Number.isFinite(referenceSeconds)||referenceSeconds<2||referenceSeconds>180)throw new Error("Reference duration must be 2–180 seconds.");
    if(video.videoWidth<160||video.videoHeight<160)throw new Error("Video reference is too small for a meaningful comparison.");
    await preloadMotionLogo(project.brand);
    const dimensions=FORMAT_SIZE[project.format];
    const aspect=dimensions.width/dimensions.height;
    const longSide=260;
    const ourW=aspect>=1?longSide:Math.max(100,Math.round(longSide*aspect));
    const ourH=aspect>=1?Math.max(100,Math.round(longSide/aspect)):longSide;
    const refAspect=video.videoWidth/video.videoHeight;
    const refW=refAspect>=1?longSide:Math.max(100,Math.round(longSide*refAspect));
    const refH=refAspect>=1?Math.max(100,Math.round(longSide/refAspect)):longSide;
    const own=document.createElement("canvas");own.width=ourW;own.height=ourH;
    const ref=document.createElement("canvas");ref.width=refW;ref.height=refH;
    const ownCtx=own.getContext("2d",{willReadFrequently:true,alpha:false});
    const refCtx=ref.getContext("2d",{willReadFrequently:true,alpha:false});
    if(!ownCtx||!refCtx)throw new Error("Canvas analysis is unsupported");
    const probe=document.createElement("canvas");probe.width=96;probe.height=96;
    const probeCtx=probe.getContext("2d",{willReadFrequently:true,alpha:false});
    if(!probeCtx)throw new Error("Video reference sampling is unavailable");
    const cols=2,pad=12,titleH=32,rowH=Math.max(ourH,refH)+titleH+pad;
    const cellW=Math.max(ourW,refW)+pad;
    const board=document.createElement("canvas");
    board.width=cols*cellW+pad;
    board.height=SAMPLE_PERCENT.length*rowH+pad;
    const art=board.getContext("2d",{alpha:false});
    if(!art)throw new Error("Contact sheet context unavailable");
    art.fillStyle="#071012";art.fillRect(0,0,board.width,board.height);
    const frames:ReferenceSample[]=[];
    const notes:string[]=[];
    let lastO:ImageData|null=null,lastR:ImageData|null=null;
    for(const [index,percent] of SAMPLE_PERCENT.entries()){
      const tO=Math.min(filmSeconds-.04,filmSeconds*percent);
      const tR=Math.min(referenceSeconds-.04,referenceSeconds*percent);
      await seek(video,Math.max(0,tR));
      drawMotionFrame(ownCtx,project,tO,ourW,ourH);
      refCtx.drawImage(video,0,0,refW,refH);
      const ourData=ownCtx.getImageData(0,0,ourW,ourH);
      const refData=refCtx.getImageData(0,0,refW,refH);
      const ourMetrics=sampleSignals(ourData),refMetrics=sampleSignals(refData);
      probeCtx.drawImage(own,0,0,96,96);
      const nowO=probeCtx.getImageData(0,0,96,96);
      probeCtx.drawImage(ref,0,0,96,96);
      const nowR=probeCtx.getImageData(0,0,96,96);
      const diff=index===0?0:(
        Math.abs(frameDifference(nowO,lastO!)-frameDifference(nowR,lastR!))
      );
      // Clone image pixels: getImageData is a snapshot, but make that explicit.
      lastO=nowO;lastR=nowR;
      frames.push({percent,timestampOur:+tO.toFixed(2),timestampReference:+tR.toFixed(2),ours:ourMetrics,reference:refMetrics,difference:+diff.toFixed(2)});
      const y=pad+index*rowH;
      art.fillStyle="#142125";
      art.fillRect(pad,y,cellW-pad,titleH-4);
      art.fillRect(cellW+pad,y,cellW-pad,titleH-4);
      art.textBaseline="middle";art.font="700 11px Arial,sans-serif";
      art.fillStyle="#f4f8f8";
      art.fillText("OUR FILM  ·  "+tO.toFixed(1)+"s",pad+7,y+12);
      art.fillText("REFERENCE  ·  "+tR.toFixed(1)+"s",cellW+pad+7,y+12);
      art.drawImage(own,pad,y+titleH);
      art.drawImage(ref,cellW+pad,y+titleH);
    }
    const ourDark=mean(frames.map(x=>x.ours.darkShare));
    const refDark=mean(frames.map(x=>x.reference.darkShare));
    const meanLumaDifference=mean(frames.map(x=>x.ours.luma-x.reference.luma));
    const meanSaturationDifference=mean(frames.map(x=>x.ours.saturation-x.reference.saturation));
    const contrastDifference=mean(frames.map(x=>x.ours.contrast-x.reference.contrast));
    const movementDifference=mean(frames.slice(1).map(x=>x.difference));
    if(Math.abs(ourDark-refDark)>22){
      notes.push("Dark-pixel coverage differs noticeably. Consider tonal grading without changing approved brand colors.");
    }
    if(Math.abs(contrastDifference)>20){
      notes.push("Frame contrast differs noticeably. Check legibility and negative space in both films.");
    }
    if(Math.abs(meanSaturationDifference)>20){
      notes.push("Color intensity differs noticeably. Do not match reference by violating official brand palette.");
    }
    if(movementDifference>35){
      notes.push("Between-sample visual changes differ. This does NOT measure actual edit rhythm or prove a pacing issue.");
    }
    if(frames.some(x=>x.ours.black))notes.push("A sampled output frame appears blank/black: inspect that shot.");
    if(!notes.length)notes.push("Basic luminance/color signals are broadly similar, but this does not imply visual or creative equivalence.");
    notes.push("A reference comparison cannot assess story meaning, brand truth, directing quality, speech/music synchrony or copyright.");
    const contactSheet=await new Promise<Blob>((resolve,reject)=>{
      board.toBlob(b=>b?resolve(b):reject(new Error("Comparison sheet encoding failed")),"image/png");
    });
    return{
      brand:project.brand,language:project.language||"en",filmSeconds,referenceSeconds,
      format:project.format,frames,
      signals:{
        referenceDarkPercent:+refDark.toFixed(2),filmDarkPercent:+ourDark.toFixed(2),
        meanLumaDifference:+meanLumaDifference.toFixed(2),
        meanSaturationDifference:+meanSaturationDifference.toFixed(2),
        contrastDifference:+contrastDifference.toFixed(2),
        meanFrameDifference:+movementDifference.toFixed(2),
        ourShotCount:project.scenes.length,
        shotLengthMean:+(filmSeconds/project.scenes.length).toFixed(2)
      },
      notes,humanReviewRequired:true,sourceStored:false,metricsOnly:true,contactSheet
    };
  } finally {
    video.pause();
    video.removeAttribute("src");video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
export function summarizeReferenceComparison(report:ReferenceComparison){
  const {contactSheet:_contactSheet,...serializable}=report;
  void _contactSheet;
  return{schema:"margaryan-motion-reference-signals/v1",...serializable,
    disclaimer:"Paired images are sampled at equivalent relative timeline positions. No contents of the source video are copied into a finished film. No aesthetic quality score or copyright clearance is claimed."};
}
