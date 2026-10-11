#!/usr/bin/env node
/** Keyless production desk runtime contract: no browser, GPU, FFmpeg or provider keys. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, dependencies={}) {
  const js=ts.transpileModule(readFileSync(new URL("../../"+path,import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const module={exports:{}};
  const mockRequire=(name)=>{
    if(Object.hasOwn(dependencies,name))return dependencies[name];
    throw Error("Unexpected dependency: "+name);
  };
  // This executes only the two repository-local pure data modules.
  new Function("module","exports","require",js)(module,module.exports,mockRequire);
  return module.exports;
}

const timing=load("lib/motion/timeline-edit.ts");
const motionFraming=load("lib/motion/source-composition.ts");
const motionOverlay=load("lib/motion/image-overlay.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":timing,"./source-composition":motionFraming,"./image-overlay":motionOverlay});
const pack=load("lib/motion/production-pack.ts",{"./studio":studio,"./timeline-edit":timing});
const raw=studio.makeMotionPreset("promptence","portrait");
raw.scenes[0].camera="push";
raw.scenes[0].transition="cut";
raw.scenes[0].intensity=.75;
raw.scenes[0].voiceCue="An independent visibility audit.";
raw.scenes[1].camera="drift";
raw.scenes[1].transition="wipe";
const valid=studio.sanitizeMotionProject(raw);
assert.equal(valid.scenes[0].camera,"push");
assert.equal(valid.scenes[0].transition,"cut");
assert.equal(valid.scenes[0].intensity,.75);
assert.equal(valid.scenes[0].voiceCue,"An independent visibility audit.");
assert.equal(valid.scenes[1].camera,"drift");
assert.equal(valid.scenes[1].transition,"wipe");
const out=pack.makeProductionPack(valid);
assert.equal(out.shots.length,valid.scenes.length);
assert.equal(out.shots[0].start,0);
assert.equal(out.shots[0].end,valid.scenes[0].seconds);
assert.equal(out.shots[1].start,valid.scenes[0].seconds);
assert.equal(out.shots[0].narration,"An independent visibility audit.");
assert.equal(out.duration,studio.durationOf(valid));
assert.equal(out.generatedBy,"keyless-deterministic-planner");
assert.equal(valid.scenes.length,raw.scenes.length);
const untrusted=studio.sanitizeMotionProject({...raw,scenes:[
  {...raw.scenes[0],camera:"javascript:alert(1)",transition:"explode",
    intensity:99,voiceCue:"x".repeat(500)}
]});
assert.equal(untrusted.scenes[0].camera,"inherit");
assert.equal(untrusted.scenes[0].transition,"auto");
assert.equal(untrusted.scenes[0].intensity,1);
assert.equal(untrusted.scenes[0].voiceCue.length,300);
const spatial = studio.sanitizeMotionProject({
  ...raw,
  scenes:[{...raw.scenes[0],kind:"spatial",camera:"push",intensity:.9}]
});
assert.equal(spatial.scenes[0].kind,"spatial");
assert.equal(spatial.scenes[0].camera,"push");
const spatialPack = pack.makeProductionPack(spatial);
assert.equal(spatialPack.shots[0].visual,"spatial");
assert.equal(spatialPack.shots[0].start,0);
const withAudio=studio.sanitizeMotionProject({...valid,audio:{
  voiceStart:1.2,voiceTrim:2.5,voiceFadeIn:.12,voiceFadeOut:.3,
  musicTrim:3,musicFadeIn:.7,musicFadeOut:1.2
}});
assert.equal(withAudio.audio.voiceStart,1.2);
assert.equal(withAudio.audio.voiceTrim,2.5);
assert.equal(pack.makeProductionPack(withAudio).audioEdit.musicTrim,3);
const validVoice=timing.voiceWindow(22,withAudio.audio,20);
assert.equal(validVoice.start,1.2);
assert.equal(validVoice.usableSeconds,17.5);
assert.equal(validVoice.ready,true);
const invalidVoice=timing.voiceWindow(17,withAudio.audio,20);
assert.equal(invalidVoice.ready,false);
assert.ok(invalidVoice.overflowSeconds>0);
const invalidAudio=studio.sanitizeMotionProject({...valid,audio:{
  voiceStart:Infinity,voiceTrim:-100,voiceFadeIn:100,musicTrim:"untrusted"
}});
assert.equal(invalidAudio.audio.voiceStart,0);
assert.equal(invalidAudio.audio.voiceTrim,0);
assert.equal(invalidAudio.audio.voiceFadeIn,5);
assert.equal(invalidAudio.audio.musicTrim,0);
const spans=timing.shotSpans(valid);
assert.equal(spans[0].start,0);
assert.equal(spans.at(-1).end,studio.durationOf(valid));
console.log("Motion production desk schema, shot timings, narration cues and sanitization: PASS");
