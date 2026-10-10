import { type MotionProject, type MotionSceneKind, FORMAT_SIZE, sanitizeMotionProject } from "./studio";
import { fitShotCopy } from "./typography";
import { auditMotionProject, type MotionQAReport } from "./quality";
import { reviewMotionVisuals, type VisualReview } from "./visual-review";
import { hasProductScreen } from "./screen-media";

export interface RepairChange {
  shot: number;
  field: "kind" | "typographyScale";
  from: string | number;
  to: string | number;
  reason: string;
}
export interface RepairIteration {
  iteration: number;
  beforeWarnings: number;
  afterWarnings: number;
  pass: boolean;
  changes: RepairChange[];
}
export interface DirectorRepairResult {
  project: MotionProject;
  before: MotionQAReport;
  after: MotionQAReport;
  visual: VisualReview;
  iterations: RepairIteration[];
  changes: RepairChange[];
  improved: boolean;
  status: "REPAIRED" | "UNCHANGED" | "NEEDS_HUMAN";
  remaining: string[];
}
/**
 * Controlled, brand-preserving corrective agent.
 *
 * Boundaries:
 * - Never rewrite advertising claims, Armenian/Russian wording or brand art.
 * - Never replace/mask a real screen scene with fake UI.
 * - Never "approve" licensing, privacy, logos, speech synchronization or taste.
 * - Only reduce text size as far as 0.72x or change composition when visually
 *   repetitive. All edits are reversible in Studio and reported explicitly.
 *
 * The goal is to eliminate objective layout defects and bad repetition, not
 * make unverifiable AI judgements about artistry.
 */
