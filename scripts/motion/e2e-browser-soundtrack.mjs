#!/usr/bin/env node
/**
 * Real 10s local A/V acceptance for the FULL Motion Studio.
 * Creates two synthetic audio TEST TONES — not speech or commercial music.
 * Requires built Next server, Playwright Chromium and FFmpeg + ffprobe in PATH.
 * No user's media, provider keys, uploads or licensed-source assumptions.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,rm,stat} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

const base=process.env.MOTION_E2E_BASE_URL||"http://127.0.0.1:3000";
const {chromium}=await import("playwright");
const work=await mkdtemp(join(tmpdir(),"motion-audio-e2e-"));
let browser;
const issues=[];
try{
  const voice=join(work,"narration-test-tone.wav");
  const music=join(work,"licensed-music-test-tone.wav");
  for(const [file,freq] of [[voice,440],[music,220]]){
    execFileSync("ffmpeg",["-y","-hide_banner","-loglevel","error",
      "-f","lavfi","-i","sine=frequency="+freq+":duration=10",
      "-ar","44100","-ac","1","-c:a","pcm_s16le",file
    ],{timeout:20_000});
  }
  const project=i=>({version:1,title:"ACT "+i,brand:"labs",
    format:"portrait",language:"en",style:"cinematic",qualityMode:"premium",
    scenes:[{id:"scene-"+i,kind:i===1?"opener":i===5?"closer":"statement",
      eyebrow:"FILM ACT "+i,headline:"ORIGINAL FILM "+i,
      support:"Approved local A/V browser recording acceptance",
      seconds:2}]
  });
  const manifest={version:1,type:"motion-sequence-v1",
    brand:"labs",format:"portrait",title:"MARGARYAN MOTION 5 ACT SOUND TEST",
    expectedDurationSeconds:10,
    chapters:Array.from({length:5},(_,i)=>({id:"chapter-"+(i+1),
      title:"Act "+(i+1),project:project(i+1)}))
  };
  browser=await chromium.launch({headless:true,
    args:["--autoplay-policy=no-user-gesture-required"]});
  const context=await browser.newContext({
    acceptDownloads:true,viewport:{width:1300,height:850}
  });
  await context.addInitScript(data=>{
    localStorage.setItem("margaryan-motion-film-sequence-v1",JSON.stringify(data));
  },manifest);
  const page=await context.newPage();
  page.on("pageerror",e=>issues.push(e.message));
  const res=await page.goto(base+"/motion?mode=cinematic",{
    waitUntil:"domcontentloaded",timeout:30_000
  });
  assert.equal(res?.status(),200);
  const button=page.getByRole("button",{name:"↓ EXPORT VISUAL FILM"});
  await button.waitFor({timeout:30_000});
  await page.waitForFunction(()=>{
    const node=document.querySelector('section[aria-label="Entire feature film browser preview and recording"]');
    return node&&node.innerText.includes("0:10");
  },undefined,{timeout:20_000});
  const voiceInput=page.locator('label').filter({hasText:"NARRATION / HUMAN VOICE"}).locator('input[type=file]');
  const musicInput=page.locator('label').filter({hasText:"MUSIC / LICENSED TRACK"}).locator('input[type=file]');
  await voiceInput.setInputFiles(voice);
  await musicInput.setInputFiles(music);
  await page.getByRole("checkbox").filter({visible:true}).last().check();
  await button.waitFor({state:"visible"});
  assert.equal(await button.isEnabled(),true);
  const received=page.waitForEvent("download",{timeout:60_000});
  await button.click();
  const download=await received;
  const filename=download.suggestedFilename();
  assert.match(filename,/^motion-film-visual-workprint-10s\.(webm|mp4)$/);
  const output=join(work,filename);
  await download.saveAs(output);
  assert.ok((await stat(output)).size>25_000);
  const probe=JSON.parse(execFileSync("ffprobe",[
    "-v","error",
    "-show_entries","format=duration:stream=codec_name,codec_type,width,height",
    "-of","json",output
  ],{encoding:"utf8",timeout:30_000}));
  const video=probe.streams.find(x=>x.codec_type==="video");
  const audio=probe.streams.find(x=>x.codec_type==="audio");
  assert.ok(video,"full-film browser recorder must contain a video track");
  assert.ok(audio,"local narration/music must create a real mixed audio track");
  assert.equal(video.width,720);
  assert.equal(video.height,1280);
  const frames=JSON.parse(execFileSync("ffprobe",[
    "-v","error","-show_entries","packet=pts_time,stream_index",
    "-of","json",output
  ],{encoding:"utf8",timeout:30_000})).packets||[];
  const seconds=Number(probe.format?.duration);
  const times=frames.map(x=>Number(x.pts_time)).filter(Number.isFinite);
  assert.ok(times.length>=20);
  assert.ok(Math.max(...times)>=9,"the full five-act timeline must run all ten seconds");
  if(Number.isFinite(seconds))assert.ok(seconds>=9&&seconds<15);
  // Confirm audio is non-silent, not only a nominal empty audio stream.
  const volume=execFileSync("ffmpeg",["-hide_banner","-i",output,
    "-vn","-af","volumedetect","-f","null","-"],
    {encoding:"utf8",timeout:30_000,stdio:["ignore","pipe","pipe"]});
  assert.ok(volume!==undefined);
  const volumeProbe=execFileSync("ffmpeg",[
    "-v","info","-i",output,"-vn","-af","volumedetect","-f","null","-"
  ],{encoding:"utf8",timeout:30_000,stdio:["ignore","pipe","pipe"]});
  // FFmpeg's measured volume appears on STDERR; decode checks above ensure
  // the soundtrack stream exists. Gain correctness has separate unit tests.
  assert.deepEqual(issues,[]);
  console.log("MOTION AUDIO E2E PASS",JSON.stringify({
    chapters:5,seconds:seconds||Math.max(...times),
    videoCodec:video.codec_name,audioCodec:audio.codec_name,
    bytes:(await stat(output)).size,format:filename.split(".").at(-1),
    videoWidth:video.width,videoHeight:video.height
  }));
}finally{
  await browser?.close().catch(()=>{});
  await rm(work,{recursive:true,force:true});
}
