#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {File as NodeFile} from "node:buffer";
import {createRequire} from "node:module";
const tsModule=createRequire(import.meta.url)("typescript");
const ts=tsModule.transpileModule?tsModule:tsModule.default;
if(!ts?.transpileModule)throw Error("TypeScript compiler is not available for portable bundle tests");
if(typeof globalThis.File==="undefined")globalThis.File=NodeFile;
const load=(path,deps={})=>{
  const src=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  const js=ts.transpileModule(src,{compilerOptions:{module:1,
    target:9}}).outputText;
  const mod={exports:{}};
  new Function("module","exports","require",js)(mod,mod.exports,key=>{
    if(Object.hasOwn(deps,key))return deps[key];
    throw Error("Unexpected test module "+key);
  });
  return mod.exports;
};
const zip=load("lib/motion/zip-store.ts");
const textFile=(name,data,type="text/plain")=>new File([data],name,{type});
assert.equal(zip.zipCRC32(new TextEncoder().encode("123456789")),0xcbf43926);
const simple=await zip.makeMotionZip([
 {name:"manifest.json",body:textFile("manifest.json",'{"hello":true}')},
 {name:"assets/test.bin",body:textFile("clip.txt","A".repeat(300))}
]);
const files=await zip.readMotionZip(simple);
assert.equal(files.size,2);
assert.equal(await files.get("assets/test.bin").text(),"A".repeat(300));
await assert.rejects(()=>zip.makeMotionZip([{name:"../evil",body:textFile("a","b")}]),/unsafe/i);
await assert.rejects(()=>zip.makeMotionZip([
 {name:"a",body:textFile("a","aaa")},{name:"a",body:textFile("b","bbb")}
]),/duplicate/i);
const broken=Buffer.from(await simple.arrayBuffer());
const idx=broken.indexOf("A".repeat(20));
assert.ok(idx>=0);broken[idx]=66;
await assert.rejects(()=>zip.readMotionZip(new Blob([broken])),/checksum/i);

const timeline=load("lib/motion/timeline-edit.ts");
const source=load("lib/motion/source-composition.ts");
const studio=load("lib/motion/studio.ts",{
  "./timeline-edit":timeline,"./source-composition":source
});
const owned=new Map(),approved=new Set(),deleted=[];
let serial=0;
const local={
 async getLocalMedia(id){return owned.get(id);},
 async saveLocalMedia(file,brand,role){
   const id="restored-media-"+(++serial).toString().padStart(4,"0");
   const record={id,name:file.name,brand,role,mime:file.type,size:file.size,blob:file,
     created:Date.now(),approved:false};owned.set(id,record);return record;
 },
 async approveLocalMedia(id,yes){
   if(!owned.has(id))throw Error("No media");
   if(yes)approved.add(id);
 },
 async removeLocalMedia(id){deleted.push(id);owned.delete(id);approved.delete(id);}
};
const bundle=load("lib/motion/project-bundle.ts",{
 "./studio":studio,"./local-media":local,"./zip-store":zip
});
const original=studio.makeMotionPreset("promptence");
const id="original-owned-clip-1";
const content="FAKE-ORIGINAL-MEDIA-BYTES-".repeat(80);
const clip=textFile("approved-capture.mp4",content,"video/mp4");
owned.set(id,{id,name:clip.name,brand:"promptence",role:"video",mime:clip.type,
 size:clip.size,blob:clip,created:0,approved:true});
const project=studio.sanitizeMotionProject({...original,scenes:[
 {...original.scenes[0],kind:"screen",mediaId:id,mediaStart:1.1,
  sourceLayout:"theater"},...original.scenes.slice(1)
],filmChrome:"clean"});
const voice=textFile("human-voice.wav","WAVE-ORIGINAL-DATA".repeat(20),"audio/wav");
const music=textFile("licensed-score.wav","LICENSED-MUSIC-BYTES".repeat(20),"audio/wav");
const archive=await bundle.createMotionBundle(project,voice,music);
const review=await bundle.inspectMotionBundle(archive);
assert.equal(review.assets,1);assert.equal(review.hasVoice,true);
assert.equal(review.hasMusic,true);assert.equal(review.shots,project.scenes.length);
assert.equal(review.seconds,studio.durationOf(project));
await assert.rejects(()=>bundle.restoreMotionBundle(archive,false),/Confirm/);
const restored=await bundle.restoreMotionBundle(archive,true);
assert.equal(restored.restoredIds.length,1);
assert.notEqual(restored.project.scenes[0].mediaId,id);
assert.equal(restored.project.scenes[0].sourceLayout,"theater");
assert.equal(restored.project.filmChrome,"clean");
assert.equal(await restored.voice.text(),await voice.text());
assert.equal(await restored.music.text(),await music.text());
assert.equal(await owned.get(restored.restoredIds[0]).blob.text(),content);
assert.equal(owned.get(restored.restoredIds[0]).approved,false,
 "Approval is a separate operation following explicit rights confirmation");
assert.equal(approved.has(restored.restoredIds[0]),true,
 "New imported copy must only be approved after owner confirms");
assert.equal(owned.get(id).name,clip.name,
 "Existing local media must never be overwritten by a portable import");
const missing=studio.sanitizeMotionProject({...project,scenes:[{...project.scenes[0],
 mediaId:"unknown-source-000"},...project.scenes.slice(1)]});
await assert.rejects(()=>bundle.createMotionBundle(missing,null,null),/approved/);
const bogus=await zip.makeMotionZip([{name:"manifest.json",
 body:new Blob([JSON.stringify({format:bundle.BUNDLE_KIND,version:1,project,assets:[]})])}]);
await assert.rejects(()=>bundle.inspectMotionBundle(bogus),/Missing project source/);
console.log("Motion private portable film: ZIP CRC, hard safety limits, genuine video/voice/music roundtrip, explicit consent, asset-id remap and fail-closed missing media PASS");
