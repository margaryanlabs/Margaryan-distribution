#!/usr/bin/env node
/** Offline native Margaryan score + actual click/tap SFX, no provider credits. */
import {readFile,writeFile,mkdir,unlink} from "node:fs/promises";
import {resolve,dirname,extname} from "node:path";
import {spawnSync} from "node:child_process";
import {validateMotionInteractionEvidence,writeEffectsPcm} from "./interaction-sound-core.mjs";
const a=process.argv.slice(2);
if(a.length!==6||a[0]!=="--evidence"||a[2]!=="--project"||a[4]!=="--out")
 throw Error("Usage: npm run motion:interaction-score -- --evidence interaction-evidence.json --project interaction-film.motion.json --out interaction-score.wav");
const evidence=JSON.parse(await readFile(resolve(a[1]),"utf8"));
const projectPath=resolve(a[3]),out=resolve(a[5]);
if(extname(out).toLowerCase()!==".wav")throw Error("Output must be WAV");
const steps=validateMotionInteractionEvidence(evidence);
if(steps<4)throw Error("Motion interaction score requires a reviewed action-rich take");
const project=JSON.parse(await readFile(projectPath,"utf8"));
const filmDuration=project.scenes?.reduce((s,x)=>s+x.seconds,0);
if(project.brand!=="promptence"||!Number.isFinite(filmDuration)||
   Math.abs(filmDuration-evidence.duration)>3)
  throw Error("Original recording and editorial project durations do not match");
await mkdir(dirname(out),{recursive:true});
const base=out.replace(/\.wav$/i,".native-score.tmp.wav");
const fx=out.replace(/\.wav$/i,".click-events.tmp.wav");
const run=(file,args)=>{
 const r=spawnSync(file,args,{encoding:"utf8",timeout:120000,maxBuffer:3000000});
 if(r.status!==0)throw Error("Sound score failed ("+file+"): "+String(r.stderr||r.stdout).slice(-1600));
};
try{
 await writeFile(fx,writeEffectsPcm(evidence));
 run(process.execPath,["scripts/motion/score-film.mjs",projectPath,base]);
 run("ffmpeg",["-y","-hide_banner","-loglevel","error",
   "-i",base,"-i",fx,"-filter_complex",
   "[0:a]volume=0.79[score];[1:a]volume=0.8[clicks];[score][clicks]amix=inputs=2:duration=first:dropout_transition=0,alimiter=limit=0.91[out]",
   "-map","[out]","-c:a","pcm_s16le",out]);
 process.stdout.write("Margaryan Interaction Score complete: "+steps+" verified actions, original music + subtle real click sound.\n"+out+"\n");
}finally{
 await Promise.all([unlink(base).catch(()=>{}),unlink(fx).catch(()=>{})]);
}
