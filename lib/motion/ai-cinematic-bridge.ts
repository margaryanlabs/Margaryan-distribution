import type {MotionBrand,MotionFormat,MotionProject} from "./studio";
import type {QuickProject} from "./quick-project";

/**
 * Local-only AI Cinematic handoff. This module does not call a model, upload
 * media or start paid Higgsfield generations. It prepares reproducible shot
 * prompts and a compatible Quick Studio storyboard for user-supplied media.
 */
export interface CinematicShot {
  index:number;
  title:string;
  subtitle:string;
  seconds:number;
  visualPrompt:string;
  avoid:string;
}
export interface CinematicPack {
  schema:"margaryan-motion-cinematic-bridge/v1";
  concept:string;
  brandLabel:string;
  brand:MotionBrand;
  format:MotionFormat;
  shots:CinematicShot[];
  totalSeconds:number;
  generatedBy:"local_prompt_compiler";
  provider:"higgsfield_manual";
  paidGenerationStarted:false;
}
const DEFAULT_BEATS=[
  ["THE HOOK","Проблема, знакомая аудитории",4],
  ["THE REVEAL","Показать продукт без выдуманных интерфейсов",5],
  ["THE DIFFERENCE","Одна реальная ключевая возможность",5],
  ["THE ACTION","Название продукта и следующий шаг",4]
] as const;
const RATIO:Record<MotionFormat,string>={portrait:"9:16",square:"1:1",landscape:"16:9"};
function clean(value:unknown,max=240):string{
  return typeof value==="string"?value.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max):"";
}
function shotSeconds(input:number):number{
  return Number.isFinite(input)?Math.max(2,Math.min(8,Math.round(input*10)/10)):4;
}
export function buildCinematicPack(input:{
  concept:string;brandLabel:string;format:MotionFormat;project?:MotionProject|null;
}):CinematicPack{
  const concept=clean(input.concept,650);
  const brandLabel=clean(input.brandLabel,80)||"MARGARYAN LABS";
  if(concept.length<12)throw new Error("Опиши идею хотя бы одним предложением (12 символов).");
  if(!["portrait","square","landscape"].includes(input.format))throw new Error("Unknown format");
  const project=input.project;
  const brand=project?.brand||"labs";
  const source=project?.scenes?.length&&project.scenes.length>=2?
    project.scenes.slice(0,8).map(s=>[s.headline,s.support,s.seconds] as const):
    DEFAULT_BEATS;
  const shots:CinematicShot[]=source.map(([name,detail,duration],index)=>{
    const title=clean(name,96)||"SCENE "+(index+1);
    const subtitle=clean(detail,155);
    const seconds=shotSeconds(duration);
    const visualPrompt=[
      "Premium cinematic commercial, shot "+(index+1)+" of "+source.length+".",
      "Brand: "+brandLabel+". Creative brief: "+concept+".",
      "Visual objective: "+title+". "+subtitle+".",
      "Compose for "+RATIO[input.format]+", intended length "+seconds+" seconds.",
      "Art direction: realistic cinematic lighting, intentional camera movement, elegant pacing, tactile detail, coherent palette.",
      "Generate clean imagery with room for real typography, captions and brand marks to be composited later in Margaryan Motion Studio.",
      "Keep continuity with adjacent shots. Do not fabricate product UI, conversations, users, earnings, endorsements or performance evidence.",
      "No spoken claims or embedded readable text. Use verified user-owned reference assets when product accuracy matters."
    ].join(" ");
    return {index:index+1,title,subtitle,seconds,visualPrompt,
      avoid:"Watermarks, unwanted on-screen typography, fake logos, fake screenshots, fabricated messages, unrealistic UI, misleading financial results, flicker, distorted fingers and faces."};
  });
  return {schema:"margaryan-motion-cinematic-bridge/v1",concept,brandLabel,brand,format:input.format,
    shots,totalSeconds:Math.round(shots.reduce((sum,s)=>sum+s.seconds,0)*10)/10,
    generatedBy:"local_prompt_compiler",provider:"higgsfield_manual",paidGenerationStarted:false};
}
export function quickProjectFromCinematic(pack:CinematicPack):QuickProject{
  if(pack.shots.length<2||pack.shots.length>8)throw new Error("2–8 shots required");
  return {version:1,pipeline:"quick",name:pack.brandLabel+" / AI Cinematic assembly",
    brand:pack.brand,language:"ru",format:pack.format,
    shots:pack.shots.map(s=>({id:"shot-"+s.index,title:s.title,subtitle:s.subtitle,
      seconds:shotSeconds(s.seconds),visual:"fill"}))};
}
export function cinematicTextPack(pack:CinematicPack):string{
  return [
    "MARGARYAN MOTION / AI CINEMATIC — SHOT PACK",
    "Brand: "+pack.brandLabel,"Format: "+RATIO[pack.format],
    "Total target duration: "+pack.totalSeconds+"s",
    "Concept: "+pack.concept,
    "WORKFLOW: review each shot, create clips in an external generator only with explicit approval of its credit cost, download clips, and import them into Margaryan Motion Studio / Quick mode.",
    "No API requests, charges, generated media or MP4 were created by this prompt pack.",
    ...pack.shots.flatMap(s=>[
      "","SHOT "+String(s.index).padStart(2,"0")+" / "+s.seconds+"s / "+s.title,
      "PROMPT: "+s.visualPrompt,"AVOID: "+s.avoid
    ])
  ].join("\n");
}
