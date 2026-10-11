#!/usr/bin/env node
import assert from "node:assert/strict";
import {validateMotionInteractionEvidence,clickSample,eventSfxSample,writeEffectsPcm,AUDIO_SAMPLE_RATE} from "./interaction-sound-core.mjs";
const demo={schema:"motion-interaction-cinema/v1",sourceUrl:"https://promptence.tech/",
 providerAPIsUsed:false,readOnly:true,submitPrevented:true,duration:3,
 events:[{action:"click",kind:"click",timestampSeconds:.4,source:"live-browser",publicReadOnly:true,submitted:false},
  {action:"typing",kind:"type",timestampSeconds:1.2,source:"live-browser",publicReadOnly:true,submitted:false}]};
assert.equal(validateMotionInteractionEvidence(demo),2);
assert.equal(clickSample(-1),0);
assert.equal(clickSample(.3),0);
assert.ok(Math.abs(clickSample(.012))>.001);
assert.ok(Math.abs(eventSfxSample(demo,.412))>.001);
assert.equal(eventSfxSample(demo,.1),0);
const wave=writeEffectsPcm(demo);
assert.equal(wave.toString("ascii",0,4),"RIFF");
assert.equal(wave.toString("ascii",8,12),"WAVE");
assert.equal(wave.length,44+Math.floor(AUDIO_SAMPLE_RATE*3)*2);
assert.throws(()=>validateMotionInteractionEvidence({...demo,readOnly:false}),/safe public/);
assert.throws(()=>validateMotionInteractionEvidence({...demo,events:[{...demo.events[0],submitted:true}]}),/unsafe/);
console.log("Motion Interaction Audio: original-event SFX, PCM validity and public-read-only proof PASS");
