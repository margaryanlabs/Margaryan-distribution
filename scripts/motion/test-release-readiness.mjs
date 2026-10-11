#!/usr/bin/env node
/** Local release-review contract, independent of model inference, video codecs
 * and browser state. A valid scene cannot imply rights or commercial approval.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const source=readFileSync(new URL("../../lib/motion/release-readiness.ts",import.meta.url),"utf8");
const url="data:text/javascript;base64,"+Buffer.from(stripTypeScriptTypes(source,{mode:"strip"})).toString("base64");
const {inspectReleaseReadiness,releaseReadinessExport}=await import(url);
const shot=(kind="screen",mediaId="media-image-1",seconds=4)=>({
  id:"shot-"+kind,kind,eyebrow:"TEST",headline:"REAL SHOT",support:"No invented facts",
  seconds,mediaId,mediaStart:1,voiceCue:"Human voice cue (not speech)"
});
const base={brand:"promptence",title:"Authentic Demo",scenes:[
  shot("screen"),shot("statement",undefined,5),
  shot("closer",undefined,5)
]};
const qa={pass:true,grade:"READY",blockers:0,warnings:0,
  scenes:3,seconds:14,checks:[]};
const env=(overrides={})=>({
  getSource:id=>id==="media-image-1"?{type:"image",filename:"PRIVATE ORIGINAL.png",duration:null}:undefined,
  legacyScreen:false,voiceAttached:false,voiceSeconds:null,voiceReady:false,
  voiceOverflowSeconds:0,musicAttached:false,...overrides
});
const good=inspectReleaseReadiness(base,qa,env());
assert.equal(good.renderable,true);
assert.equal(good.boundSources,1);
assert.equal(good.sourceShots,1);
assert.equal(good.shots[0].source,"real-image");
assert.equal(good.shots[1].source,"motion-graphics");
assert.equal(good.state,"review","Never claim that structural renderability means commercial release");
assert.equal(good.releaseRequiresHumanApproval,true);
assert.ok(good.items.some(x=>x.id==="rights.signoff"&&x.state==="review"));
assert.ok(good.items.some(x=>x.id==="master.signoff"&&x.state==="review"));
const safe=releaseReadinessExport(good);
assert.ok(safe.includes("NOT A RELEASE CERTIFICATE"));
assert.ok(!safe.includes("PRIVATE ORIGINAL.png"),"Do not export original source filenames or local IDs");
assert.ok(!safe.includes("media-image-1"),"Never include local source map IDs in QA report");

const missing=inspectReleaseReadiness(base,qa,env({getSource:()=>undefined}));
assert.equal(missing.renderable,false,"Missing input source must not count as a usable film");
assert.equal(missing.shots[0].status,"block");
const absent=inspectReleaseReadiness({...base,scenes:[shot("screen",undefined)]},qa,env());
assert.equal(absent.shots[0].source,"missing-source");
const legacy=inspectReleaseReadiness({...base,scenes:[shot("screen",undefined)]},qa,
  env({legacyScreen:true}));
assert.equal(legacy.shots[0].source,"legacy-image");
assert.equal(legacy.boundSources,1);

const video={...base,scenes:[shot("screen","video-source-1",4)]};
const shortVideo=inspectReleaseReadiness(video,qa,env({getSource:()=>({
  type:"video",filename:"source.mp4",duration:4
})}));
assert.equal(shortVideo.shots[0].status,"block");
assert.equal(shortVideo.renderable,false);

const voiceLong=inspectReleaseReadiness(base,qa,env({
 voiceAttached:true,voiceSeconds:21,voiceReady:false,voiceOverflowSeconds:7
}));
assert.equal(voiceLong.renderable,false);
assert.ok(voiceLong.items.some(x=>x.id==="audio.window"&&x.state==="block"));
const voiceValid=inspectReleaseReadiness(base,qa,env({
 voiceAttached:true,voiceSeconds:12,voiceReady:true,voiceOverflowSeconds:0
}));
assert.ok(voiceValid.items.some(x=>x.id==="audio.attached"&&x.state==="pass"));
assert.equal(voiceValid.state,"review");
const blocked={...qa,pass:false,blockers:1,checks:[{
 id:"copy.blank.0",severity:"block",message:"Scene 1 has no headline"
}]};
const other=inspectReleaseReadiness(base,blocked,env());
assert.equal(other.renderable,false);
assert.ok(other.items.some(x=>x.shotIndex===0&&x.panel==="scene"));
const conceptual=inspectReleaseReadiness({...base,scenes:[shot("kinetic",undefined,4)]},
 qa,env());
assert.ok(conceptual.items.some(x=>x.id==="evidence.no-product"));
console.log("Motion Film Release Desk PASS: honest renderability vs commercial release, original source/voice coverage, error navigation, media-identity privacy.");
