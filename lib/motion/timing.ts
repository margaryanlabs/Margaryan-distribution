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
export function honorRequestedTiming(project:MotionProject,brief:string):MotionProject {
  const requested=requestedSeconds(brief);
  if(requested===null)return project;
  const count=project.scenes.length;
  if(requested<count*2||requested>count*8) {
    throw new Error("For "+count+" shots, total duration must be between "+count*2+" and "+count*8+" seconds. Edit your brief or scene count.");
  }
  const target=requested;
  const original=project.scenes.map(s=>s.seconds);
  let low=0,high=20;
  for(let step=0;step<65;step++){
    const factor=(low+high)/2;
    const sum=original.reduce((v,time)=>v+Math.max(2,Math.min(8,time*factor)),0);
    if(sum<target)low=factor;
    else high=factor;
  }
  const factor=(low+high)/2;
  const scenes=project.scenes.map((s)=>({
    ...s,seconds:Math.max(2,Math.min(8,s.seconds*factor))
  }));
  return sanitizeMotionProject({...project,scenes});
}
