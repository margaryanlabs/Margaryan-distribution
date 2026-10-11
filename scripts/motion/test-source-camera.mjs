#!/usr/bin/env node
/** Real-pixel source framing + video/voice recorder clock contract.
 * Uses pure math and a fake AudioContext, not screenshots or vendor APIs.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
function load(path,deps={}){
  const source=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  const js=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  new Function("module","exports","require",js)(mod,mod.exports,key=>{
    if(Object.hasOwn(deps,key))return deps[key];
    throw Error("Unexpected import "+key);
  });
  return mod.exports;
}
const framing=load("lib/motion/source-composition.ts");
const timeline=load("lib/motion/timeline-edit.ts");
const motionFraming=load("lib/motion/source-composition.ts");
const motionOverlay=load("lib/motion/image-overlay.ts");
const studio=load("lib/motion/studio.ts",{
 "./timeline-edit":timeline,"./source-composition":framing,"./image-overlay":motionOverlay});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
assert.deepEqual(framing.sanitizeSourceDirection(null),framing.DEFAULT_SOURCE_DIRECTION);
assert.deepEqual(framing.sanitizeSourceDirection({sourceLayout:"fullscreen",sourceFocusX:99,
 sourceFocusY:-4,sourceZoomStart:0,sourceZoomEnd:Infinity}),{
 sourceLayout:"card",sourceFocusX:1,sourceFocusY:0,sourceZoomStart:1,sourceZoomEnd:1.075
});
for(const ratio of [[1920,1080],[1080,1920],[1080,1080],[420,2000]]){
 for(const layout of ["card","theater","split","immersive"]){
  const dest=framing.sourceStage(layout,1080,1920);
  assert.ok(dest.x>=0&&dest.y>=0&&dest.w>0&&dest.h>0);
  const rect=framing.sourceCrop(...ratio,dest.w,dest.h,.28,.74,1.6);
  assert.ok(rect.sx>=0&&rect.sy>=0);
  assert.ok(rect.sw>0&&rect.sh>0);
  assert.ok(rect.sx+rect.sw<=ratio[0]+.001);
  assert.ok(rect.sy+rect.sh<=ratio[1]+.001);
  assert.ok(Math.abs(rect.sw/rect.sh-dest.w/dest.h)<.001);
 }
}
assert.equal(framing.sourceZoom({sourceZoomStart:1,sourceZoomEnd:2},0),1);
assert.equal(framing.sourceZoom({sourceZoomStart:1,sourceZoomEnd:2},1),2);
const f=studio.makeMotionPreset("promptence");
const edited=studio.sanitizeMotionProject({...f,scenes:[{...f.scenes[0],
 kind:"screen",sourceLayout:"immersive",sourceFocusX:.27,sourceFocusY:.73,
 sourceZoomStart:1.08,sourceZoomEnd:1.55},...f.scenes.slice(1)]});
assert.equal(edited.scenes[0].sourceLayout,"immersive");
assert.equal(edited.scenes[0].sourceZoomEnd,1.55);
const patch=chat.createChatMotionPatch(edited,0,{sourceFocusX:.4,sourceLayout:"split"});
assert.equal(chat.previewChatMotionPack(patch,edited).next.scenes[0].sourceLayout,"split");
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[
 {target:"scene",index:0,set:{sourceZoomEnd:8}}]},edited),/Rejected invalid/);

// The audio track must be created but NOT started until video MediaRecorder
// is running. The former music/speech engine scheduled 400ms before it.
const startEvents=[],stopped=[];
const param=()=>({
 value:0,
 setValueAtTime(v,t){startEvents.push(["set",v,t]);},
 linearRampToValueAtTime(v,t){startEvents.push(["linear",v,t]);},
 exponentialRampToValueAtTime(v,t){startEvents.push(["exp",v,t]);}
});
class Node{
 constructor(){this.gain=param();this.frequency=param();}
 connect(next){return next;}
 start(...args){startEvents.push(["source-start",...args]);}
 stop(...args){stopped.push(args);}
}
class Context{
 currentTime=18.1;
 constructor(){this.destination=new Node();}
 createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{stop(){stopped.push("track");}}]}};}
 createDynamicsCompressor(){const n=new Node();n.threshold={value:0};n.knee={value:0};n.ratio={value:0};
  n.attack={value:0};n.release={value:0};return n;}
 createGain(){return new Node();}
 createBufferSource(){const n=new Node();n.buffer=null;n.loop=false;return n;}
 createOscillator(){const n=new Node();n.type="sine";return n;}
 async decodeAudioData(){return{duration:12.5};}
 async resume(){}
 async close(){}
}
globalThis.AudioContext=Context;
const sound=load("lib/motion/sound-engine.ts",{"./studio":studio,"./timeline-edit":timeline});
const soundProject=studio.sanitizeMotionProject({...f,audio:{voiceStart:1,voiceTrim:0,
 voiceFadeIn:.1,voiceFadeOut:.2,musicTrim:0,musicFadeIn:.3,musicFadeOut:.5}});
const file={size:20000,type:"audio/wav",async arrayBuffer(){return new ArrayBuffer(1024);}};
const session=await sound.createProceduralSoundtrack(soundProject,{
 voiceover:file,music:file,synth:false});
assert.equal(startEvents.filter(e=>e[0]==="source-start").length,0,
 "Creating a track must not start narration before video recording begins");
session.start();
const sources=startEvents.filter(e=>e[0]==="source-start");
assert.equal(sources.length,2,"Narration and score both start after video recorder starts");
const starts=sources.map(e=>e[1]).sort((a,b)=>a-b);
assert.ok(starts[0]>=18.1&&starts[0]<18.21,
 "Initial music should align within 110ms of the video capture clock");
assert.ok(Math.abs(starts[1]-starts[0]-1)<.0001,
 "Narration must start exactly at the 1-second project offset");
session.start();
assert.equal(startEvents.filter(e=>e[0]==="source-start").length,2,
 "Sound start() must be idempotent");
await session.close();
assert.ok(stopped.includes("track"));
console.log("Motion camera + video/voice sound-clock v3: bounded focus/zoom, cinematic layouts and recorder-start sync PASS");
