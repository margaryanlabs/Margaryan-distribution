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
result=buildAudioMix({...base,opts:{voice:"./voice.wav"},probeAudio:probe});
assert.equal(result.audioTracks,1);
assert.ok(!result.audioInputArgs.includes("-stream_loop"));
assert.match(result.audioMap[result.audioMap.indexOf("-filter_complex")+1],/anull\[aout\]/);
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
console.log("Motion FFmpeg audio multitrack mix / offsets / safe trims: PASS");
