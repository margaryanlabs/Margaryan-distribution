#!/usr/bin/env node
/**
 * Real browser interaction footage for Margaryan Motion Studio.
 * Actual Playwright pointer movement, safe clicks, form typing and scrolling.
 * No AI provider, no external video engine, no scan submission, no login.
 * Each recorded frame comes from the real public Promptence website.
 *
 * npm run motion:interaction -- --out out/motion/promptence-interaction
 *
 * Outputs original H.264 take, edit-ready Motion JSON, media map, evidence
 * manifest, and SRT of actions (not claimed to be spoken captions).
 */
import {mkdir,writeFile,readFile,stat,unlink} from "node:fs/promises";
import {createHash} from "node:crypto";
import {createReadStream} from "node:fs";
import {spawn,spawnSync} from "node:child_process";
import {once} from "node:events";
import {join,resolve} from "node:path";
import {clearPublicOnboarding} from "./source-capture-gates.mjs";
import {FPS,PLAN,TARGETS,TAKE_ID,PUBLIC_HOST,MOTION_INTERACTION_PROTOCOL,
  validatePlan,assertSafeClick,smooth,createCinematicProject} from "./interaction-cinema-core.mjs";

const args=process.argv.slice(2);
if(args.length!==2||args[0]!=="--out"||!args[1]||args[1].startsWith("--"))
  throw Error("Usage: npm run motion:interaction -- --out out/motion/promptence-interaction");
const output=resolve(args[1]);
const filmPath=join(output,"promptence-real-clicks.mp4");
const info=validatePlan();
if(spawnSync("ffmpeg",["-version"]).status!==0||spawnSync("ffprobe",["-version"]).status!==0)
  throw Error("Motion Interaction Cinema requires local FFmpeg and ffprobe");
