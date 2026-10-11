import type { MotionProject } from "./studio";
import type { MotionQAReport } from "./quality";

/**
 * Honest film-production checklist. This is not an aesthetic quality score
 * or a legal/rights certification. It can show technical renderability while
 * leaving all commercial release approvals explicitly pending.
 */
export type ReadinessState="pass"|"review"|"block";
export type ReadinessPanel="create"|"media"|"scene"|"sound"|"review"|"deliver";
export interface ReadinessItem {
  id:string;
  state:ReadinessState;
  label:string;
  detail:string;
  action:string;
  panel:ReadinessPanel;
  shotIndex?:number;
}
export interface ReadinessShot {
  index:number;
  headline:string;
  kind:string;
  seconds:number;
  source:"motion-graphics"|"real-video"|"real-image"|"legacy-image"|"missing-source";
  sourceName:string|null;
  status:ReadinessState;
  detail:string;
}
export interface ReleaseReadiness {
  title:string;
  brand:string;
  filmSeconds:number;
  renderable:boolean;
  blockers:number;
  reviews:number;
  sourceShots:number;
  boundSources:number;
  voiceAttached:boolean;
  musicAttached:boolean;
  state:ReadinessState;
  items:ReadinessItem[];
  shots:ReadinessShot[];
  /** Always explicit: automation cannot certify actual commercial rights. */
  releaseRequiresHumanApproval:true;
}
export interface RegisteredSource {
  type:"video"|"image";
  filename:string;
  duration:number|null;
}
export interface ReleaseReadinessInputs {
  getSource:(id:string)=>RegisteredSource|undefined;
  legacyScreen:boolean;
  voiceAttached:boolean;
  voiceSeconds:number|null;
  voiceReady:boolean;
  voiceOverflowSeconds:number;
  musicAttached:boolean;
  /**
   * Reference/visual contact sheet has not been human-approved merely because
   * an image was inspected automatically; do not turn checks green here.
   */
}
function item(id:string,state:ReadinessState,label:string,detail:string,
  action:string,panel:ReadinessPanel,shotIndex?:number):ReadinessItem{
  return{id,state,label,detail,action,panel,...(shotIndex===undefined?{}:{shotIndex})};
}
export function inspectReleaseReadiness(
  project:MotionProject,qa:MotionQAReport,input:ReleaseReadinessInputs
):ReleaseReadiness{
  const shots:ReadinessShot[]=project.scenes.map((scene,index)=>{
    if(scene.kind!=="screen"){
      return{index,headline:scene.headline,kind:scene.kind,seconds:scene.seconds,
        source:"motion-graphics",sourceName:null,status:"pass",
        detail:"Original Motion graphics. Not an actual customer screen or provider result."};
    }
    if(!scene.mediaId){
      if(input.legacyScreen)return{index,headline:scene.headline,kind:scene.kind,
        seconds:scene.seconds,source:"legacy-image",sourceName:"Brand-wide browser image",
        status:"review",detail:"Legacy local screenshot. Package a scene-specific approved copy for portable edits."};
      return{index,headline:scene.headline,kind:scene.kind,seconds:scene.seconds,
        source:"missing-source",sourceName:null,status:"block",
        detail:"This scene requires a real approved product recording or screenshot."};
    }
    const bound=input.getSource(scene.mediaId);
    if(!bound)return{index,headline:scene.headline,kind:scene.kind,seconds:scene.seconds,
      source:"missing-source",sourceName:null,status:"block",
      detail:"Referenced source file is not decoded and attached in this browser."};
    if(bound.type==="video" &&
      (bound.duration===null||!Number.isFinite(bound.duration)||
      (scene.mediaStart||0)+scene.seconds>bound.duration-.12)){
      return{index,headline:scene.headline,kind:scene.kind,seconds:scene.seconds,
        source:"real-video",sourceName:bound.filename,status:"block",
        detail:"Real video does not cover the full source inpoint and shot duration."};
    }
    return{index,headline:scene.headline,kind:scene.kind,seconds:scene.seconds,
      source:bound.type==="video"?"real-video":"real-image",
      sourceName:bound.filename,status:"review",
      detail:"Original source linked. Readability, permissions and factual claims require human review."};
  });
  const items:ReadinessItem[]=[];
  const technical=qa.checks.filter(c=>c.severity==="block");
  for(const check of technical.slice(0,8)){
    const match=check.id.match(/\.(\d+)$/);
    const shotIndex=match?Number(match[1]):undefined;
    const panel:ReadinessPanel=check.id.startsWith("source.")||
      check.id.startsWith("screen.")||check.id.startsWith("overlay.")?"media":"scene";
    items.push(item(check.id,"block","Technical preflight",check.message,
      shotIndex===undefined?"OPEN "+panel.toUpperCase():"OPEN SHOT "+(shotIndex+1),
      panel,shotIndex));
  }
  const covered=shots.filter(s=>s.kind==="screen");
  const readySources=covered.filter(s=>s.source==="real-image"||s.source==="real-video"||s.source==="legacy-image");
  if(covered.length===0){
    items.push(item("evidence.no-product","review","No product footage",
      "This film uses only original animation. That's valid for a concept cut, but don't present it as proof of the live product.",
      "ADD REAL SOURCES","media"));
  }else if(covered.some(s=>s.status==="block")&&!technical.some(c=>c.id.startsWith("screen.")||c.id.startsWith("source."))){
    items.push(item("evidence.missing","block","Missing original footage",
      "At least one product shot needs a decoded, approved original source file.",
      "OPEN MEDIA LIBRARY","media"));
  }
  if(input.voiceAttached){
    if(input.voiceSeconds===null){
      items.push(item("audio.decode","review","Voice duration unavailable",
        "The attached human voice was not decoded or measured. Review playback on this device.",
        "OPEN AUDIO","sound"));
    }else if(!input.voiceReady){
      items.push(item("audio.window","block","Voice does not fit the cut",
        "Attached voice exceeds the remaining film timeline by "+
        Math.max(0,input.voiceOverflowSeconds).toFixed(2)+"s or cannot be placed. Adjust voice trim or shot timing.",
        "FIX VOICE TIMING","sound"));
    }else{
      items.push(item("audio.attached","pass","Narration attached",
        "A browser-local voice file fits the edited time window. Listen for synchronization, pronunciation and room noise.",
        "LISTEN TO MIX","sound"));
    }
  }else{
    items.push(item("audio.no-voice","review","No recorded narration",
      "A silent, music-only or text-led film can be intentional. Narration cues are not real spoken audio.",
      "RECORD A VOICE","sound"));
  }
  items.push(item("audio.license","review","Music and sound permissions",
    input.musicAttached?
      "Music is attached locally; verify actual usage rights, playback level and ducking against voice.":
      "No licensed music file attached. The local synthetic score may be used; listen to the exported film.",
    "OPEN AUDIO","sound"));
  const warns=qa.checks.filter(c=>c.severity==="warn");
  if(warns.length){
    items.push(item("story.review","review","Editorial and composition review",
      warns.length+" structural warnings. Check headline length, composition variety, claims and source prominence.",
      "REVIEW QA","review"));
  }
  // These manual checks are NOT automatically passed by source presence or
  // valid pixels. No synthetic trust score or misleading RELEASE READY claim.
  items.push(item("rights.signoff","review","Source and talent usage rights",
    "Confirm permissions for all real footage, client screens, logos, voice recordings and third-party assets.",
    "CHECK MEDIA RIGHTS","media"));
  items.push(item("truth.signoff","review","Claims and UI authenticity",
    "Compare every named brand claim, performance statement and on-screen UI value to verifiable originals.",
    "REVIEW FRAMES","review"));
  items.push(item("master.signoff","review","Exported film and listening review",
    "The final encoded video has not been watched end-to-end here. Inspect picture, voice, subtitles and final codec manually.",
    "OPEN EXPORT","deliver"));
  const blockers=items.filter(i=>i.state==="block").length;
  const reviews=items.filter(i=>i.state==="review").length;
  return{
    title:project.title,brand:project.brand,filmSeconds:qa.seconds,
    renderable:qa.pass&&shots.every(shot=>shot.status!=="block")&&
      input.voiceOverflowSeconds<=0&&
      (!input.voiceAttached||input.voiceSeconds===null||input.voiceReady),
    blockers,reviews,sourceShots:covered.length,boundSources:readySources.length,
    voiceAttached:input.voiceAttached,musicAttached:input.musicAttached,
    state:blockers?"block":"review",items,shots,
    releaseRequiresHumanApproval:true
  };
}
export function releaseReadinessExport(report:ReleaseReadiness):string{
  const data={
    schema:"motion-release-review-v1",
    project:{title:report.title,brand:report.brand,seconds:report.filmSeconds},
    technical:{renderable:report.renderable,blockers:report.blockers,
      originalSourceShots:report.boundSources+"/"+report.sourceShots,
      voiceAttached:report.voiceAttached,musicAttached:report.musicAttached},
    checks:report.items.map(({id,state,label,detail})=>({id,state,label,detail})),
    shots:report.shots.map(({index,headline,kind,source,status,detail})=>
      ({shot:index+1,headline,kind,source,status,detail})),
    certification:"NOT A RELEASE CERTIFICATE. Human factual, copyright, device and encoded master verification required."
  };
  return JSON.stringify(data,null,2)+"\n";
}
