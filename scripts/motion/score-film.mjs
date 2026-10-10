#!/usr/bin/env node
/**
 * Deterministic, original cinematic underscore from the scene timeline.
 * No samples, network, MIDI, models, or paid keys. PCM16 WAV / 44100 Hz.
 */
import { readFile, open as openFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const usage = 'Usage: node score-film.mjs <motion-project.json> <score.wav> [--rate 44100]';
const args=process.argv.slice(2);
if(args.length<2) throw new Error(usage);
const [projectFile,outputFile]=args;
const idx=args.indexOf('--rate');
const rate=idx>=0 ? Number(args[idx+1]) : 44100;
if(!Number.isInteger(rate)||rate<22050||rate>48000)throw new Error('Rate must be 22050–48000');
const project=JSON.parse(await readFile(projectFile,'utf8'));
if(!project||!Array.isArray(project.scenes)||project.scenes.length<1||project.scenes.length>8)throw new Error('Invalid storyboard');
const seconds=project.scenes.map(s=>Number(s.seconds));
if(seconds.some(x=>!Number.isFinite(x)||x<2||x>8))throw new Error('Invalid shot length');
const duration=seconds.reduce((a,b)=>a+b,0);
if(duration>64)throw new Error('Film exceeds 64 seconds');
const fps=rate;
const samples=Math.round(duration*fps);
const cues=[];
let now=0;
for(let i=0;i<seconds.length;i++){cues.push({time:now,index:i,kind:project.scenes[i].kind});now+=seconds[i];}
const seed=(Number(project.seed)||37)>>>0;
const brandOffset=[...String(project.brand||'labs')].reduce((s,x)=>s+x.charCodeAt(0),0)%6;
const scale=[0,3,5,7,10,12];
const root=44*2**((brandOffset+scale[seed%scale.length])/12);
const TWO=Math.PI*2;
const clamp=(x)=>Math.max(-1,Math.min(1,x));
const tri=(x)=>2/Math.PI*Math.asin(Math.sin(x));
const envelope=(t,len,attack,release)=>Math.max(0,Math.min(1,t/attack,(len-t)/release));
const scoreFrame=(t)=>{
 const intro=Math.min(1,t/.85),tail=Math.min(1,(duration-t)/1.35);
 const fade=Math.max(0,Math.min(intro,tail));
 let result=0;
 for(const [i,semi] of [0,7,12].entries()){
   const freq=root*2**(semi/12);
   const shimmer=1+.0019*Math.sin(TWO*.17*t+i);
   result+=.105*Math.sin(TWO*freq*t*shimmer+i*.8)*(1+.15*Math.sin(TWO*.11*t+i));
 }
 result+=.12*Math.sin(TWO*root*.5*t)*(.58+.42*Math.cos(TWO*.13*t));
 let cut=cues[0];
 for(let i=1;i<cues.length;i++){if(t<cues[i].time)break;cut=cues[i];}
 const bpm=cut.kind==='kinetic'?120:cut.kind==='network'?108:92;
 const beat=60/bpm;
 const beatPhase=t%beat;
 const beatEnv=Math.exp(-beatPhase*27);
 result+=.19*Math.sin(TWO*(64+72*Math.exp(-beatPhase*22))*beatPhase)*beatEnv;
 const snapTime=(t+beat*.5)%beat;
 const snapEnv=Math.exp(-snapTime*46);
 const sparkle=Math.sin(TWO*830*t+.6*Math.sin(TWO*1830*t))+.25*Math.sin(TWO*1660*t);
 result+=.014*snapEnv*sparkle;
 for(const cue of cues){
   if(cue.index===0)continue;
   const dt=t-cue.time;
   if(dt<-0.12||dt>.28)continue;
   const x=dt+.12;
   const e=Math.sin(Math.PI*Math.max(0,Math.min(1,x/.4)))**2;
   const freq=510+760*x/.4;
   result+=.055*e*Math.sin(TWO*freq*x+cue.index*.5);
 }
 return clamp(Math.tanh(result*.95)*Math.pow(fade,.8)*.64);
};
await mkdir(dirname(resolve(outputFile)),{recursive:true});
const out=await openFile(resolve(outputFile),'w');
try{
 const dataLength=samples*2;
 const head=Buffer.alloc(44);
 head.write('RIFF',0);head.writeUInt32LE(36+dataLength,4);head.write('WAVEfmt ',8);
 head.writeUInt32LE(16,16);head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);
 head.writeUInt32LE(fps,24);head.writeUInt32LE(fps*2,28);head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);
 head.write('data',36);head.writeUInt32LE(dataLength,40);
 await out.write(head);
 const chunk=Buffer.alloc(8192*2);
 for(let base=0;base<samples;base+=8192){
   const count=Math.min(8192,samples-base);
   for(let i=0;i<count;i++)chunk.writeInt16LE(Math.round(scoreFrame((base+i)/fps)*32767),i*2);
   await out.write(chunk,0,count*2);
 }
} finally {await out.close();}
process.stdout.write(JSON.stringify({file:resolve(outputFile),duration,rate,samples,brand:project.brand,cuts:cues.map(x=>Number(x.time.toFixed(3))),note:'Original synthesized audio, no samples, voiceover, or third-party music'})+'\n');
