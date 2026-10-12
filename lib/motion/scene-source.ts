import type { MotionProject } from "./studio";
import { chooseTransition } from "./editorial-transitions";

/**
 * Per-shot, rights-reviewed local source media. Registration only accepts File
 * objects selected by an operator (or explicitly supplied to offline Chromium
 * from the operator's local --media-map). No network fetch, data in JSON, or
 * generated screen pixels.
 */
export interface MotionSceneSource {
  id:string;
  type:"image"|"video";
  element:HTMLImageElement|HTMLVideoElement;
  duration:number|null;
  width:number;
  height:number;
  filename:string;
  mime:string;
}
const registered=new Map<string,MotionSceneSource>();
const urls=new Map<string,string>();
let playbackError:string|null=null;
export function resetMotionPlaybackError(){playbackError=null;}
export function motionPlaybackError(){return playbackError;}
const VIDEO_MIMES=new Set(["video/mp4","video/webm","video/quicktime"]);
const IMAGE_MIMES=new Set(["image/jpeg","image/png","image/webp"]);
const waitForVideo=(video:HTMLVideoElement):Promise<void>=>new Promise((resolve,reject)=>{
  let settled=false;
  const timer=window.setTimeout(()=>finish(new Error("Video decode timed out. Try an H.264 MP4 recording.")),18000);
  function finish(error?:Error){
    if(settled)return;settled=true;clearTimeout(timer);
    video.removeEventListener("loadeddata",loaded);
    video.removeEventListener("error",failed);
    if(error)reject(error);else resolve();
  }
  const loaded=()=>finish();
  const failed=()=>finish(new Error("Browser cannot decode this source video. Try H.264 MP4."));
  video.addEventListener("loadeddata",loaded);
  video.addEventListener("error",failed);
  video.load();
});
export async function registerMotionSceneSource(id:string,file:File):Promise<MotionSceneSource>{
  if(!/^[\w-]{6,100}$/.test(id))throw Error("Invalid local source identifier");
  const isVideo=VIDEO_MIMES.has(file.type);
  if(!isVideo&&!IMAGE_MIMES.has(file.type))throw Error("Use PNG, JPEG, WebP or browser-compatible MP4, WebM, MOV");
  const max=isVideo?100_000_000:12_000_000;
  if(file.size<100||file.size>max)throw Error("Source file exceeds format limits");
  const url=URL.createObjectURL(file);
  try{
    let entry:MotionSceneSource;
    if(isVideo){
      const video=document.createElement("video");
      video.preload="auto";video.playsInline=true;video.muted=true;video.loop=false;
      video.src=url;await waitForVideo(video);
      if(!Number.isFinite(video.duration)||video.duration<2||video.duration>3600)
        throw Error("Valid recorded source video must run between 2 seconds and 1 hour");
      entry={id,type:"video",element:video,duration:video.duration,width:video.videoWidth,
        height:video.videoHeight,filename:file.name,mime:file.type};
    }else{
      const img=new Image();img.decoding="async";img.src=url;
      await img.decode();
      entry={id,type:"image",element:img,duration:null,width:img.naturalWidth,
        height:img.naturalHeight,filename:file.name,mime:file.type};
    }
    if(entry.width<240||entry.height<240||entry.width>8000||entry.height>8000)
      throw Error("Source frame resolution outside 240–8,000 pixels");
    disposeMotionSceneSource(id);
    registered.set(id,entry);urls.set(id,url);
    return entry;
  }catch(error){URL.revokeObjectURL(url);throw error;}
}
export function getMotionSceneSource(id:string|undefined):MotionSceneSource|undefined{
  return id?registered.get(id):undefined;
}
export function disposeMotionSceneSource(id:string){
  const media=registered.get(id);
  if(media?.type==="video"){
    const video=media.element as HTMLVideoElement;
    video.pause();video.removeAttribute("src");video.load();
  }
  registered.delete(id);
  const url=urls.get(id);
  if(url)URL.revokeObjectURL(url);
  urls.delete(id);
}
/** Release decoded scenes when the operator starts a different film.
 * Files in the local approved IndexedDB library are intentionally preserved.
 * Old recordings can only re-enter after an explicit re-attachment by the user.
 */
