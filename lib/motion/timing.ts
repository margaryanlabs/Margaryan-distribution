import { sanitizeMotionProject, type MotionProject } from "./studio";

/**
 * Respect durations explicitly written in natural-language creative briefs.
 * Video always remains inside editable 2–8 second scene boundaries.
 * No silent substitution: impossible targets reject with an actionable error.
 */
export function requestedSeconds(brief:string):number|null {
  const english=brief.match(/(?:^|\s)(\d{1,2})\s*(?:seconds?|secs?|s)\b/i);
  const russian=brief.match(/(?:^|\s)(\d{1,2})\s*секунд(?:[ыу])?(?:\s|[,.!?:;]|$)/iu);
  const armenian=brief.match(/(?:^|\s)(\d{1,2})\s*վայրկյան(?:\s|[,.!?:;]|$)/u);
  const candidate=english?.[1]||russian?.[1]||armenian?.[1];
  return candidate?Number(candidate):null;
}
/**
 * Stretch / compress scene durations proportionally while respecting shot
 * legibility and the editor's 2–8 second boundaries. Voice fitting is explicit;
 * it never changes narration audio, pitches or invents word synchronization.
 */
export function rescaleProjectToSeconds(project:MotionProject,target:number):MotionProject {
  const count=project.scenes.length;
  if(!Number.isFinite(target)||target<count*2||target>Math.min(64,count*8)){
    throw new Error("For "+count+" scenes, the film must be "+count*2+"–"+Math.min(64,count*8)+" seconds.");
  }
  const original=project.scenes.map(scene=>scene.seconds);
  let low=0,high=20;
  for(let step=0;step<64;step++){
    const ratio=(low+high)/2;
    const sum=original.reduce((v,n)=>v+Math.max(2,Math.min(8,n*ratio)),0);
    if(sum<target)low=ratio;
    else high=ratio;
  }
  const scale=(low+high)/2;
  const scenes=project.scenes.map(scene=>({...scene,seconds:Math.max(2,Math.min(8,scene.seconds*scale))}));
  return sanitizeMotionProject({...project,scenes});
}
export function honorRequestedTiming(project:MotionProject,brief:string):MotionProject {
  const requested=requestedSeconds(brief);
  if(requested===null)return project;
  return rescaleProjectToSeconds(project,requested);
}
