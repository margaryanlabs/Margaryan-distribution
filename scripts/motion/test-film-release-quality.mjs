#!/usr/bin/env node
/** No external APIs or browser needed. Production guards are exercised independently. */
import assert from "node:assert/strict";
import {assertReadableFrame,meanPixelDifference,verifyNovelShot,
  PROMPTENCE_SECTIONS} from "./source-capture-gates.mjs";
import {criticalDirectorNotes,assertDirectorRelease,
  assertApprovedSourceManifest} from "./release-quality-gates.mjs";

assert.equal(PROMPTENCE_SECTIONS.length,6);
assert.equal(new Set(PROMPTENCE_SECTIONS.map(x=>x.assetId)).size,6);
const goodFrame={overlayVisible:false,headingVisible:true,headingWidth:350,viewportWidth:540,pageTitle:"Promptence"};
assert.equal(assertReadableFrame(goodFrame),true);
assert.throws(()=>assertReadableFrame({...goodFrame,overlayVisible:true}),/onboarding/);
assert.throws(()=>assertReadableFrame({...goodFrame,headingVisible:false}),/outside/);
assert.throws(()=>assertReadableFrame({...goodFrame,headingWidth:114}),/compressed/);
assert.equal(meanPixelDifference([0,0,255],[0,15,255]),5);
assert.equal(verifyNovelShot([],Array(6).fill(100)),255);
assert.throws(()=>verifyNovelShot([[1,1,1,1]],[2,2,2,2]),/duplicate-looking/);
assert.equal(verifyNovelShot([[0,0,0,0]],[255,255,255,255]),255);
const report={measuredFramePass:true,after:{blockers:0},remaining:[]};
assert.equal(assertDirectorRelease(report),true);
assert.deepEqual(criticalDirectorNotes([
  "SHOT 02: visually similar to previous shot; inspect composition manually.",
  "Real user-provided source: visually verify rights before publishing."
]),["SHOT 02: visually similar to previous shot; inspect composition manually."]);
assert.throws(()=>assertDirectorRelease({...report,remaining:["SHOT 02: visually similar to previous"]}),/RELEASE BLOCKED/);
assert.throws(()=>assertDirectorRelease({...report,after:{blockers:1}}),/critical defects/);
const id="promptence-real-landing",hash="a".repeat(64);
const manifest={version:1,brand:"promptence",shots:[{assetId:id,sha256:hash,status:"PASS",
  visualDifference:255,overlayAbsent:true,headingVisible:true,layoutValid:true}],
 approval:{status:"APPROVED",sourceRights:true,privacyReviewed:true,productTruthReviewed:true,
 voiceReviewed:true,musicReviewed:true}};
assert.equal(assertApprovedSourceManifest(manifest,[id],{[id]:hash},"promptence").sourceCount,1);
assert.throws(()=>assertApprovedSourceManifest({...manifest,approval:{...manifest.approval,status:"PENDING_HUMAN_REVIEW"}},[id],{[id]:hash},"promptence"),/human reviews/);
assert.throws(()=>assertApprovedSourceManifest(manifest,[id],{[id]:"b".repeat(64)},"promptence"),/bytes changed/);
assert.throws(()=>assertApprovedSourceManifest({...manifest,shots:[{...manifest.shots[0],visualDifference:0.2}]},[id],{[id]:hash},"promptence"),/did not pass/);
assert.throws(()=>assertApprovedSourceManifest(manifest,["unknown-source"],{}, "promptence"),/source/);
console.log("Motion first-visit source, visual novelty, fail-closed release and human approval contracts PASS");
