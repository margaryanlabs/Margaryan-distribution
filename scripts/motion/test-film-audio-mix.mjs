#!/usr/bin/env node
import assert from "node:assert/strict";
import {MAX_AUDIO_SOURCE_BYTES,soundtrackConfig,validateSoundSource,prepareFilmAudio} from "../../lib/motion/film-audio-mix.ts";

const fake=(name,type="audio/mpeg",size=3000)=>({name,type,size});
assert.doesNotThrow(()=>validateSoundSource(fake("approved-narration.mp3"),"voice"));
assert.doesNotThrow(()=>validateSoundSource(fake("licensed.wav","audio/wav"),"music"));
assert.doesNotThrow(()=>validateSoundSource(fake("client.m4a","audio/mp4"),"voice"));
assert.throws(()=>validateSoundSource(fake("secret.exe"),"music"),/approved local audio/);
assert.throws(()=>validateSoundSource(fake("../escape.mp3"),"voice"),/approved local audio/);
assert.throws(()=>validateSoundSource(fake("source.mp3","application/octet-stream"),"voice"),/supported audio container/);
assert.throws(()=>validateSoundSource(fake("too-big.wav","audio/wav",MAX_AUDIO_SOURCE_BYTES+1),"voice"),/40MB/);
assert.throws(()=>validateSoundSource(fake("empty.wav","audio/wav",0),"voice"),/40MB/);
assert.throws(()=>soundtrackConfig(120,true,true,false),/ownership\/licensing/);
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
// Runtime contract: approved audio must create a recording track, play
// narration once, loop licensed music and release decoded memory on stop.
const sources=[],gains=[],tracks=[{stopped:false,stop(){this.stopped=true;}}];
let contextClosed=false;
class MockContext{
  currentTime=15;
  destination={name:"local-speakers"};
  async resume(){}
  async decodeAudioData(data){assert.ok(data.byteLength>=128);return {duration:6};}
  createMediaStreamDestination(){return {name:"recorder-bus",stream:{
    getAudioTracks:()=>tracks,getTracks:()=>tracks
  }};}
  createBufferSource(){
    const node={loop:false,buffer:null,connections:[],started:false,stopped:false,
      connect(target){this.connections.push(target);},
      start(t){this.started=t;},
      stop(t){this.stopped=t;}};
    sources.push(node);return node;
  }
  createGain(){
    const gain={events:[],setValueAtTime(v,t){this.events.push(["set",v,t]);},
      linearRampToValueAtTime(v,t){this.events.push(["ramp",v,t]);}};
    const node={gain,connections:[],connect(target){this.connections.push(target);}};
    gains.push(node);return node;
  }
  async close(){contextClosed=true;}
}
globalThis.window={AudioContext:MockContext};
const local=name=>({name,type:"audio/wav",size:3000,
  async arrayBuffer(){return new Uint8Array(3000).buffer;}});
assert.equal(await prepareFilmAudio({voice:null,music:null},120,false),null);
await assert.rejects(()=>prepareFilmAudio({voice:local("voice.wav"),music:null},120,false),/ownership/);
const session=await prepareFilmAudio({voice:local("voice.wav"),music:local("music.wav")},120,true);
assert.equal(session.stream.getAudioTracks().length,1);
await session.start();
assert.equal(sources.length,2);
assert.equal(sources[0].loop,false);
assert.equal(sources[1].loop,true);
assert.ok(sources.every(x=>x.started>0));
assert.ok(gains.every(x=>x.connections.length===2));
assert.ok(gains[1].gain.events.some(x=>x[0]==="ramp"&&x[1]===0.19));
await assert.rejects(()=>session.start(),/already started/);
await session.close();
await session.close();
assert.ok(tracks[0].stopped&&contextClosed);
delete globalThis.window;
console.log("Motion full-film approved soundtrack: source size/type, explicit rights, no key/no TTS, 120–192s and voice ducking PASS");
