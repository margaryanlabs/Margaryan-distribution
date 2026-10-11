#!/usr/bin/env node
/** Production picture-edit correctness; executes before every Vercel build. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const source=readFileSync(new URL("../../lib/motion/precision-edit.ts",import.meta.url),"utf8");
const stripped=stripTypeScriptTypes(source,{mode:"strip"});
const tools=await import("data:text/javascript;base64,"+Buffer.from(stripped).toString("base64"));
const shot=(name,seconds=4,extra={})=>({
 id:name,kind:"statement",eyebrow:"EDITORIAL",headline:name,
 support:"Source-verified product claim.",seconds,transition:"dissolve",
 sourceZoomStart:1,sourceZoomEnd:1.4,...extra
});
const base={brand:"promptence",format:"portrait",version:1,
 title:"Product Director",qualityMode:"signature",
 scenes:[shot("A"),shot("B"),shot("C")]};
const ordered=tools.moveMotionShot(base,1,1);
assert.deepEqual(ordered.project.scenes.map(s=>s.headline),["A","C","B"]);
assert.equal(ordered.selectedIndex,2);
assert.deepEqual(base.scenes.map(s=>s.headline),["A","B","C"]);
const before=base.scenes.map(x=>x.seconds).reduce((a,b)=>a+b,0);
const fullMedia={...base,scenes:[shot("REAL",8,{
 kind:"screen",mediaId:"approved-recording-012",mediaStart:3.5,sourceZoomStart:1,
 sourceZoomEnd:1.4,overlayMediaId:"approved-image-456",
 overlayStart:1,overlayDuration:5
}),shot("C")]};
const split=tools.splitMotionShot(fullMedia,0,4);
assert.equal(split.selectedIndex,1);
assert.equal(split.project.scenes.length,3);
assert.equal(split.project.scenes[0].seconds,4);
assert.equal(split.project.scenes[1].seconds,4);
assert.equal(split.project.scenes[0].transition,"cut");
assert.equal(split.project.scenes[1].transition,"dissolve");
assert.equal(split.project.scenes[0].mediaStart,3.5);
assert.equal(split.project.scenes[1].mediaStart,7.5);
assert.equal(split.project.scenes[0].sourceZoomEnd,1.2);
assert.equal(split.project.scenes[1].sourceZoomStart,1.2);
assert.equal(split.project.scenes[0].overlayStart,1);
assert.equal(split.project.scenes[0].overlayDuration,3);
assert.equal(split.project.scenes[1].overlayStart,0);
assert.equal(split.project.scenes[1].overlayDuration,2);
assert.equal(split.project.scenes[1].voiceCue,"");
assert.equal(split.project.scenes.reduce((sum,s)=>sum+s.seconds,0),
 fullMedia.scenes.reduce((sum,s)=>sum+s.seconds,0));
assert.equal(fullMedia.scenes.length,2,"Original storyboard must not be mutated");
const splitNonmedia=tools.splitMotionShot({...base,scenes:[shot("KEYLESS",6)]},0,2.5);
assert.equal(splitNonmedia.project.scenes[1].mediaStart,0);
const dup=tools.duplicateMotionShot(base,0);
assert.deepEqual(dup.project.scenes.map(s=>s.headline),["A","A","B","C"]);
assert.equal(dup.project.scenes[0].transition,"cut");
assert.equal(dup.project.scenes[1].voiceCue,"");
const still={...base,scenes:[shot("PHOTO",4,{kind:"screen",mediaId:"approved-image-456"})]};
assert.equal(tools.duplicateMotionShot(still,0,"image").project.scenes.length,2);
assert.throws(()=>tools.duplicateMotionShot(fullMedia,0,"video"),/Video should be split/);
assert.throws(()=>tools.duplicateMotionShot(fullMedia,0),/Load approved source media/);
assert.throws(()=>tools.splitMotionShot(base,0,1.5),/at least 2 seconds/);
assert.throws(()=>tools.splitMotionShot(base,0,Number.NaN),/Invalid split/);
assert.throws(()=>tools.moveMotionShot(base,0,-1),/cannot move/);
assert.throws(()=>tools.moveMotionShot(base,1,2),/cannot move/);
assert.throws(()=>tools.duplicateMotionShot({...base,scenes:Array(8).fill(shot("MAX"))},0),/Maximum eight/);
assert.throws(()=>tools.splitMotionShot({...base,scenes:Array(8).fill(shot("MAX",8))},0,4),/Maximum eight/);
assert.equal(before,12);
console.log("Motion Precision Cut: source-continuous video split, independent overlay time windows, safe optical zoom, reorder, still duplicate, 8-shot limit, no source mutation PASS");
