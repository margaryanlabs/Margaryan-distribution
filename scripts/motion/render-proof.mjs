#!/usr/bin/env node
/**
 * SOURCE-FIRST PROOF DIRECTOR / deterministic 10-second native MP4.
 * Offline workstation only. No fake UI, no Flite/TTS, no automatic uploads.
 *
 * Requires: local Next Motion OS at http://127.0.0.1:3000/motion/proof,
 * Playwright Chromium, FFmpeg, owner-approved screenshot file.
 *
 * npm run motion:proof -- --screen ./approved/promptence-public.png \
 *   --out ./out/promptence-proof-10s.mp4 --voice ./approved/voice.wav
 */
import {readFile,writeFile,stat,mkdir} from "node:fs/promises";
import {spawn,spawnSync} from "node:child_process";
import {dirname,resolve,extname} from "node:path";
import {once} from "node:events";
import process from "node:process";

const args=process.argv.slice(2),o={};
for(let i=0;i<args.length;i++){
 const k=args[i];
 if(!["--screen","--video","--out","--voice","--music","--url","--fps"].includes(k))throw Error("Unknown argument: "+k);
 const v=args[++i];if(!v||v.startsWith("--"))throw Error("Missing value for "+k);
 o[k.slice(2)]=v;
}
if(Boolean(o.screen)===Boolean(o.video))throw Error("SOURCE GATE: supply exactly one approved --screen IMAGE or --video MP4/WEBM");
const source=resolve(o.video||o.screen);
const isVideo=Boolean(o.video);
const out=resolve(o.out||"out/promptence-proof-10s.mp4");
if(extname(out).toLowerCase()!==".mp4")throw Error("Output must end .mp4");
const host=new URL(o.url||"http://127.0.0.1:3000/motion/proof");
if(host.protocol!=="http:"||!["localhost","127.0.0.1","[::1]"].includes(host.hostname)
 ||host.pathname!=="/motion/proof")throw Error("Proof Studio must be served locally at /motion/proof");
const fps=o.fps?Number(o.fps):30;
if(!Number.isInteger(fps)||fps<24||fps>30)throw Error("Use 24–30 frames/s");
const run=(exe,argv,timeout=90_000)=>spawnSync(exe,argv,{encoding:"utf8",maxBuffer:2_000_000,timeout});
const f=await stat(source);
const validExt=isVideo?[".mp4",".webm"]:[".png",".jpg",".jpeg",".webp"];
if(!f.isFile()||f.size<100||f.size>(isVideo?180_000_000:12_000_000)
  ||!validExt.includes(extname(source).toLowerCase())){
 throw Error("Source must be approved MP4/WebM (<180 MB) or screenshot PNG/JPEG/WebP (<12 MB)");
}
if(isVideo){
 const decoded=run("ffprobe",["-v","error","-show_entries","format=duration",
   "-show_entries","stream=codec_type,width,height","-of","json",source]);
 if(decoded.status!==0)throw Error("Real source video is unreadable");
 const meta=JSON.parse(decoded.stdout);
 const track=meta.streams?.find(x=>x.codec_type==="video");
 if(!track||track.width<720||track.height<480||Number(meta.format?.duration)<8||Number(meta.format?.duration)>300){
   throw Error("Real source clip requires 8–300s and at least 720×480 decoded frames.");
 }
}

