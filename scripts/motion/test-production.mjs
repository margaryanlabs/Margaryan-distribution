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

const studio=load("lib/motion/studio.ts");
const pack=load("lib/motion/production-pack.ts",{"./studio":studio});
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
console.log("Motion production desk schema, shot timings, narration cues and sanitization: PASS");
