#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const source=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
function load(path,deps={}){
 const js=ts.transpileModule(source(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const module={exports:{}};
 new Function("module","exports","require",js)(module,module.exports,key=>{
  if(Object.hasOwn(deps,key))return deps[key];
  throw Error("unexpected module import: "+key);
 });
 return module.exports;
}
const audio=load("lib/motion/timeline-edit.ts");
const framing=load("lib/motion/source-composition.ts");
const motionFraming=load("lib/motion/source-composition.ts");
const motionOverlay=load("lib/motion/image-overlay.ts");
const studio=load("lib/motion/studio.ts",{
 "./timeline-edit":audio,"./source-composition":framing,"./image-overlay":motionOverlay});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
const voiceQA=load("lib/motion/voice-quality.ts");
const sine=Float32Array.from({length:48000},(_,i)=>Math.sin(i*.035)*.22);
const silence=new Float32Array(48000);
const clipping=Float32Array.from({length:48000},(_,i)=>i%4?1:-1);
const inspect=data=>voiceQA.inspectVoiceSignal({duration:1,numberOfChannels:1,
  getChannelData:()=>data});
assert.equal(inspect(sine).state,"ready");
assert.equal(inspect(silence).state,"blocked");
assert.equal(inspect(clipping).state,"blocked");
assert.ok(inspect(sine).rms>.09);
assert.ok(inspect(clipping).clippedPercent>2);
const original=studio.makeMotionPreset("promptence");
const clean=studio.sanitizeMotionProject({...original,filmChrome:"clean"});
assert.equal(clean.filmChrome,"clean");
assert.equal(studio.sanitizeMotionProject({...clean,filmChrome:"not-a-mode"}).filmChrome,"brand");
const pack=chat.createChatMotionPack(clean);
assert.equal(chat.previewChatMotionPack(pack,original).next.filmChrome,"clean");
const patch={protocol:"motion-chat-v1",action:"patch",expectedBrand:clean.brand,
 expectedTitle:clean.title,changes:[{target:"project",set:{filmChrome:"editor"}}]};
assert.equal(chat.previewChatMotionPack(patch,clean).next.filmChrome,"editor");
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[
 {target:"project",set:{filmChrome:"untrusted"}}
]},clean),/Rejected invalid/);
const film=source("lib/motion/render-engine.ts");
assert.match(film,/filmChrome==="clean"/);
assert.match(film,/filmChrome==="brand"/);
assert.match(film,/MOTION ENGINE \/ /); // technical HUD is retained for editorial-only review
const booth=source("app/motion/voice-booth.tsx");
assert.match(booth,/mediaDevices\.getUserMedia/);
assert.match(booth,/recorder\.start\(200\)/);
assert.match(booth,/recorder\.stop\(\)/);
assert.match(booth,/\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
assert.match(booth,/15_000_000/);
assert.match(booth,/active\.current=true/);
assert.ok(!booth.includes("fetch("),"Human Voice Booth must never upload audio");
assert.ok(!booth.includes("speechSynthesis"),"SpeechSynthesis voices are not a genuine narrator");
console.log("Motion director branding: clean/brand/editor project pack patch roundtrip; microphone/privacy safety contract PASS");