if(run("ffmpeg",["-version"]).status!==0)throw Error("FFmpeg is not installed");
for(const asset of [o.music,o.voice].filter(Boolean)){
 const f=await stat(resolve(asset));
 if(!f.isFile()||f.size<100||f.size>100_000_000)throw Error("Invalid approved audio file: "+asset);
}
if(o.voice){
 const v=run("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",resolve(o.voice)]);
 const d=Number(v.stdout?.trim());
 if(v.status!==0||!Number.isFinite(d)||d>9.7)throw Error("Narration must fit naturally under 9.7 seconds. Never speed up a robotic voice.");
}
await mkdir(dirname(out),{recursive:true});
const {chromium}=await import("playwright").catch(()=>{throw Error("Install local Playwright: npm install --no-save playwright");});
let browser,encoder;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(host.href,{waitUntil:"domcontentloaded",timeout:45000});
 if(!response?.ok())throw Error("Proof Studio unavailable: HTTP "+response?.status());
 await page.locator('[data-testid="proof-source-input"]').setInputFiles(source);
 await page.waitForFunction(expected=>window.__motionProofReady===true&&window.__motionProofSource===expected,isVideo?"video":"image",{timeout:40000});
 await page.evaluate(()=>document.fonts.ready);
 if(errors.length)throw Error("Studio page errors: "+errors.join("; "));
 const audio=[o.voice?{path:resolve(o.voice),volume:1}:null,o.music?{path:resolve(o.music),volume:o.voice?.18:.75}:null].filter(Boolean);
 const ff=["-y","-hide_banner","-loglevel","error","-f","image2pipe","-framerate",String(fps),
   "-vcodec","png","-i","pipe:0"];
 for(const a of audio)ff.push("-i",a.path);
 if(audio.length){
  // Natural source recording only. The chain cleans sub-bass/ultrahigh hiss,
  // normalizes dialog loudness and keeps a controlled score underneath.
  // No time stretching, robotic TTS fallback, pitch shifting or auto dubbing.
  const stages=[];
  if(o.voice){
    stages.push("[1:a:0]highpass=f=75,lowpass=f=14500,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=0:10[voice]");
    if(o.music){
      stages.push("[2:a:0]volume=0.14,apad,atrim=0:10[score]");
      stages.push("[voice][score]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=11[mixed]");
    } else stages.push("[voice]anull[mixed]");
  }else stages.push("[1:a:0]loudnorm=I=-18:TP=-1.5:LRA=11,apad,atrim=0:10[mixed]");
  ff.push("-filter_complex",stages.join(";"),"-map","0:v:0","-map","[mixed]","-c:a","aac","-b:a","192k");
 } else ff.push("-an");
 ff.push("-c:v","libx264","-pix_fmt","yuv420p","-preset","medium","-crf","18","-r",String(fps),
   "-t","10","-movflags","+faststart",out);
 encoder=spawn("ffmpeg",ff,{stdio:["pipe","ignore","pipe"]});
 let log="";
 encoder.stderr.on("data",buf=>{log=(log+String(buf)).slice(-4000);});
 encoder.stdin.on("error",()=>{});
 const frames=10*fps;
 for(let i=0;i<frames;i++){
  if(encoder.exitCode!==null)throw Error("FFmpeg stopped: "+log);
  const data=await page.evaluate(t=>window.__motionProofFrame(t),i/fps);
  const bytes=Buffer.from(data,"base64");
  if(bytes.length<1000)throw Error("Missing rendered source frame "+i);
  if(!encoder.stdin.write(bytes))await once(encoder.stdin,"drain");
 }
 encoder.stdin.end();
 const [status]=await once(encoder,"close");
 if(status!==0)throw Error("FFmpeg exited "+status+": "+log);
 const probe=run("ffprobe",["-v","error","-show_entries","stream=codec_type,codec_name,width,height",
  "-show_entries","format=duration","-of","json",out]);
 if(probe.status!==0)throw Error("Cannot probe final MP4");
 const info=JSON.parse(probe.stdout),video=info.streams?.find(s=>s.codec_type==="video"),audioTrack=info.streams?.find(s=>s.codec_type==="audio");
 const d=Number(info.format?.duration);
 if(!video||video.codec_name!=="h264"||video.width!==1080||video.height!==1920||Math.abs(d-10)>.1)throw Error("Incorrect source-native master format");
 if(audio.length&&!audioTrack)throw Error("Audio was supplied but stream is missing");
 const prefix=out.slice(0,-4);
 const sheet=run("ffmpeg",["-y","-v","error","-i",out,"-vf","fps=1,scale=270:-2,tile=5x2:padding=6:margin=6:color=0x101917",
  "-frames:v","1",prefix+"-contact-sheet.png"],120000);
 await writeFile(prefix+".proof-report.json",JSON.stringify({
   engine:"SOURCE-FIRST PROOF DIRECTOR",duration:d,width:video.width,height:video.height,
   fps,sourceFile:source,sourceType:isVideo?'actual-browser-video':'owner-supplied-screenshot',voiceProvided:Boolean(o.voice),musicProvided:Boolean(o.music),audioMaster:"licensed-source-only / loudnorm dialogue -16 LUFS target / no time stretch",
   contactSheetCreated:sheet.status===0,sourceReviewRequired:true,humanCreativeApprovalRequired:true,
   note:"Codec and source-authenticity gates cannot judge cinematic quality or voice performance."
 },null,2)+"\n");
 process.stdout.write("Proof MP4 encoded and probed: "+out+"\nSource-based visual review REQUIRED before publication.\n");
} finally{
 if(encoder&&encoder.exitCode===null)encoder.kill("SIGTERM");
 if(browser)await browser.close().catch(()=>undefined);
}
