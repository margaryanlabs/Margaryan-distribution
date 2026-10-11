#!/usr/bin/env node
import {PLAN as PUBLIC_PLAN} from "./interaction-cinema-core.mjs";
/** No external APIs or browser needed. Production guards are exercised independently. */
import assert from "node:assert/strict";
import {assertReadableFrame,meanPixelDifference,verifyNovelShot,
  PROMPTENCE_SECTIONS} from "./source-capture-gates.mjs";
import {criticalDirectorNotes,assertDirectorRelease,
  assertApprovedSourceManifest,assertApprovedInteractionManifest,assertSourceFraming,visibleSourceFraction} from "./release-quality-gates.mjs";

assert.equal(PROMPTENCE_SECTIONS.length,6);
assert.equal(new Set(PROMPTENCE_SECTIONS.map(x=>x.assetId)).size,6);
const goodFrame={overlayVisible:false,headingVisible:true,headingWidth:350,viewportWidth:540,pageTitle:"Promptence"};
assert.equal(assertReadableFrame(goodFrame),true);
assert.throws(()=>assertReadableFrame({...goodFrame,overlayVisible:true}),/onboarding/);
assert.throws(()=>assertReadableFrame({...goodFrame,headingVisible:false}),/outside/);
assert.throws(()=>assertReadableFrame({...goodFrame,headingWidth:114}),/compressed/);
assert.equal(meanPixelDifference([0,0,255],[0,15,255]),5);
assert.ok(visibleSourceFraction(1280,720,885.6,480)>.95);
assert.throws(()=>assertSourceFraming(1080,1920,885.6,480,"portrait-in-stage"),/cover-crops/);
assert.ok(assertSourceFraming(1280,720,885.6,480,"wide-proof")>.95);
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
const realId="promptence-interaction-take-01";
const realHash="e".repeat(64);
const browserEvidence={
 schema:"motion-interaction-cinema/v1",brand:"promptence",
 sourceUrl:"https://promptence.tech/",capturedFromRealBrowser:true,
 providerAPIsUsed:false,readOnly:true,submitPrevented:true,
 mediaId:realId,originalVideo:{sha256:realHash},
 duration:34.167,frames:820,firstVisitOnboardingHandled:{checked:true,dismissed:true},
 events:PUBLIC_PLAN.map((step,i)=>({
  kind:step.kind,action:step.id,target:step.target,
  timestampSeconds:i*3.4+2.25,source:"live-browser",
  publicReadOnly:true,submitted:false
 })),
 approval:{status:"APPROVED",sourceRights:true,privacyReviewed:true,
 copyAndProductTruthReviewed:true,voiceReviewed:true,musicReviewed:true}
};
assert.equal(assertApprovedInteractionManifest(browserEvidence,[realId],{[realId]:realHash},"promptence").realUiEvents,10);
assert.throws(()=>assertApprovedInteractionManifest({...browserEvidence,approval:{...browserEvidence.approval,status:"PENDING_HUMAN_REVIEW"}},[realId],{[realId]:realHash},"promptence"),/human review/);
assert.throws(()=>assertApprovedInteractionManifest(browserEvidence,[realId],{[realId]:"b".repeat(64)},"promptence"),/original bytes/);
assert.throws(()=>assertApprovedInteractionManifest({...browserEvidence,events:[{...browserEvidence.events[0],submitted:true},...browserEvidence.events.slice(1)]},[realId],{[realId]:realHash},"promptence"),/unsafe/);
assert.throws(()=>assertApprovedInteractionManifest({...browserEvidence,providerAPIsUsed:true},[realId],{[realId]:realHash},"promptence"),/unsafe/);
assert.throws(()=>assertApprovedInteractionManifest({...browserEvidence,events:[{...browserEvidence.events[0],action:"run-paid-scan"},...browserEvidence.events.slice(1)]},[realId],{[realId]:realHash},"promptence"),/unsafe/);
console.log("Motion first-visit source, visual novelty, fail-closed release and human approval contracts PASS");
