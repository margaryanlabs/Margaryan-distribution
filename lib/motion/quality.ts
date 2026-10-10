import { BRAND_INFO, durationOf, sanitizeMotionProject, type MotionProject } from "./studio";
import { PORTFOLIO } from "./portfolio";
import { hasProductScreen } from "./screen-media";
export type MotionSeverity = "block" | "warn" | "info";
export interface MotionQAItem { id: string; severity: MotionSeverity; message: string }
export interface MotionQAReport {
  pass: boolean;
  grade: "READY" | "REVIEW" | "BLOCKED";
  checks: MotionQAItem[];
  blockers: number;
  warnings: number;
  scenes: number;
  seconds: number;
}
/**
 * Structural preflight. This does not pretend to inspect rendered frames, claim
 * factual verification or verify an uploaded voiceover track.
 */
export function auditMotionProject(project: MotionProject): MotionQAReport {
  const checks: MotionQAItem[] = [];
  const issue = (id: string, severity: MotionSeverity, message: string) => checks.push({id,severity,message});
  const brand = PORTFOLIO[project.brand];
  if (!brand || !BRAND_INFO[project.brand]) issue("brand.unknown","block","Brand is not in the known portfolio.");
  else if (brand.logoStatus !== "source-verified") issue("brand.logo","warn","Official logo has not been imported and verified; typography fallback only.");
  else issue("brand.logo","info","Official marketing SVG is bundled with provenance.");
  const duration = durationOf(project);
  if (!Number.isFinite(duration) || duration < 3 || duration > 64) issue("duration.range","block","Timeline duration must be between 3 and 64 seconds.");
  if (project.scenes.length < 3) issue("story.arc","warn","Use at least 3 shots for hook, product mechanism, closure.");
  if (project.scenes.length > 8) issue("story.limit","block","Maximum 8 shots supported.");
  const kinds = new Set(project.scenes.map(s => s.kind));
  if (kinds.size < 3) issue("story.variety","warn","Fewer than 3 composition styles; the film may feel like a slide deck.");
  if (!project.scenes.some(s=>s.kind==="closer")) issue("story.cta","warn","No dedicated closing scene.");
  const headlines = project.scenes.map(s=>s.headline.trim().toLocaleLowerCase());
  if (new Set(headlines).size !== headlines.length) issue("copy.duplicate","warn","Repeated headlines detected.");
  for (const [i,s] of project.scenes.entries()) {
    if(s.kind==="screen"&&!hasProductScreen(project.brand))issue("screen.missing."+i,"block","Source screenshot missing for scene "+(i+1)+". Upload a real product screenshot before export.");
    if (!s.headline.trim()) issue("copy.blank."+i,"block","Scene "+(i+1)+" has no headline.");
    if (s.headline.length>82) issue("copy.length."+i,"warn","Scene "+(i+1)+" headline is lengthy for mobile.");
    if (!Number.isFinite(s.seconds)||s.seconds<2||s.seconds>8) issue("scene.duration."+i,"block","Scene "+(i+1)+" has invalid timing.");
    if (/\b(?:guaranteed profits?|100% results?|zero risk|guaranteed ranking|always #1)\b/i.test(s.headline+" "+s.support)) {
      issue("copy.claim."+i,"block","Unverifiable guarantee or risky claim in scene "+(i+1)+".");
    }
  }
  if (project.language === "hy" && !project.scenes.some(s=>/[\u0531-\u058f]/u.test(s.headline))) {
    issue("locale.hy","warn","Armenian narration selected but no Armenian headline detected.");
  }
  if (project.language === "ru" && !project.scenes.some(s=>/[\u0400-\u04ff]/u.test(s.headline))) {
    issue("locale.ru","warn","Russian narration selected but no Cyrillic headline detected.");
  }
  issue("legal.evidence","info","Synthetic UI graphics do not establish actual customer results. Review claims manually.");
  issue("export.codec","info","Browser WebM recording is device-dependent; verify exported MP4 / audio externally.");
  const blockers=checks.filter(c=>c.severity==="block").length;
  const warnings=checks.filter(c=>c.severity==="warn").length;
  return {
    pass:blockers===0,grade:blockers?"BLOCKED":warnings?"REVIEW":"READY",
    blockers,warnings,checks,scenes:project.scenes.length,seconds:duration
  };
}
/**
 * Visual signal check for a sampled frame: empty frames or alpha loss are detected.
 * Does not equate pixel variation with good aesthetics or guarantee legibility.
 */
export function inspectFramePixels(data: Uint8ClampedArray, width: number, height: number) {
  if(width<1||height<1||data.length<width*height*4)return {valid:false,reason:"Frame unavailable"};
  let min=255,max=0,alphaMin=255,light=0,energy=0;
  const stride=Math.max(1,Math.floor(width*height/1200));
  let count=0;
  for(let pixel=0;pixel<width*height;pixel+=stride) {
    const i=pixel*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    const l=(r*0.2126+g*0.7152+b*0.0722);
    min=Math.min(min,l);max=Math.max(max,l);alphaMin=Math.min(alphaMin,a);
    light+=l;energy+=(r+g+b)/3;count++;
  }
  if(alphaMin<240)return {valid:false,reason:"Unexpected transparency in rendered frame"};
  if(max-min<18)return {valid:false,reason:"Low dynamic range / possible blank frame"};
  return {valid:true,contrast:max-min,meanLuma:light/count,meanRGB:energy/count};
}


export interface MotionPolishResult { project:MotionProject; changes:string[] }
/**
 * Idempotent and strictly non-generative quality cleanup:
 * - normalizes invisible Unicode controls and accidental excessive punctuation;
 * - makes a multi-shot film end on a closing shot;
 * - creates basic layout variety if the author chose only one visual composition.
 * No claims, branding facts or multilingual copy are invented by this pass.
 */
export function autoPolishMotionProject(original: MotionProject): MotionPolishResult {
  const project=sanitizeMotionProject(original);
  const changes:string[]=[];
  const tidy=(value:string)=>{
    return value.normalize("NFC")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/gu,"")
      .replace(/[\u0000-\u001F\u007F]/gu," ")
      .replace(/\s+/gu," ")
      .replace(/([!?։՞])\1{2,}/gu,"$1")
      .trim();
  };
  project.scenes=project.scenes.map((scene,index)=>{
    const next={...scene};
    for(const field of ["headline","eyebrow","support"] as const){
      const cleaned=tidy(next[field]);
      if(cleaned!==next[field]){
        next[field]=cleaned;
        changes.push("Cleaned "+field+" on shot "+(index+1));
      }
    }
    return next;
  });
  if(project.scenes.length>=3){
    const final=project.scenes.at(-1)!;
    if(final.kind!=="closer"){
      final.kind="closer";
      changes.push("Reserved final shot for brand closure");
    }
  }
  const variety=new Set(project.scenes.map(scene=>scene.kind));
  if(project.scenes.length>=4 && variety.size<3){
    const first=project.scenes[0];
    if(first.kind!=="kinetic"){
      first.kind="kinetic";
      changes.push("Added an editorial kinetic opening");
    }
    const interior=project.scenes[Math.floor(project.scenes.length/2)];
    if(interior.kind!=="network"){
      interior.kind="network";
      changes.push("Added a product/diagram scene");
    }
  }
  return {project,changes};
}
