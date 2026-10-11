#!/usr/bin/env node
import assert from "node:assert/strict";
import {MAX_AUDIO_SOURCE_BYTES,soundtrackConfig,validateSoundSource} from "../../lib/motion/film-audio-mix.ts";

const fake=(name,type="audio/mpeg",size=3000)=>({name,type,size});
assert.doesNotThrow(()=>validateSoundSource(fake("approved-narration.mp3"),"voice"));
assert.doesNotThrow(()=>validateSoundSource(fake("licensed.wav","audio/wav"),"music"));
assert.doesNotThrow(()=>validateSoundSource(fake("client.m4a","audio/mp4"),"voice"));
assert.throws(()=>validateSoundSource(fake("secret.exe"),"music"),/approved local audio/);
assert.throws(()=>validateSoundSource(fake("../escape.mp3"),"voice"),/approved local audio/);
assert.throws(()=>validateSoundSource(fake("source.mp3","application/octet-stream"),"voice"),/supported audio container/);
assert.throws(()=>validateSoundSource(fake("too-big.wav","audio/wav",MAX_AUDIO_SOURCE_BYTES+1),"voice"),/40MB/);
assert.throws(()=>validateSoundSource(fake("empty.wav","audio/wav",0),"voice"),/40MB/);
assert.throws(()=>soundtrackConfig(120,true,true,false),/rights/);
assert.deepEqual(soundtrackConfig(120,false,false,false),{
  seconds:120,hasVoice:false,hasMusic:false,voiceVolume:1,musicVolume:0.7,fadeIn:0.18,fadeOut:0.8,mode:"silent"
});
const mixed=soundtrackConfig(120,true,true,true);
assert.equal(mixed.mode,"approved-local-audio");
assert.equal(mixed.musicVolume,0.19);
assert.equal(mixed.voiceVolume,1);
assert.equal(soundtrackConfig(192,false,true,true).musicVolume,0.7);
assert.throws(()=>soundtrackConfig(193,false,false,false),/2–192/);
assert.throws(()=>soundtrackConfig(Infinity,false,false,false),/2–192/);
console.log("Motion full-film approved soundtrack: source size/type, explicit rights, no key/no TTS, 120–192s and voice ducking PASS");