export function resetMotionSceneSources(){
  for(const id of [...registered.keys()])disposeMotionSceneSource(id);
  playbackError=null;
}
export function pauseMotionSourceVideos(){
  for(const item of registered.values())if(item.type==="video")
    (item.element as HTMLVideoElement).pause();
}
export function motionSourceIssues(project:MotionProject):string[]{
  const issues:string[]=[];
  for(let i=0;i<project.scenes.length;i++){
    const scene=project.scenes[i];
    const next=project.scenes[i+1];
    if(scene.kind==="screen"&&next?.kind==="screen"&&scene.mediaId&&
      next.mediaId===scene.mediaId&&getMotionSceneSource(scene.mediaId)?.type==="video"&&
      chooseTransition(scene.transition,project.qualityMode,i)!=="cut"){
      issues.push("Shot "+(i+1)+" and "+(i+2)+" reuse one video in an overlapping transition. Set CUT on shot "+
        (i+1)+" or use separate approved source recordings.");
    }
    if(scene.overlayMediaId){
      const overlay=registered.get(scene.overlayMediaId);
      if(!overlay)issues.push("Shot "+(i+1)+": approved image overlay "+scene.overlayMediaId+" is not attached in this browser.");
      else if(overlay.type!=="image")issues.push("Shot "+(i+1)+": second-layer overlays only support genuine still images, not video.");
    }
    if(scene.kind!=="screen"||!scene.mediaId)continue;
    const media=registered.get(scene.mediaId);
    if(!media){issues.push("Shot "+(i+1)+": approved source file "+scene.mediaId+" not attached in this browser.");continue;}
    if(media.type==="video" && (scene.mediaStart||0)+scene.seconds > media.duration!-.12){
      issues.push("Shot "+(i+1)+": real source video ends too soon. Start "+(scene.mediaStart||0).toFixed(1)+
        "s + shot "+scene.seconds.toFixed(1)+"s > video "+
        media.duration!.toFixed(1)+"s. Shorten the shot or choose an earlier inpoint.");
    }
  }
  return issues;
}
interface ShotTarget {source:MotionSceneSource;time:number;}
function activeVideoTargets(project:MotionProject,filmTime:number):ShotTarget[]{
  const out:ShotTarget[]=[];
  let cursor=0;
  for(let i=0;i<project.scenes.length;i++){
    const scene=project.scenes[i];
    const source=scene.mediaId&&scene.kind==="screen"?registered.get(scene.mediaId):undefined;
    if(source?.type!=="video"){cursor+=scene.seconds;continue;}
    const local=filmTime-cursor;
    if(local>=0&&local<scene.seconds){
      out.push({source,time:(scene.mediaStart||0)+local});
    } else if(local<0 && i>0){
      // Pre-roll the next genuine shot during the prior composition's crossfade,
      // at the same relative timestamp as render-engine's transition compositor.
      const prior=project.scenes[i-1];
      const transition=Math.min(project.qualityMode==="signature"?.55:.6,prior.seconds*.18);
      const priorLocal=filmTime-(cursor-prior.seconds);
      if(prior.transition!=="cut" && priorLocal>=prior.seconds-transition && priorLocal<prior.seconds){
        const p=(priorLocal-(prior.seconds-transition))/transition;
        out.push({source,time:(scene.mediaStart||0)+Math.max(.05,p*transition)});
      }
    }
    cursor+=scene.seconds;
  }
  return out;
}
function clampVideoTime(source:MotionSceneSource,time:number):number{
  return Math.max(0,Math.min(time,Math.max(0,(source.duration||0)-.08)));
}
/** Non-blocking sync for realtime browser preview and MediaRecorder.
 * Video playback is initiated only by a user-triggered preview/export.
 */
export function syncMotionSourcePlayback(project:MotionProject,filmTime:number,playing:boolean){
  const targets=activeVideoTargets(project,filmTime);
  const selected=new Set(targets.map(x=>x.source.id));
  for(const source of registered.values()){
    if(source.type==="video"&&!selected.has(source.id))
      (source.element as HTMLVideoElement).pause();
  }
  for(const {source,time} of targets){
    const video=source.element as HTMLVideoElement;
    const expected=clampVideoTime(source,time);
    if(Math.abs(video.currentTime-expected)>.23)video.currentTime=expected;
    if(playing){
      if(video.readyState<2)playbackError="Real source video decoder is not ready for "+source.filename;
      if(video.paused)void video.play().catch(error=>{
        playbackError="Could not play real source "+source.filename+": "+
          (error instanceof Error?error.message:String(error));
      });
    }else video.pause();
  }
}
/** Precise source-frame decoding for scrubs, source-proof contact sheets and
 * the offline FFmpeg frame bridge. Reject a failed seek; never render an old
 * frozen frame as though it matched the requested film timestamp.
 */
async function seekVideo(video:HTMLVideoElement,seconds:number):Promise<void>{
  if(video.readyState<2)throw Error("Approved video source not decoded");
  if(Math.abs(video.currentTime-seconds)<.018)return;
  video.pause();
  await new Promise<void>((resolve,reject)=>{
    let done=false;
    const timeout=window.setTimeout(()=>finish(new Error("Video seek timed out. Convert source to H.264 MP4.")),10000);
    const finish=(error?:Error)=>{
      if(done)return;done=true;clearTimeout(timeout);
      video.removeEventListener("seeked",complete);
      video.removeEventListener("error",failed);
      if(error)reject(error);else resolve();
    };
    const complete=()=>finish();
    const failed=()=>finish(new Error("Video decoder failed during timestamp seek"));
    video.addEventListener("seeked",complete);
    video.addEventListener("error",failed);
    try{video.currentTime=seconds;}catch(error){finish(error instanceof Error?error:new Error("Invalid source timestamp"));}
  });
}
export async function prepareMotionSourceFrame(project:MotionProject,time:number):Promise<void>{
  const issues=motionSourceIssues(project);
  if(issues.length)throw Error(issues.join(" | "));
  for(const {source,time:sourceTime} of activeVideoTargets(project,time)){
    await seekVideo(source.element as HTMLVideoElement,clampVideoTime(source,sourceTime));
  }
}
export function motionProjectHasRealVideo(project:MotionProject){
  return project.scenes.some(scene=>scene.kind==="screen"&&
    getMotionSceneSource(scene.mediaId)?.type==="video");
}
