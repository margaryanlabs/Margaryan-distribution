#!/usr/bin/env node
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {validateFilmSequence,escapeConcatFilePath} from "./film-sequence-core.mjs";

const chapter=(i,count=8)=>({
  id:"chapter-"+i,title:"Act "+i,
  project:{version:1,brand:"promptence",format:"portrait",language:"ru",
    title:"PROMPTENCE / ACT "+i,
    scenes:Array.from({length:count},(_,k)=>({
      id:"scene-"+(k+1),kind:k===0?"opener":"statement",
      eyebrow:"CHAPTER "+i,headline:"The real product moment "+(k+1),
      support:"Illustrative concept, not a real AI provider observation.",
      seconds:8
    }))
  }
});
const manifest={
  version:1,type:"motion-sequence-v1",brand:"promptence",format:"portrait",
  title:"PROMPTENCE / FULL FEATURE FILM",
  chapters:[chapter(1),chapter(2),chapter(3)],
  expectedDurationSeconds:192
};
const validated=validateFilmSequence(manifest);
assert.equal(validated.durationSeconds,192);
assert.equal(validated.shots,24);
assert.equal(validated.chapters.length,3);
assert.deepEqual(validated.chapters.map(c=>c.startSeconds),[0,64,128]);
assert.equal(escapeConcatFilePath("/tmp/final film.mp4"),"file '/tmp/final film.mp4'");
assert.throws(()=>escapeConcatFilePath("/tmp/o'connor.mp4"),/Unsafe/);
assert.throws(()=>escapeConcatFilePath("a\nb"),/Unsafe/);
assert.throws(()=>validateFilmSequence({...manifest,chapters:[...manifest.chapters,chapter(4),chapter(5),chapter(6),chapter(7),chapter(8),chapter(9)]}),/1–8/);
assert.throws(()=>validateFilmSequence({...manifest,expectedDurationSeconds:100}),/duration/);
assert.throws(()=>validateFilmSequence({...manifest,chapters:[
  chapter(1),{...chapter(2),project:{...chapter(2).project,format:"landscape"}}
]}),/mismatch/);
assert.throws(()=>validateFilmSequence({...manifest,chapters:[
  chapter(1),{...chapter(1),title:"Dup"}
]}),/unique/);
const corrupt={...manifest,chapters:[chapter(1)]};
corrupt.chapters[0].project.scenes[0].seconds=9;
assert.throws(()=>validateFilmSequence(corrupt),/2–8/);
const remote={...manifest,chapters:[chapter(1)]};
remote.chapters[0].project.scenes[0].videoUrl="https://third-party.invalid/no.mp4";
assert.throws(()=>validateFilmSequence(remote),/cannot carry videoUrl/);
const source={...manifest,chapters:[chapter(1,1)]};
source.chapters[0].project.scenes[0]={...source.chapters[0].project.scenes[0],
  kind:"screen",mediaId:"approved_media_0123",mediaStart:3};
assert.equal(validateFilmSequence(source).shots,1);
source.chapters[0].project.scenes[0].mediaId="bad url";
assert.throws(()=>validateFilmSequence(source),/invalid local media ID/);
// Operator --dry-run must neither depend on FFmpeg/Chromium nor render/modify MP4.
const dir=await mkdtemp(join(tmpdir(),"motion-sequence-test-"));
try{
  const input=join(dir,"film.motion-sequence.json");
  await writeFile(input,JSON.stringify(manifest));
  const p=spawnSync(process.execPath,["scripts/motion/render-sequence.mjs",
    input,join(dir,"film.mp4"),"--dry-run"],{
      cwd:new URL("../../",import.meta.url),encoding:"utf8",timeout:30000
    });
  assert.equal(p.status,0,p.stderr);
  const dry=JSON.parse(p.stdout);
  assert.equal(dry.ok,true);
  assert.equal(dry.plan.expectedDurationSeconds,192);
  assert.equal(dry.plan.cloudRender,false);
  assert.equal(dry.plan.shots,24);
}finally{await rm(dir,{recursive:true,force:true});}
console.log("MOTION SEQUENCE PASS: three acts/24 scenes/192s, local dry-run, source/timing/schema/concat safety");
