#!/usr/bin/env node
/** Pure local source-pipeline contract with a simulated browser decoder.
 * Does not invent customer visuals or claim real film aesthetic quality. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

function load(path,deps={}){
 const js=ts.transpileModule(readFileSync(new URL("../../"+path,import.meta.url),"utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const module={exports:{}};
 new Function("module","exports","require",js)(module,module.exports,name=>{
   if(Object.hasOwn(deps,name))return deps[name];
   throw Error("Unexpected module import: "+name);
 });
 return module.exports;
}
const audio=load("lib/motion/timeline-edit.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":audio});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
const transitions=load("lib/motion/editorial-transitions.ts");
const src=load("lib/motion/scene-source.ts",{"./editorial-transitions":transitions});
const base=studio.makeMotionPreset("promptence");
const validId="media-test-source-01";
const scene={...base.scenes[0],kind:"screen",mediaId:validId,mediaStart:1.2,seconds:4};
const film=studio.sanitizeMotionProject({...base,scenes:[scene,base.scenes[1]]});
assert.equal(film.scenes[0].mediaId,validId);
assert.equal(film.scenes[0].mediaStart,1.2);
assert.equal(studio.sanitizeMotionProject({...base,scenes:[{...scene,mediaId:"https://evil.example/media"}]}).scenes[0].mediaId,undefined);
assert.equal(studio.sanitizeMotionProject({...base,scenes:[{...scene,mediaStart:Infinity}]}).scenes[0].mediaStart,0);
assert.match(src.motionSourceIssues(film)[0],/not attached/);
await assert.rejects(()=>src.prepareMotionSourceFrame(film,1),/not attached/);
const patch=chat.createChatMotionPatch(film,0,{mediaStart:2.2});
assert.equal(chat.previewChatMotionPack(patch,film).next.scenes[0].mediaStart,2.2);
assert.throws(()=>chat.previewChatMotionPack(
 {...patch,changes:[{target:"scene",index:0,set:{mediaId:"http://bad"}}]},film),/Rejected/);

// Simulated FILE + browser image/video decoder to exercise true per-shot
// coverage and exact seek semantics, independently of network and GPU.
const savedCreate=URL.createObjectURL,savedRevoke=URL.revokeObjectURL;
URL.createObjectURL=()=>("blob:motion-test");
URL.revokeObjectURL=()=>{};
globalThis.window={setTimeout,clearTimeout};
class MockVideo {
 constructor(){this.events=new Map();this.paused=true;this.duration=8;this.videoWidth=1280;this.videoHeight=720;
  this.readyState=2;this._time=0;this.muted=true;this.playsInline=true;}
 addEventListener(name,fn){this.events.set(name,fn);}
 removeEventListener(name){this.events.delete(name);}
 load(){if(this.src)queueMicrotask(()=>this.events.get("loadeddata")?.());}
 pause(){this.paused=true;}
 play(){this.paused=false;return Promise.resolve();}
 get currentTime(){return this._time;}
 set currentTime(n){this._time=n;queueMicrotask(()=>this.events.get("seeked")?.());}
 removeAttribute(k){this.src="";}
}
globalThis.document={createElement:n=>{assert.equal(n,"video");return new MockVideo();}};
const fakeFile={name:"owner-reviewed-real-clip.mp4",type:"video/mp4",size:8_000_000};
const registered=await src.registerMotionSceneSource(validId,fakeFile);
assert.equal(registered.duration,8);
assert.equal(registered.type,"video");
assert.deepEqual(src.motionSourceIssues(film),[]);
const overlap=studio.sanitizeMotionProject({...film,scenes:[
  {...film.scenes[0],transition:"dissolve"},
  {...film.scenes[1],kind:"screen",mediaId:validId,mediaStart:0,seconds:4}
]});
assert.match(src.motionSourceIssues(overlap).join(" "),/overlapping transition/);
const hardCut=studio.sanitizeMotionProject({...overlap,scenes:[
  {...overlap.scenes[0],transition:"cut"},overlap.scenes[1]
]});
assert.deepEqual(src.motionSourceIssues(hardCut),[]);
await src.prepareMotionSourceFrame(film,2);
assert.ok(Math.abs(registered.element.currentTime-3.2)<.02,
 "2s film time + 1.2s source inpoint must seek to 3.2s");
src.syncMotionSourcePlayback(film,2.5,true);
assert.equal(registered.element.paused,false);
src.pauseMotionSourceVideos();
assert.equal(registered.element.paused,true);
const tooLate=studio.sanitizeMotionProject({...film,scenes:[{...film.scenes[0],mediaStart:4.3},film.scenes[1]]});
assert.match(src.motionSourceIssues(tooLate).join(" "),/ends too soon/);
await assert.rejects(()=>src.prepareMotionSourceFrame(tooLate,1),/ends too soon/);
src.disposeMotionSceneSource(validId);
assert.equal(src.getMotionSceneSource(validId),undefined);
URL.createObjectURL=savedCreate;URL.revokeObjectURL=savedRevoke;
console.log("Motion source-first media: true-shot IDs, timing, no-freeze coverage, browser-local video playback and Chat patches PASS");
