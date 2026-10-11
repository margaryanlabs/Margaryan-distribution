import type { MotionProject, MotionScene } from "./studio";

/** Non-destructive, time-addressed picture editorial transformations.
 * No media decoding, external API or filesystem access here. The caller
 * sanitizes the returned project and performs the human approval.
 */
export interface PrecisionEdit {
  project:MotionProject;
  selectedIndex:number;
  description:string;
}
const guard=(project:MotionProject,index:number)=>{
  if(!Number.isInteger(index)||index<0||index>=project.scenes.length)
    throw Error("Choose a valid shot in the film timeline");
};
const round=(n:number)=>Number(n.toFixed(2));
function withoutOverlay(scene:MotionScene):MotionScene {
  return {...scene,overlayMediaId:undefined,overlayStart:0,overlayDuration:0};
}
function windowOverlay(scene:MotionScene,start:number,span:number):MotionScene{
  if(!scene.overlayMediaId)return {...scene};
  const from=scene.overlayStart||0;
  const until=from+(scene.overlayDuration||scene.seconds);
  const visibleStart=Math.max(start,from);
  const visibleEnd=Math.min(start+span,until);
  if(visibleEnd-visibleStart<.12)return withoutOverlay(scene);
  return {...scene,overlayStart:round(visibleStart-start),
    overlayDuration:round(visibleEnd-visibleStart)};
}
const eased=(t:number)=>t*t*(3-2*t);
function originalZoom(scene:MotionScene,t:number){
  const a=scene.sourceZoomStart??1;
  const b=scene.sourceZoomEnd??1.075;
  return round(a+(b-a)*eased(t));
}
export function moveMotionShot(project:MotionProject,index:number,delta:-1|1):PrecisionEdit{
  guard(project,index);
  const to=index+delta;
  if(to<0||to>=project.scenes.length)throw Error("The chosen shot cannot move outside this film");
  const scenes=project.scenes.map(x=>({...x}));
  [scenes[index],scenes[to]]=[scenes[to],scenes[index]];
  return{project:{...project,scenes},selectedIndex:to,
    description:"Moved shot "+(index+1)+" to position "+(to+1)+". Source IDs, audio cues and footage inpoints were preserved."};
}
export function duplicateMotionShot(
  project:MotionProject,index:number,sourceType?:"image"|"video"
):PrecisionEdit{
  guard(project,index);
  if(project.scenes.length>=8)throw Error("Maximum eight shots in Cinematic Studio");
  const selected=project.scenes[index];
  if(selected.kind==="screen"&&selected.mediaId){
    if(sourceType==="video")throw Error("Video should be split into consecutive, continuous source segments instead of replayed.");
    if(sourceType!=="image")throw Error("Load approved source media before duplicating a screen shot.");
  }
  if(selected.overlayMediaId&&sourceType==="video")throw Error("Cannot duplicate moving-video overlay");
  const scenes=project.scenes.map(x=>({...x}));
  const original=scenes[index];
  // Stills can be reused. No hypothetical synthesized source screenshot.
  scenes.splice(index+1,0,{...original,id:"scene-duplicate-"+index,
    transition:original.transition,voiceCue:""});
  scenes[index]={...original,transition:"cut"};
  return{project:{...project,scenes},selectedIndex:index+1,
    description:"Duplicated approved still/design shot. Second voice cue cleared and preceding cut hard-edited."};
}
export function splitMotionShot(project:MotionProject,index:number,offsetSeconds:number):PrecisionEdit{
  guard(project,index);
  if(project.scenes.length>=8)throw Error("Maximum eight shots in Cinematic Studio");
  const shot=project.scenes[index];
  const dur=shot.seconds;
  if(!Number.isFinite(offsetSeconds))throw Error("Invalid split position");
  const left=round(offsetSeconds),right=round(dur-left);
  if(left<2||right<2)throw Error("Each resulting shot must last at least 2 seconds. Move the playhead into the safe cut range.");
  const before=windowOverlay(shot,0,left);
  const after=windowOverlay(shot,left,right);
  // Decoded real video continues at exactly its previous source inpoint +
  // the first segment's duration, rather than replaying from the beginning.
  const middleZoom=originalZoom(shot,left/dur);
  const first:MotionScene={...before,seconds:left,transition:"cut",
    sourceZoomStart:shot.sourceZoomStart??1,sourceZoomEnd:middleZoom};
  const second:MotionScene={...after,id:"scene-split-"+index,
    seconds:right,mediaStart:shot.mediaId?round((shot.mediaStart||0)+left):0,
    sourceZoomStart:middleZoom,sourceZoomEnd:shot.sourceZoomEnd??1.075,
    voiceCue:""};
  const scenes=project.scenes.map(x=>({...x}));
  scenes.splice(index,1,first,second);
  return{project:{...project,scenes},selectedIndex:index+1,
    description:"Split shot "+(index+1)+" at "+left.toFixed(2)+"s with continuous original video inpoint, optical zoom and overlay time-window. Previous transition set to CUT."};
}
