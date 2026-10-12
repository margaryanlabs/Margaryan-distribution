#!/usr/bin/env node
import assert from "node:assert/strict";
import { buildAudioMix } from "./audio-mix.mjs";

const base={duration:18,scorePath:null,project:{audio:{
  voiceStart:2,voiceTrim:1.5,voiceFadeIn:.2,voiceFadeOut:.4,
  musicTrim:1,musicFadeIn:.3,musicFadeOut:.7
}}};
const probe=path=>path.endsWith("voice.wav")?10:25;
let result=buildAudioMix({...base,opts:{voice:"./voice.wav",music:"./music.wav"},probeAudio:probe});
assert.equal(result.audioTracks,2);
assert.ok(result.audioInputArgs.includes("-stream_loop"));
assert.ok(result.audioMap.includes("-filter_complex"));
let filters=result.audioMap[result.audioMap.indexOf("-filter_complex")+1];
assert.match(filters,/atrim=start=1\.500:duration=8\.500/);
assert.match(filters,/adelay=2000:all=1/);
assert.match(filters,/atrim=start=1\.000/);
assert.match(filters,/afade=t=out:st=17\.300:d=0\.700/);
assert.match(filters,/amix=inputs=2/);
assert.match(filters,/sidechaincompress=threshold=0\.024:ratio=7/);
assert.match(filters,/acompressor=threshold=0\.125:ratio=2\.3/);
assert.match(filters,/highpass=f=80/);
assert.match(filters,/alimiter=limit=0\.94/);
assert.match(filters,/loudnorm=I=-16:TP=-1\.5:LRA=11/);
assert.equal(result.metadata.dynamicVoiceSidechain,true);
assert.equal(result.metadata.integratedLoudnessTarget,-16);
assert.equal(result.metadata.humanListeningRequired,true);
result=buildAudioMix({...base,opts:{voice:"./voice.wav"},probeAudio:probe});
assert.equal(result.audioTracks,1);
assert.ok(!result.audioInputArgs.includes("-stream_loop"));
assert.match(result.audioMap[result.audioMap.indexOf("-filter_complex")+1],/anull\[premaster\]/);
assert.equal(result.metadata.dynamicVoiceSidechain,false);
result=buildAudioMix({...base,opts:{silent:true},probeAudio:probe});
assert.equal(result.audioTracks,0);
assert.deepEqual(result.audioMap,["-an"]);
assert.throws(()=>buildAudioMix({
  ...base,duration:9,opts:{voice:"./voice.wav"},probeAudio:probe
}),/NARRATION TIMING/);
assert.throws(()=>buildAudioMix({
  ...base,project:{audio:{voiceTrim:25}},opts:{voice:"./voice.wav"},probeAudio:probe
}),/NARRATION SOURCE/);
assert.throws(()=>buildAudioMix({
  ...base,project:{audio:{musicTrim:50}},opts:{music:"./music.wav"},probeAudio:probe
}),/MUSIC TIMING/);
console.log("Motion Sound Director v2: voice-triggered ducking, speech cleanup, EBU R128, safe trims: PASS");
