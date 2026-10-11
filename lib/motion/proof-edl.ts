/**
 * SOURCE-FIRST 10s FILM — TWO TRUE SOURCE IN-POINTS.
 *
 * Editorial decisions are numbers, NOT inferred AI product data.
 * This module is shared by the mobile preview and offline FFmpeg Master.
 * Source footage is never modified, uploaded, stretched or fabricated.
 */
export interface ProofEditDecision {
  firstIn: number;
  secondIn: number;
  cutAt: number;
  zoom: number;
}
export const PROOF_DEFAULT_EDL: ProofEditDecision = {
  firstIn: 0, secondIn: 4, cutAt: 4.55, zoom: 1,
};
export const PROOF_CUT_MIN = 3.5;
export const PROOF_CUT_MAX = 6.5;
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const sane=(value:unknown,fallback:number)=>{
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
};
export function sanitizeProofEDL(raw:unknown,duration:number):ProofEditDecision{
  const options=raw&&typeof raw==="object"?raw as Partial<ProofEditDecision>:{};
  const end=Number.isFinite(duration)&&duration>=0?duration:8;
  const max=Math.max(0,end-.12);
  return {
    firstIn:clamp(sane(options.firstIn,0),0,max),
    secondIn:clamp(sane(options.secondIn,Math.min(4,max)),0,max),
    cutAt:clamp(sane(options.cutAt,4.55),PROOF_CUT_MIN,PROOF_CUT_MAX),
    zoom:clamp(sane(options.zoom,1),.82,1.18)
  };
}
/** Which genuine frame should be decoded for this film timestamp?
 * 0–cutAt shows an initial selected portion of the real video.
 * At cutAt the film jump-cuts to secondIn (a different real moment).
 * Closing card uses last source frame only if preview RAW source mode is on.
 */
export function proofSourceTime(filmTime:number,sourceDuration:number,opts:ProofEditDecision){
  const duration=Number.isFinite(sourceDuration)?sourceDuration:8;
  const o=sanitizeProofEDL(opts,duration);
  const time=clamp(sane(filmTime,0),0,10);
  const start=time<o.cutAt?o.firstIn:o.secondIn;
  const local=time<o.cutAt?Math.max(0,time-.15):Math.max(0,time-o.cutAt);
  return clamp(start+local,0,Math.max(.01,duration-.12));
}
export function proofShotAt(filmTime:number,opts:ProofEditDecision){
  return filmTime<2.42?"HOOK":filmTime<opts.cutAt?"OBSERVE":
    filmTime<7.55?"VERIFY":"CLOSE";
}

/** Render acceptance blocker, not a bogus aesthetic score. A genuine clip
 * must cover BOTH source takes completely, without secretly freezing the
 * last frame and calling it a smooth cinematic camera movement. */
export function reviewProofEDL(sourceDuration:number,options:ProofEditDecision){
  const problems:string[]=[];
  if(!Number.isFinite(sourceDuration)||sourceDuration<8)
    problems.push("A real source recording must be at least 8 seconds.");
  const o=sanitizeProofEDL(options,sourceDuration);
  const firstEnd=o.firstIn+o.cutAt-.15;
  const secondEnd=o.secondIn+Math.max(0,7.55-o.cutAt);
  const lastUsable=sourceDuration-.12;
  if(firstEnd>lastUsable+.001)
    problems.push("Take 01 reaches beyond the end of the source file. Choose an earlier start.");
  if(secondEnd>lastUsable+.001)
    problems.push("Take 02 reaches beyond the end of the source file. Choose an earlier second in-point.");
  return {
    pass:problems.length===0,problems,
    takes:[
      {name:"TAKE 01",start:o.firstIn,end:firstEnd},
      {name:"TAKE 02",start:o.secondIn,end:secondEnd}
    ]
  };
}
export function proofEDLFile(options:ProofEditDecision){
  return {version:1,kind:"margaryan-motion-source-edl",durationSeconds:10,
    ...sanitizeProofEDL(options,300)};
}
export function parseProofEDLFile(value:unknown):ProofEditDecision{
  if(!value||typeof value!=="object")throw Error("Missing EDL object");
  const raw=value as Partial<ProofEditDecision>&{version?:number;kind?:string;durationSeconds?:number};
  if(raw.version!==1||raw.kind!=="margaryan-motion-source-edl"||raw.durationSeconds!==10)
    throw Error("Invalid Motion OS edit-decision file. Expected v1 10-second source film.");
  for(const key of ["firstIn","secondIn","cutAt","zoom"] as const){
    if(typeof raw[key]!=="number"||!Number.isFinite(raw[key]))
      throw Error("EDL requires a finite number for "+key);
  }
  return sanitizeProofEDL(raw,300);
}
