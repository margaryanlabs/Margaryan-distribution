/**
 * Motion Studio Interaction Cinema — read-only public UI choreography.
 * This is authored browser direction, not AI results or a video-provider API.
 * Run with local Playwright + FFmpeg; only explicitly allowed public targets.
 */
export const MOTION_INTERACTION_PROTOCOL="motion-interaction-cinema/v1";
export const PUBLIC_HOST="promptence.tech";
export const TAKE_ID="promptence-interaction-take-01";
export const FPS=24;
export const PLAN=[
 {id:"introduce",seconds:3.4,kind:"focus",target:"landing"},
 {id:"open-free-check",seconds:3.4,kind:"click",target:"check-link"},
 {id:"enter-site",seconds:3.4,kind:"type",target:"website",text:"promptence.tech"},
 {id:"enter-company",seconds:3.4,kind:"type",target:"company",text:"Promptence"},
 {id:"enter-region",seconds:3.4,kind:"type",target:"region",text:"United States"},
 {id:"enter-category",seconds:3.4,kind:"type",target:"category",text:"AI visibility"},
 {id:"switch-local",seconds:3.4,kind:"click",target:"local-tab"},
 {id:"switch-global",seconds:3.4,kind:"click",target:"ai-tab"},
 {id:"open-evidence",seconds:3.4,kind:"click",target:"evidence-link"},
 {id:"open-how",seconds:3.4,kind:"click",target:"how-link"}
];
/** Explicit target allowlist — never run a submitted scan, checkout, login or form mutation. */
export const TARGETS=Object.freeze({
 "landing":{mode:"heading",value:"See who AI recommends instead of you — and what to change.",kind:"heading"},
 "check-link":{mode:"css",value:'a[href="#free-check"]',kind:"anchor",href:"#free-check"},
 "website":{mode:"css",value:'input[placeholder="example.com"]',kind:"input"},
 "company":{mode:"css",value:'input[placeholder="Company name"]',kind:"input"},
 "region":{mode:"css",value:'input[placeholder="Country or region"]',kind:"input"},
 "category":{mode:"css",value:'input[placeholder="CRM, real estate, delivery"]',kind:"input"},
 "local-tab":{mode:"button",value:"Local AI",kind:"button"},
 "ai-tab":{mode:"button",value:"AI visibility",kind:"button"},
 "evidence-link":{mode:"css",value:'a[href="#deliverables"]',kind:"anchor",href:"#deliverables"},
 "how-link":{mode:"css",value:'a[href="#how-it-works"]',kind:"anchor",href:"#how-it-works"}
});
const fail=s=>{throw Error("INTERACTION BLOCKED: "+s);};
export function validatePlan(plan=PLAN){
 if(!Array.isArray(plan)||!plan.length||plan.length>20)fail("invalid shot plan");
 let total=0; const seen=new Set();
 for(const step of plan){
  if(!step||typeof step.id!=="string"||seen.has(step.id))fail("duplicate or invalid action ID");
  seen.add(step.id);
  const target=TARGETS[step.target];
  if(!target)fail("unapproved selector "+String(step.target));
  if(!["focus","click","type"].includes(step.kind))fail("unapproved action type");
  if(!Number.isFinite(step.seconds)||step.seconds<1.5||step.seconds>6)fail("unsafe action duration");
  if(step.kind==="focus"&&target.kind!=="heading")fail("focus only permitted on heading");
  if(step.kind==="type"){
    if(target.kind!=="input"||typeof step.text!=="string"||!step.text||step.text.length>80||
      /[\r\n\t]/.test(step.text))fail("unapproved input");
  }
  if(step.kind==="click"&&!["anchor","button"].includes(target.kind))fail("unsafe click target");
  total+=step.seconds;
 }
 if(total>64||total<8)fail("film duration outside Motion bounds");
 return {actions:plan.length,duration:Number(total.toFixed(3)),fps:FPS,frames:Math.round(total*FPS)};
}
export function assertSafeClick(target,observation){
 if(!target||target.kind==="input"||target.kind==="heading")fail("not a clickable read-only control");
 if(!observation?.visible||!observation?.enabled)fail("target unavailable");
 if(target.kind==="anchor"){
   if(observation.tag!=="A"||observation.href!==target.href||!/^#[a-z0-9-]+$/i.test(observation.href))
      fail("navigation was redirected or target changed");
 }else if(target.kind==="button"){
   if(observation.tag!=="BUTTON"||observation.type!=="button"||observation.insideForm===true)
      fail("button could submit a form");
 }
 return true;
}
export function smooth(t){
 const v=Math.max(0,Math.min(1,Number.isFinite(t)?t:0));
 return v*v*(3-2*v);
}
export function createCinematicProject({duration,mediaId=TAKE_ID,brand="promptence"}={}){
 if(brand!=="promptence"||!Number.isFinite(duration)||duration<32)
  fail("need a source take >=32s with verified Promptence footage");
 const headlines=[
  ["BEFORE THEY FIND YOU","THEY ASK AI.","What happens when AI shapes the shortlist?"],
  ["THE FIRST MOVE","OPEN A REAL FREE CHECK.","Recorded browser navigation, not a mockup."],
  ["ONE WEBSITE","ENTER YOUR DOMAIN.","The actual public input, no submitted scan."],
  ["SET THE CONTEXT","NAME YOUR COMPANY.","Record the real controls of Promptence."],
  ["MAKE IT RELEVANT","ADD YOUR MARKET.","Measure in the context that matters."],
  ["GO DEEPER","DEFINE THE CATEGORY.","The real Promptence intake experience."],
  ["TWO DIFFERENT LENSES","EXPLORE LOCAL AI.","Switch the live measurement mode."],
  ["FROM QUESTION TO EVIDENCE","SEE THE PRODUCT FLOW.","Explore the public evidence system."]
 ];
 return {version:1,brand,format:"portrait",language:"en",style:"cinematic",qualityMode:"signature",filmChrome:"clean",
  title:"PROMPTENCE / INTERACTION CINEMA / REAL CLICKS",seed:2026101107,
  visual:{motion:.48,textScale:.9,contrast:.5,glow:.03},
  scenes:headlines.map(([eyebrow,headline,support],i)=>({
   id:"scene-"+(i+1),kind:"screen",seconds:4,eyebrow,headline,support,
   mediaId,mediaStart:i*4,sourceLayout:"theater",sourceZoomStart:1,sourceZoomEnd:1.035,
   sourceFocusX:.5,sourceFocusY:.5,transition:"cut",camera:"locked",titleTreatment:"minimal",
   typographyScale:.83,voiceCue:headline
  }))};
}
