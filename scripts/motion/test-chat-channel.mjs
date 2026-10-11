#!/usr/bin/env node
/** Public-only ChatGPT/GitHub-to-Motion handoff: NO private media, API or agent. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
function load(path,deps={}){
 const js=ts.transpileModule(readFileSync(new URL("../../"+path,import.meta.url),"utf8"),{
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const mod={exports:{}};
 new Function("module","exports","require",js)(mod,mod.exports,k=>{
   if(Object.hasOwn(deps,k))return deps[k];
   throw Error("Unexpected import "+k);
 });
 return mod.exports;
}
const timeline=load("lib/motion/timeline-edit.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":timeline});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
const json=readFileSync(new URL("../../public/motion/chat-ops/latest-public.json",import.meta.url),"utf8");
assert.ok(json.length<100_000);
const pack=JSON.parse(json);
const result=chat.previewChatMotionPack(pack,studio.makeMotionPreset("veto"));
const film=result.next;
assert.equal(result.action,"create");
assert.equal(film.brand,"promptence");
assert.equal(film.language,"ru");
assert.equal(film.format,"portrait");
assert.equal(film.scenes.length,8);
assert.ok(Math.abs(studio.durationOf(film)-36.5)<.001);
assert.ok(film.scenes.every(x=>x.headline&&x.support&&x.seconds>=2&&x.seconds<=8));
assert.ok(film.scenes.every(x=>!x.mediaId&&!x.mediaStart),"No private local media IDs in public packs");
assert.ok(film.scenes.every(x=>!/(?:https?:\/\/|sk-proj|password|token|secret)/i.test(x.headline+" "+x.support+" "+x.voiceCue)));
assert.deepEqual(film.scenes.map(x=>x.productBeat),
 ["question","answer","gap","sources","diagnose","priority","remeasure","close"]);
console.log("Public Chat-to-Motion handoff: safe public 36.5s eight-shot pack validated PASS");