const VARIANT:MotionSceneKind[]=["kinetic","opener","network","statement","orbit"];
const SCALE_STEPS=[1,.96,.92,.88,.84,.80,.76,.72];
const MAX_PASSES=3;
const LIMIT=200; // UI can always be cancelled by closing the tab; no external work.
function bestVariety(kind:MotionSceneKind,previous:MotionSceneKind,following:MotionSceneKind,shot:number):MotionSceneKind {
  if(kind==="screen"||kind==="closer")return kind;
  const choices=VARIANT.filter(candidate=>candidate!==kind&&candidate!==previous&&candidate!==following);
  return choices[(shot+2)%Math.max(1,choices.length)]||"kinetic";
}
function dedupeChanges(changes:RepairChange[]):RepairChange[]{
  // Keep every actual mutation and original reason, not just the final value.
  return changes.slice(0,LIMIT);
}
function diagnostics(visual:VisualReview):{repeated:Set<number>; geometry:Set<number>} {
  const repeated=new Set<number>(),geometry=new Set<number>();
  for(const message of visual.warnings){
    const match=message.match(/^SHOT (\d+)/);
    if(!match)continue;
    const idx=Number(match[1])-1;
    if(!Number.isInteger(idx)||idx<0)continue;
    if(message.includes("visually similar"))repeated.add(idx);
    if(message.includes("/ TEXT:"))geometry.add(idx);
  }
  return{repeated,geometry};
}
export async function repairMotionProject(original:MotionProject):Promise<DirectorRepairResult>{
  const before=auditMotionProject(original);
  let current=sanitizeMotionProject(original);
  const size=FORMAT_SIZE[current.format];
  const virtualH=1080*size.height/size.width;
  const canvas=document.createElement("canvas");
  canvas.width=1080;canvas.height=180;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Motion director needs a local canvas for text fitting");
  const history:RepairIteration[]=[];
  const changes:RepairChange[]=[];
  let visual=await reviewMotionVisuals(current);
  const initialRemaining=visual.warnings.length;
  let previousSignature="";
  for(let iteration=1;iteration<=MAX_PASSES;iteration++){
    const batch:RepairChange[]=[];
    const issues=diagnostics(visual);
    const scenes=current.scenes.map(s=>({...s}));
    for(let i=0;i<scenes.length;i++){
      const scene=scenes[i];
      const copy=scene.headline.toLocaleUpperCase(current.language||"en");
      const currentSize=scene.typographyScale||1;
      const currentFit=fitShotCopy(ctx,copy,scene.support,1080,virtualH,currentSize);
      if(!currentFit.valid || issues.geometry.has(i)){
        const candidates=SCALE_STEPS.filter(scale=>scale<currentSize-0.001);
        for(const candidate of candidates){
          const fit=fitShotCopy(ctx,copy,scene.support,1080,virtualH,candidate);
          if(!fit.valid||fit.title.fontSize<32)continue;
          scene.typographyScale=candidate;
          batch.push({
            shot:i+1,field:"typographyScale",from:currentSize,to:candidate,
            reason:"Fitted all original words into measured mobile-safe text bounds"
          });
          break;
        }
      }
      const prev=scenes[i-1]?.kind||"opener";
      const next=scenes[i+1]?.kind||"closer";
      const repeated=issues.repeated.has(i);
      const similarNeighbours=(i>0 && i<scenes.length-1 && prev===scene.kind && next===scene.kind);
      if((repeated||similarNeighbours)&&scene.kind!=="screen"&&scene.kind!=="closer"){
        const kind=bestVariety(scene.kind,prev,next,i+iteration);
        if(kind!==scene.kind){
          batch.push({shot:i+1,field:"kind",from:scene.kind,to:kind,
            reason:repeated?"A sampled frame resembled the previous shot":"Three consecutive identical visual treatments"});
          scene.kind=kind;
        }
      }
    }
    // Keep original source imagery, exact copy, timecodes and story structure.
    if(!batch.length)break;
    const next=sanitizeMotionProject({...current,scenes});
    const signature=JSON.stringify(next.scenes.map(s=>[s.kind,s.typographyScale]));
    if(signature===previousSignature)break;
    previousSignature=signature;
    const updated=await reviewMotionVisuals(next);
    history.push({
      iteration,beforeWarnings:visual.warnings.length,
      afterWarnings:updated.warnings.length,pass:updated.pass,
      changes:batch
    });
    changes.push(...batch);
    current=next;
    visual=updated;
    if(visual.pass&&!diagnostics(visual).repeated.size)break;
  }
  const after=auditMotionProject(current);
  const remaining=[...visual.warnings];
  for(const x of after.checks.filter(c=>c.severity==="block"||c.severity==="warn")){
    if(!remaining.includes(x.message))remaining.push(x.message);
  }
  if(current.scenes.some(s=>s.kind==="screen")&&!hasProductScreen(current.brand)){
    remaining.push("Source screenshot missing: upload a real image to the active browser session.");
  }
  const improved=changes.length>0&&visual.warnings.length<initialRemaining;
  return {
    project:current,before,after,visual,iterations:history,
    changes:dedupeChanges(changes),improved,
    status:!visual.pass||!after.pass||remaining.length>0?"NEEDS_HUMAN":changes.length?"REPAIRED":"UNCHANGED",
    remaining
  };
}
/** Serializable audit for directors; omit canvases, blobs, source imagery. */
export function serializeRepair(result:DirectorRepairResult){
  return{
    schema:"margaryan-motion-auto-director/v1",
    createdAt:new Date().toISOString(),
    brand:result.project.brand,language:result.project.language||"en",
    format:result.project.format,shots:result.project.scenes.length,
    before:{grade:result.before.grade,warnings:result.before.warnings,blockers:result.before.blockers},
    after:{grade:result.after.grade,warnings:result.after.warnings,blockers:result.after.blockers},
    iterations:result.iterations,changes:result.changes,
    measuredFramePass:result.visual.pass,
    remaining:result.remaining,
    status:result.status,
    humanReviewRequired:true,
    note:"Deterministic bounded typography and shot-variety repairs. The system cannot certify aesthetics, translations, ownership, licenses, screenshots or actual audio."
  };
}
