#!/usr/bin/env node
// 10-second real browser capture from the official public Promptence landing.
// Operator-only. Save locally, then review and import into Motion Quick Studio.
import {mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {once} from "node:events";
const target=resolve(process.argv[2]||"out/motion/screens/promptence-actual.mp4");
if(!target.endsWith(".mp4"))throw Error("Output must be MP4");
if(spawnSync("ffmpeg",["-version"]).status!==0)throw Error("FFmpeg unavailable");
const {chromium}=await import("playwright");
await mkdir(dirname(target),{recursive:true});
const browser=await chromium.launch({headless:true});
let encoder;
try{
 const page=await browser.newPage({viewport:{width:540,height:960},deviceScaleFactor:2,locale:"en-US"});
 const response=await page.goto("https://promptence.tech/",{waitUntil:"domcontentloaded",timeout:45000});
 if(!response?.ok()||new URL(page.url()).hostname!=="promptence.tech")throw Error("Official public page unavailable");
 await page.evaluate(()=>document.fonts.ready);
 const maxScroll=await page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight);
 encoder=spawn("ffmpeg",["-y","-hide_banner","-loglevel","error",
  "-f","image2pipe","-framerate","24","-vcodec","png","-i","pipe:0",
  "-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p",
  "-r","24","-t","10","-movflags","+faststart",target],{stdio:["pipe","ignore","pipe"]});
 let stderr="";encoder.stderr.on("data",data=>stderr=(stderr+String(data)).slice(-3000));
 encoder.stdin.on("error",()=>{});
 for(let i=0;i<240;i++){
  const t=i/24,stage=Math.min(2,Math.floor(t/3.3)),local=(t-stage*3.3)/3.3;
  const smooth=local*local*(3-2*local);
  const start=stage/3*maxScroll,end=(stage+1)/3*maxScroll;
  const y=start+(end-start)*smooth;
  await page.evaluate(y=>window.scrollTo({top:y,behavior:"instant"}),y);
  const frame=await page.screenshot({type:"png",animations:"disabled"});
  if(encoder.exitCode!==null)throw Error("Encoder failed "+stderr);
  if(!encoder.stdin.write(frame))await once(encoder.stdin,"drain");
 }
 encoder.stdin.end();
 const [code]=await once(encoder,"close");
 if(code!==0)throw Error("Encode failed "+stderr);
 const check=spawnSync("ffprobe",["-v","error","-show_entries","stream=width,height,codec_name",
  "-show_entries","format=duration","-of","json",target],{encoding:"utf8"});
 if(check.status!==0)throw Error("MP4 verification failed");
 const info=JSON.parse(check.stdout);
 if(info.streams?.[0]?.width!==1080||info.streams?.[0]?.height!==1920)throw Error("Incorrect capture size");
 process.stdout.write("Actual browser-footage asset saved: "+target+"\n");
 process.stdout.write("Review before publication. No artificial AI result inserted.\n");
}finally{if(encoder&&encoder.exitCode===null)encoder.kill("SIGTERM");await browser.close();}
