#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
function load(path,deps={}){
  const js=ts.transpileModule(readFileSync(new URL("../../"+path,import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const mod={exports:{}};
  new Function("module","exports","require",js)(mod,mod.exports,key=>{
    if(Object.hasOwn(deps,key))return deps[key];
    throw Error("Unknown import "+key);
  });
  return mod.exports;
}
const audio=load("lib/motion/timeline-edit.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":audio});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
const base=studio.sanitizeMotionProject(studio.makeMotionPreset("promptence","portrait"));
const full=chat.createChatMotionPack(base);
assert.equal(full.protocol,"motion-chat-v1");
assert.equal(full.action,"create");
const restored=chat.previewChatMotionPack(JSON.parse(JSON.stringify(full)),
  studio.makeMotionPreset("veto"));
assert.equal(restored.action,"create");
assert.equal(restored.next.brand,"promptence");
assert.equal(restored.next.scenes.length,base.scenes.length);
assert.equal(JSON.stringify(restored.next),JSON.stringify(base));
const patch=chat.createChatMotionPatch(base,1,{
  headline:"THIS IS THE NEW HEADLINE",seconds:5.5,titleTreatment:"mask",transition:"slide"
});
assert.equal(patch.action,"patch");
assert.equal(patch.expectedTitle,base.title);
const preview=chat.previewChatMotionPack(patch,base);
assert.equal(preview.next.scenes[1].headline,"THIS IS THE NEW HEADLINE");
assert.equal(preview.next.scenes[1].seconds,5.5);
assert.equal(preview.next.scenes[1].transition,"slide");
assert.equal(preview.next.scenes[0].headline,base.scenes[0].headline);
assert.equal(base.scenes[1].headline,"YOUR CUSTOMER ASKS AI.","Current project must remain immutable");
const grade=chat.previewChatMotionPack({protocol:"motion-chat-v1",action:"patch",
  expectedBrand:base.brand,expectedTitle:base.title,changes:[
    {target:"project",set:{visual:{motion:.7,glow:.28}}},
    {target:"scene",index:0,set:{support:"Only documented evidence."}}
  ]
},base);
assert.equal(grade.next.visual.motion,.7);
assert.equal(grade.next.visual.glow,.28);
assert.equal(grade.next.visual.textScale,1);
assert.equal(grade.next.scenes[0].support,"Only documented evidence.");
assert.throws(()=>chat.previewChatMotionPack({...patch,expectedBrand:"veto"},base),/targets/);
assert.throws(()=>chat.previewChatMotionPack({...patch,expectedTitle:"different"},base),/different project title/);
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[{target:"scene",index:99,set:{headline:"Test"}}]},base),/scene index/);
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[{target:"scene",index:0,set:{__proto__:{malicious:true},bogus:1}}]},base),/Unsupported/);
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[{target:"scene",index:0,set:{transition:"execute-script"}}]},base),/Rejected invalid/);
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[{target:"project",set:{visual:{motion:500}}}]},base),/Rejected invalid/);
assert.throws(()=>chat.previewChatMotionPack({...patch,changes:[{target:"scene",index:0,set:{headline:base.scenes[0].headline}}]},base),/changes nothing/);
assert.throws(()=>chat.previewChatMotionPack({...full,protocol:"invalid"},base),/Expected motion-chat-v1/);
assert.throws(()=>chat.previewChatMotionPack({protocol:"motion-chat-v1",action:"create",project:{...base,scenes:Array(9).fill(base.scenes[0])}},base),/1–8 shots/);
const cleanVisual=studio.sanitizeVisual({motion:Infinity,contrast:-6,glow:9,textScale:1.2});
assert.deepEqual(cleanVisual,{motion:1,textScale:1,contrast:0,glow:1});
console.log("Motion Chat Operator protocol: create/patch, non-destructive review, safe visual grade and rejection gates PASS");