await mkdir(output,{recursive:true,mode:0o700});
const {chromium}=await import("playwright").catch(()=>{throw Error("Install Playwright on the operator workstation: npm install --no-save playwright");});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
let encoder=null,encoderLog="",successful=false;
const events=[];
const VIEW_W=1280,VIEW_H=720;
const ORIGINAL_URL="https://promptence.tech/";
const allowedHosts=new Set([PUBLIC_HOST,"fonts.googleapis.com","fonts.gstatic.com"]);
function targetLocator(page,spec){
 if(spec.mode==="heading")return page.getByRole("heading",{name:spec.value,exact:true}).first();
 if(spec.mode==="button")return page.getByRole("button",{name:new RegExp("^"+spec.value+"\\b")}).first();
 return page.locator(spec.value).first();
}
async function pointer(page,x,y,pulse=0){
 await page.mouse.move(x,y);
 await page.evaluate(({x,y,pulse})=>{
   const el=document.getElementById("__motion_cinema_pointer");
   if(!el)throw Error("Interaction pointer lost from original page");
   el.style.left=x+"px";el.style.top=y+"px";
   const ripple=el.querySelector(".motion_cinema_ripple");
   ripple.style.width=(24+70*pulse)+"px";
   ripple.style.height=(24+70*pulse)+"px";
   ripple.style.opacity=String(pulse>0?Math.max(0,.82-pulse*.8):0);
 },{x,y,pulse});
}
async function sha(file){
 const hash=createHash("sha256");
 for await(const bytes of createReadStream(file))hash.update(bytes);
 return hash.digest("hex");
}
try{
 const context=await browser.newContext({viewport:{width:VIEW_W,height:VIEW_H},
   deviceScaleFactor:1,locale:"en-US",timezoneId:"UTC",reducedMotion:"reduce",
   acceptDownloads:false,serviceWorkers:"block",storageState:{cookies:[],origins:[]}});
 const page=await context.newPage();
 page.setDefaultTimeout(9000);
 await page.route("**/*",route=>{
   const req=route.request();
   let url;
   try{url=new URL(req.url());}catch{return route.abort();}
   if(url.protocol!=="https:"||!allowedHosts.has(url.hostname.toLowerCase())||
      ["websocket","eventsource"].includes(req.resourceType()))return route.abort();
   return route.continue();
 });
 const response=await page.goto(ORIGINAL_URL,{waitUntil:"domcontentloaded",timeout:45000});
 if(!response?.ok()||new URL(page.url()).hostname!==PUBLIC_HOST)
   throw Error("INTERACTION BLOCKED: official public host unavailable or redirected");
 const tour=await clearPublicOnboarding(page,"promptence");
 await page.evaluate(()=>document.fonts.ready);
 await page.addStyleTag({content:"*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}html{scroll-behavior:auto!important}"});
 await page.evaluate(()=>{
   const css=document.createElement("style");
   css.textContent='#__motion_cinema_pointer{position:fixed;width:18px;height:24px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-3px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.7))}#__motion_cinema_pointer .motion_cinema_ripple{position:absolute;left:5px;top:5px;transform:translate(-50%,-50%);border:3px solid #4ee6a1;border-radius:50%;box-shadow:0 0 25px #4ee6a1;opacity:0}#__motion_cinema_pointer svg{position:absolute;left:0;top:0;width:18px;height:24px;fill:#fff;stroke:#0d1b18;stroke-width:2.2;paint-order:stroke}';
   document.head.appendChild(css);
   const root=document.createElement("div");root.id="__motion_cinema_pointer";root.innerHTML='<div class="motion_cinema_ripple"></div><svg viewBox="0 0 18 24" aria-hidden="true"><path d="M2 2 L2 20 L6.8 15.9 L10.4 23 L13.8 21.3 L10.3 14.6 L16.9 14 Z"/></svg>';
   document.body.appendChild(root);
   document.documentElement.style.scrollBehavior="auto";
 });
 encoder=spawn("ffmpeg",["-y","-hide_banner","-loglevel","error","-f","image2pipe",
   "-framerate",String(FPS),"-vcodec","png","-i","pipe:0","-c:v","libx264",
   "-preset","fast","-crf","19","-pix_fmt","yuv420p","-r",String(FPS),
   "-movflags","+faststart",filmPath],{stdio:["pipe","ignore","pipe"]});
 encoder.stderr.on("data",buf=>{encoderLog=(encoderLog+String(buf)).slice(-6000);});
 encoder.stdin.on("error",()=>{});
 let last={x:1000,y:550},frameNo=0;
 for(const step of PLAN){
   const spec=TARGETS[step.target],locator=targetLocator(page,spec);
   await locator.waitFor({state:"visible",timeout:11000});
   const initialY=await page.evaluate(()=>scrollY);
   const bounds=await locator.boundingBox();
   if(!bounds||bounds.width<12||bounds.height<10)throw Error("INTERACTION BLOCKED: unreadable target "+step.id);
   const scrollHeight=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
   const plannedScroll=Math.max(0,Math.min(scrollHeight,initialY+bounds.y-(VIEW_H*.56-bounds.height/2)));
   const frames=Math.round(step.seconds*FPS);
   let executed=false,typeChars=-1,currentPoint={...last};
   for(let i=0;i<frames;i++){
     const t=(i+.5)/frames;
     const scrollT=smooth(Math.min(1,t/.38));
     const targetScroll=initialY+(plannedScroll-initialY)*scrollT;
     if(t<.4)await page.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}),targetScroll);
     const box=await locator.boundingBox();
     if(!box)throw Error("INTERACTION BLOCKED: real target disappeared during "+step.id);
     const x=Math.max(10,Math.min(VIEW_W-10,box.x+Math.min(box.width*.58,box.width-12)));
     const y=Math.max(15,Math.min(VIEW_H-15,box.y+box.height/2));
     const glide=smooth(Math.min(1,Math.max(0,(t-.15)/.49)));
     const p={x:last.x+(x-last.x)*glide,y:last.y+(y-last.y)*glide};
     currentPoint=p;
     if(t>=.66&&!executed){
       if(await page.locator(".promptence-tour-overlay").isVisible())
         throw Error("INTERACTION BLOCKED: onboarding reappeared");
       if(new URL(page.url()).hostname!==PUBLIC_HOST)
         throw Error("INTERACTION BLOCKED: external navigation");
       if(step.kind==="click"){
         const observed=await locator.evaluate(el=>({
           tag:el.tagName,type:el instanceof HTMLButtonElement?el.type:"",
           href:el.getAttribute("href"),insideForm:!!el.closest("form"),
           visible:!!el.getClientRects().length,enabled:!el.hasAttribute("disabled")
         }));
         assertSafeClick(spec,observed);
         await locator.click({timeout:7000});
       }
       if(step.kind==="type"){
         const safe=await locator.evaluate(el=>el.tagName==="INPUT"&&el.type==="text"&&
           !el.disabled&&!el.readOnly&&!el.closest("form[action]"));
         if(!safe)throw Error("INTERACTION BLOCKED: invalid public demo input");
         // A visually typed value is never submitted, billed or stored remotely.
         await locator.fill("");
       }
       executed=true;
       events.push({action:step.id,kind:step.kind,target:step.target,
         timestampSeconds:Number((frameNo/FPS).toFixed(3)),source:"live-browser",
         publicReadOnly:true,submitted:false});
     }
     if(executed&&step.kind==="type"){
       const typing=Math.max(0,Math.min(1,(t-.66)/.27));
       const count=Math.floor(step.text.length*typing);
       if(count!==typeChars){
         await locator.fill(step.text.slice(0,count));
         typeChars=count;
       }
     }
     const rip=executed&&step.kind==="click"?Math.max(0,Math.min(1,(t-.66)/.3)):0;
     await pointer(page,currentPoint.x,currentPoint.y,rip);
     if(encoder.exitCode!==null)throw Error("FFmpeg stopped during "+step.id+": "+encoderLog);
     const screenshot=await page.screenshot({type:"png",animations:"disabled",fullPage:false});
     if(screenshot.length<1200)throw Error("INTERACTION BLOCKED: empty source screenshot");
     if(!encoder.stdin.write(screenshot))await once(encoder.stdin,"drain");
     frameNo++;
   }
   last=currentPoint;
   process.stdout.write("Interaction verified: "+step.id+" ("+step.kind+")\n");
 }
 encoder.stdin.end();
 const [code]=await once(encoder,"close");
 if(code!==0)throw Error("Interaction encoder failed: "+encoderLog);
 const probe=spawnSync("ffprobe",["-v","error","-show_entries",
   "stream=codec_name,codec_type,width,height","-show_entries","format=duration","-of","json",filmPath],
   {encoding:"utf8"});
 if(probe.status!==0)throw Error("Interaction MP4 probe failed");
 const result=JSON.parse(probe.stdout);
 const v=result.streams.find(s=>s.codec_type==="video");
 if(v?.codec_name!=="h264"||v.width!==VIEW_W||v.height!==VIEW_H)
   throw Error("Interaction master codec/size mismatch");
 const duration=Number(result.format?.duration);
 if(!Number.isFinite(duration)||Math.abs(duration-info.duration)>.2)
   throw Error("Interaction master duration differs from planned real actions");
 const project=createCinematicProject({duration});
 const mediaMap={[TAKE_ID]:filmPath};
 const evidence={schema:MOTION_INTERACTION_PROTOCOL,
   brand:"promptence",sourceUrl:ORIGINAL_URL,createdAt:new Date().toISOString(),
   capturedFromRealBrowser:true,firstVisitOnboardingHandled:tour,
   viewport:{width:VIEW_W,height:VIEW_H},fps:FPS,frames:frameNo,duration,
   originalVideo:{filename:"promptence-real-clicks.mp4",sha256:await sha(filmPath)},
   events,performedActions:events.length,providerAPIsUsed:false,
   readOnly:true,submitPrevented:true,privacy:"public site only; locally captured",
   mediaId:TAKE_ID,
   approval:{status:"PENDING_HUMAN_REVIEW",sourceRights:false,privacyReviewed:false,
     copyAndProductTruthReviewed:false,voiceReviewed:false,musicReviewed:false},
   note:"Actual browser control clicks, no submitted live scans, no genuine AI response/results captured. Source video must be reattached. Master is a draft, not a certified commercial."};
 await Promise.all([
   writeFile(join(output,"interaction-evidence.json"),JSON.stringify(evidence,null,2)+"\n",{mode:0o600}),
   writeFile(join(output,"interaction-film.motion.json"),JSON.stringify(project,null,2)+"\n",{mode:0o600}),
   writeFile(join(output,"interaction-media-map.json"),JSON.stringify(mediaMap,null,2)+"\n",{mode:0o600})
 ]);
 successful=true;
 process.stdout.write("MOTION INTERACTION CINEMA: "+events.length+" real actions | "+duration+"s | 1280x720 H.264\n");
 process.stdout.write("Actual video: "+filmPath+"\nEdit-ready Motion project: "+join(output,"interaction-film.motion.json")+"\n");
}finally{
 if(encoder&&encoder.exitCode===null)encoder.kill("SIGTERM");
 await browser.close().catch(()=>undefined);
 if(!successful)await unlink(filmPath).catch(()=>{});
}
