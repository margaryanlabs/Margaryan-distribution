#!/usr/bin/env node
/**
 * REAL binary acceptance: 5 authored chapters -> embedded ChatGPT Canvas ->
 * MediaRecorder download -> independent FFprobe runtime/codec verification.
 * Run against a built Next app on MOTION_E2E_BASE_URL, with Playwright
 * Chromium and ffmpeg installed. No credentials or private media.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const base=process.env.MOTION_E2E_BASE_URL||"http://127.0.0.1:3000";
const expectedSeconds=Number(process.env.MOTION_E2E_SECONDS||10);
if(![10,120,300].includes(expectedSeconds))throw Error("MOTION_E2E_SECONDS must be 10, 120 or 300");
const scenesPerAct=expectedSeconds===10?1:8;
const shotSeconds=expectedSeconds===10?2:expectedSeconds===120?3:7.5;
const fifthActOffset=expectedSeconds*4/5+.1;
const playwright=await import("playwright");
const browser=await playwright.chromium.launch({
  headless:true,args:["--autoplay-policy=no-user-gesture-required"]
});
const directory=await mkdtemp(join(tmpdir(),"motion-inline-e2e-"));
const issues=[];
const chapters=Array.from({length:5},(_,i)=>({
  version:1,title:"ACT "+(i+1),brand:"labs",format:"portrait",
  language:"en",style:"cinematic",qualityMode:"premium",
  scenes:Array.from({length:scenesPerAct},(_,j)=>({
    id:"scene-"+(j+1),kind:i===0&&j===0?"opener":i===4&&j===scenesPerAct-1?"closer":"statement",
    eyebrow:"CHAPTER "+(i+1),
    headline:"ORIGINAL CHAPTER "+(i+1)+" SHOT "+(j+1),
    support:"Real source-independent Canvas proof — chapter "+(i+1),
    seconds:shotSeconds
  }))
}));
try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:450,height:820}});
  const page=await context.newPage();
  page.on("pageerror",e=>issues.push(e.message));
  const response=await page.goto(base+"/motion/chat-preview",{waitUntil:"domcontentloaded",timeout:30_000});
  assert.equal(response?.status(),200,"first-party preview should be HTTP 200");
  const exportButton=page.getByRole("button",{name:"↓ EXPORT WHOLE FILM"});
  await exportButton.waitFor({timeout:20_000});
  await page.locator('main[data-motion-preview-hydrated="true"]').waitFor({timeout:20_000});
  await page.evaluate(projects=>window.postMessage({
    kind:"margaryan-motion-preview-v1",projects
  },window.location.origin),chapters);
  await page.evaluate(seconds=>{window.__motionExpectedSeconds=seconds;},expectedSeconds);
  await page.waitForFunction(()=>{
    const input=document.querySelector('input[aria-label="Film playhead"]');
    return input&&Number(input.max)===window.__motionExpectedSeconds&&!input.disabled;
  },undefined,{timeout:20_000});
  assert.ok(await page.getByText(/5 ACTS/).count(),"one film with five acts");
  // A chapter seek may be issued by the parent MCP widget without replacing
  // the film; the export later resets the playhead to the first act.
  await page.evaluate(seconds=>window.postMessage({kind:"margaryan-motion-seek-v1",seconds},"*"),fifthActOffset);
  await page.evaluate(seconds=>{window.__motionFifthActOffset=seconds;},fifthActOffset);
  await page.waitForFunction(()=>{
    const el=document.querySelector('input[aria-label="Film playhead"]');
    return el&&Math.abs(Number(el.value)-window.__motionFifthActOffset)<.1;
  },undefined,{timeout:4_000});
  const canvas=page.locator("canvas");
  assert.equal(await canvas.getAttribute("width"),"720");
  assert.equal(await canvas.getAttribute("height"),"1280");
  const downloadPromise=page.waitForEvent("download",{timeout:(expectedSeconds+50)*1000});
  await exportButton.click();
  const downloaded=await downloadPromise;
  const filename=downloaded.suggestedFilename();
  assert.match(filename,new RegExp("^margaryan-content-studio-labs-"+expectedSeconds+"s\\.(webm|mp4)$"));
  const path=join(directory,filename);
  await downloaded.saveAs(path);
  const details=await stat(path);
  assert.ok(details.size>5_000,"real recorded film cannot be an empty stub");
  assert.ok(details.size<120_000_000,"browser export safety limit");
  const probe=JSON.parse(execFileSync("ffprobe",[
    "-v","error","-show_entries","format=duration,size",
    "-show_entries","stream=codec_type,codec_name,width,height",
    "-of","json",path
  ],{encoding:"utf8",timeout:30_000}));
  const video=probe.streams.find(x=>x.codec_type==="video");
  assert.ok(video,"export must contain a decodable video stream");
  assert.equal(video.width,720);
  assert.equal(video.height,1280);
  // WebM MediaRecorder can omit duration metadata; check video packet pts.
  const packets=JSON.parse(execFileSync("ffprobe",[
    "-v","error","-select_streams","v:0",
    "-show_entries","packet=pts_time",
    "-of","json",path
  ],{encoding:"utf8",timeout:30_000}));
  const times=(packets.packets||[])
    .map(x=>Number(x.pts_time)).filter(Number.isFinite);
  assert.ok(times.length>=35,"at least 35 actual encoded video packets");
  const last=Math.max(...times);
  assert.ok(last>=expectedSeconds-1&&last<=expectedSeconds+5,
    "expected "+expectedSeconds+"s continuous five-act recording; actual last video timestamp "+last);
  assert.deepEqual(issues,[],"preview should have no uncaught browser errors");
  console.log("MOTION CHATGPT E2E PASS",JSON.stringify({
    chapters:5,expectedSeconds,actualLastFrameSeconds:last,
    width:video.width,height:video.height,codec:video.codec_name,
    fileBytes:details.size,format:filename.split(".").pop()
  }));
}finally{
  await browser.close();
  await rm(directory,{recursive:true,force:true});
}
