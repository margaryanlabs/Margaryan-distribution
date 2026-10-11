#!/usr/bin/env node
/**
 * Operator-workstation media contract: a fixture-only screenshot and tone WAV.
 * Does NOT create a marketing asset, use customer data or simulate AI results.
 * Requires local Next /motion/proof, Playwright Chromium and FFmpeg/ffprobe.
 */
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";

const destination=resolve("out/motion/proof-audio-contract");
await mkdir(destination,{recursive:true});
function wavTone(seconds=8.2,frequency=220){
 const rate=24000,count=Math.floor(seconds*rate);
 const buffer=Buffer.alloc(44+count*2);
 buffer.write("RIFF",0);
 buffer.writeUInt32LE(buffer.length-8,4);buffer.write("WAVEfmt ",8);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);
 buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);
 buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);
 buffer.writeUInt16LE(16,34);buffer.write("data",36);
 buffer.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++){
  const t=i/rate;
  const env=Math.min(1,t/.07)*Math.min(1,Math.max(0,(seconds-t)/.2));
  buffer.writeInt16LE(Math.round(Math.sin(t*frequency*Math.PI*2)*0.12*env*32767),44+2*i);
 }
 return buffer;
}
const browser=await chromium.launch({headless:true});
let page;
try{
 page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const site=await page.goto("http://127.0.0.1:3000/motion/proof",{waitUntil:"domcontentloaded"});
 if(!site?.ok())throw Error("Local proof app is missing");
 const button=page.getByRole("button",{name:"EXPORT 10s REVIEW"});
 if(await button.isEnabled())throw Error("Source gate did not block export");
 const fixture=await page.evaluate(()=>{
  const c=document.createElement("canvas");c.width=1440;c.height=900;
  const ctx=c.getContext("2d");
  if(!ctx)throw Error("Fixture canvas not available");
  ctx.fillStyle="#f5f5f5";ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle="#0a2117";ctx.font="bold 80px Arial";
  ctx.fillText("TEST FIXTURE - NOT AN AD",90,190);
  ctx.fillStyle="#555";ctx.font="42px Arial";
  ctx.fillText("No client data or AI response",90,320);
  return c.toDataURL("image/png").split(",")[1];
 });
 await page.locator('[data-testid="proof-source-input"]').setInputFiles({
  name:"source-test-fixture.png",mimeType:"image/png",buffer:Buffer.from(fixture,"base64")
 });
 await page.waitForFunction(()=>window.__motionProofReady===true);
 await page.locator('[data-testid="proof-voice-input"]').setInputFiles({
  name:"voice-contract-test.wav",mimeType:"audio/wav",buffer:wavTone()
 });
 await page.getByText("voice-contract-test.wav").waitFor();
 if(!await button.isEnabled())throw Error("Review export disabled after media attach");
 const finished=page.waitForEvent("download",{timeout:75000});
 await button.click();
 const download=await finished;
 const media=resolve(destination,"proof-audio-contract.webm");
 await download.saveAs(media);
 if(errors.length)throw Error("Browser JS failed: "+errors.slice(0,3).join("; "));
 const result=spawnSync("ffprobe",["-v","error","-show_entries",
  "stream=codec_type,codec_name,width,height","-show_entries","format=duration",
  "-of","json",media],{encoding:"utf8",timeout:30000});
 if(result.status!==0)throw Error("Could not probe exported local WebM");
 const report=JSON.parse(result.stdout),streams=report.streams||[];
 const video=streams.find(s=>s.codec_type==="video");
 const audio=streams.find(s=>s.codec_type==="audio");
 if(!video||!audio)throw Error("Expected BOTH video and human-source fixture audio stream");
 if(video.width!==540||video.height!==960)throw Error("Review must be native 540x960");
 if(!Number.isFinite(Number(report.format.duration))||Number(report.format.duration)<9.6)throw Error("Export too short");
 const measurement=spawnSync("ffmpeg",["-hide_banner","-v","info","-i",media,
  "-vn","-af","volumedetect","-f","null","-"],{encoding:"utf8",timeout:40000,maxBuffer:400000});
 const dbMatch=measurement.stderr?.match(/mean_volume:\s*(-?[0-9.]+) dB/);
 const meanDb=dbMatch?Number(dbMatch[1]):null;
 if(meanDb!==null&&meanDb< -55)throw Error("Export audio is effectively silent");
 const summary={
  source:"internal synthetic test fixture (NEVER PUBLISH)",format:"webm",
  duration:report.format.duration,width:video.width,height:video.height,
  audioCodec:audio.codec_name,audioMeanDb:meanDb,passed:true,
  note:"Technical export contract only, never quality/craft/natural voice approval."
 };
 await writeFile(resolve(destination,"proof-audio-contract-report.json"),JSON.stringify(summary,null,2)+"\n");
 process.stdout.write(JSON.stringify(summary,null,2)+"\n");
}finally{await browser.close();}
