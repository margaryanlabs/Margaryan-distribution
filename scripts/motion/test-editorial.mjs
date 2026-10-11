#!/usr/bin/env node
/** Pure editorial contract — no browser, keys, licensed images or GPU needed. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
function load(path,dependencies={}){
  const src=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  const requireSource=name=>{
    if(Object.hasOwn(dependencies,name))return dependencies[name];
    throw Error("Unexpected runtime import "+name+" in "+path);
  };
  new Function("module","exports","require",js)(module,module.exports,requireSource);
  return module.exports;
}
const timeline=load("lib/motion/timeline-edit.ts");
const motionFraming=load("lib/motion/source-composition.ts");
const motionOverlay=load("lib/motion/image-overlay.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":timeline,"./source-composition":motionFraming,"./image-overlay":motionOverlay});
const beats=load("lib/motion/promptence-beats.ts",{"./studio":studio});
const transitions=load("lib/motion/editorial-transitions.ts");
assert.equal(studio.PROMPTENCE_BEATS.length,10);
assert.equal(new Set(studio.PROMPTENCE_BEATS).size,10);
for(const language of ["en","ru","hy"]){
  const film=beats.createPromptenceProductStory(language,"portrait");
  assert.equal(film.scenes.length,8);
  assert.equal(film.qualityMode,"signature");
  assert.equal(film.brand,"promptence");
  assert.equal(film.language,language);
  assert.equal(film.scenes[0].productBeat,"question");
  assert.equal(film.scenes.at(-1).productBeat,"close");
  assert.equal(film.scenes.at(-1).kind,"closer");
  assert.equal(new Set(film.scenes.map(s=>s.productBeat)).size,8);
  assert.ok(film.scenes.every(s=>s.headline.length>5&&s.seconds>=2&&s.seconds<=8));
  const restored=studio.sanitizeMotionProject(JSON.parse(JSON.stringify(film)));
  assert.deepEqual(restored.scenes.map(s=>s.productBeat),film.scenes.map(s=>s.productBeat));
  assert.ok(studio.durationOf(film)<=64);
}
const noBeat=studio.sanitizeMotionProject({
  ...studio.makeMotionPreset("veto"),scenes:[{
    ...studio.makeMotionPreset("veto").scenes[0],productBeat:"question"
  }]
});
assert.equal(noBeat.scenes[0].productBeat,undefined);
const bad=studio.sanitizeMotionProject({...beats.createPromptenceProductStory("en"),
  qualityMode:"ultra-max",scenes:[{kind:"opener",headline:"HELLO",seconds:4,productBeat:"fake",transition:"unknown"}]});
assert.equal(bad.qualityMode,undefined);
assert.equal(bad.scenes[0].productBeat,undefined);
assert.equal(bad.scenes[0].transition,"auto");
for(const t of ["zoom","slide","grid","flash","cut","dissolve","wipe","slash"]){
  const film=studio.sanitizeMotionProject({...beats.createPromptenceProductStory("en"),
    scenes:[{...beats.createPromptenceProductStory("en").scenes[0],transition:t}]});
  assert.equal(film.scenes[0].transition,t);
}
assert.equal(transitions.chooseTransition("cut","signature",0),"cut");
assert.equal(transitions.chooseTransition("auto","basic",1),"wipe");
assert.equal(transitions.chooseTransition("auto","premium",1),"slide");
assert.equal(transitions.chooseTransition("auto","signature",3),"grid");
// A sampled timeline has hard cuts to avoid an overprocessed flash in every shot.
const eight=Array.from({length:8},(_,i)=>transitions.chooseTransition("auto","signature",i));
assert.ok(eight.filter(x=>x==="cut").length>=2);
assert.ok(eight.filter(x=>x==="flash").length===0);
const ctx={
  saved:0,paintCalls:0,save(){this.saved++},restore(){this.saved--},
  beginPath(){},rect(){},clip(){},translate(){},scale(){},moveTo(){},lineTo(){},closePath(){},
  fillRect(){},globalAlpha:1,fillStyle:""
};
for(const method of ["dissolve","wipe","slash","zoom","slide","grid","flash"]){
  let paints=0;
  transitions.editorialTransition(ctx,method,.5,1080,1920,"#4EE6A1",alpha=>{
    assert.ok(alpha>=0&&alpha<=1);paints++;
  });
  assert.equal(paints,1,method+" must paint exactly one next scene");
  assert.equal(ctx.saved,0,method+" must restore canvas state");
}
let paints=0;
transitions.editorialTransition(ctx,"cut",.5,1080,1920,"#4EE6A1",()=>paints++);
assert.equal(paints,0);
console.log("Motion product-story 10 beats / RU EN HY / quality transitions / safety: PASS");
