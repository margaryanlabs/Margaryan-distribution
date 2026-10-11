#!/usr/bin/env node
/**
 * PROMPTENCE / 2:48 FEATURE FILM — Motion OS existing Cinema Master sequencer.
 * This is a separate, operator-local export over multiple <=8-shot Motion
 * projects. It does not change editor limits, mock AI provider results, invoke
 * paid video generation, upload media, or claim studio-level visual parity with
 * the independently composed reference film.
 *
 * Requires running local Next Motion Studio, Playwright Chromium and FFmpeg.
 * npm run motion:feature -- --out out/promptence-feature-168s.mp4
 */
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, dirname, join, basename } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const allowed=new Set(["--out","--manifest","--url","--fps","--voice"]);
const flags={};
for(let i=0;i<process.argv.slice(2).length;i++){
  const argv=process.argv.slice(2),k=argv[i];
  if(!allowed.has(k))throw Error("Unknown flag: "+k);
  const v=argv[++i];if(!v||v.startsWith("--"))throw Error("Missing value for "+k);
  flags[k.slice(2)]=v;
}
const manifestFile=resolve(flags.manifest||"editorial/motion/promptence-feature-film-168s.manifest.json");
const out=resolve(flags.out||"out/promptence-feature-168s.mp4");
const baseUrl=new URL(flags.url||"http://127.0.0.1:3000/motion");
if(baseUrl.protocol!=="http:"||!["localhost","127.0.0.1","[::1]"].includes(baseUrl.hostname)||baseUrl.pathname!=="/motion"){
  throw Error("Local Motion Studio /motion required. No arbitrary URL/screenshot downloads.");
}
if(!out.endsWith(".mp4"))throw Error("Output must be MP4.");
const manifest=JSON.parse(await readFile(manifestFile,"utf8"));
if(manifest.version!==1||manifest.brand!=="promptence"||manifest.format!=="portrait"
  ||!Array.isArray(manifest.chapters)||manifest.chapters.length<9||manifest.chapters.length>60){
  throw Error("Invalid feature-film storyboard");
}
if(manifest.chapters.some(s=>!s||typeof s.headline!=="string"||typeof s.support!=="string"
  ||s.headline.length>105||s.support.length>180||!Number.isFinite(s.seconds)||s.seconds<2||s.seconds>8)){
  throw Error("Invalid shot; use author-approved 2–8 second steps. A genuine screenshot requires manual --screen approval.");
}
const duration=manifest.chapters.reduce((s,c)=>s+c.seconds,0);
if(duration!==168||manifest.durationSeconds!==168)throw Error("Expected exact 168s storyboard, got "+duration);
const chunks=[];
for(let i=0;i<manifest.chapters.length;i+=8)chunks.push(manifest.chapters.slice(i,i+8));
await mkdir(dirname(out),{recursive:true});
const work=resolve(dirname(out),basename(out,".mp4")+"-motion-segments");
await mkdir(work,{recursive:true});
const command=(exe,args,timeout=40*60*1000)=>{
 const run=spawnSync(exe,args,{stdio:"inherit",timeout});
 if(run.status!==0)throw Error(exe+" failed, exit "+run.status+". Motion workstation and visual review required.");
};
const segmentOutputs=[];
for(let k=0;k<chunks.length;k++){
 const project={
  version:1,title:"PROMPTENCE / FEATURE FILM / PART "+(k+1)+"/"+chunks.length,
  brand:"promptence",format:"portrait",language:"en",style:"cinematic",
  seed:20261011+k,
  scenes:chunks[k].map((s,i)=>({
   id:"scene-"+(i+1),kind:s.kind==="screen"?"opener":s.kind,
   eyebrow:s.eyebrow,headline:s.headline,support:s.support,seconds:s.seconds,
   typographyScale:.85
  }))
 };
 // No signatureFilm flag: signature art index mapping was authored only
 // for the original 8-shot commercial and is not equivalent to this new 23-shot film.
 const j=join(work,"segment-"+String(k+1).padStart(2,"0")+".motion.json");
 const video=join(work,"segment-"+String(k+1).padStart(2,"0")+".mp4");
 await writeFile(j,JSON.stringify(project,null,2)+"\n");
 const args=["scripts/motion/render-master.mjs",j,video,"--url",baseUrl.href];
 if(flags.fps)args.push("--fps",flags.fps);
 process.stdout.write("Rendering part "+(k+1)+"/"+chunks.length+"\n");
 command(process.execPath,args);
 segmentOutputs.push(video);
}
const concatFile=join(work,"concat.txt");
await writeFile(concatFile,segmentOutputs.map(x=>"file '"+x.replaceAll("'","'\\''")+"'").join("\n")+"\n");
const stitched=out.replace(/\.mp4$/i,"-stitched.mp4");
command("ffmpeg",["-y","-hide_banner","-loglevel","error","-f","concat","-safe","0","-i",concatFile,
  "-c","copy","-movflags","+faststart",stitched],120000);
if(flags.voice){
 const st=await stat(resolve(flags.voice));
 if(!st.isFile()||st.size>250_000_000)throw Error("Invalid owner-approved narration");
 command("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",stitched,"-i",resolve(flags.voice),
   "-filter_complex","[0:a:0]volume=0.19[a0];[1:a:0]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]",
   "-map","0:v","-map","[aout]","-c:v","copy","-c:a","aac","-b:a","192k","-t","168","-movflags","+faststart",out],120000);
}else{
 command("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",stitched,
   "-t","168","-c","copy","-movflags","+faststart",out],120000);
}
const probe=spawnSync("ffprobe",["-v","error","-show_entries","format=duration",
  "-of","default=noprint_wrappers=1:nokey=1",out],{encoding:"utf8",timeout:30000});
if(probe.status!==0)throw Error("Final MP4 ffprobe failed");
const actual=Number(probe.stdout.trim());
if(Math.abs(actual-168)>1.2)throw Error("Unexpected duration "+actual);
process.stdout.write("PROMPTENCE FEATURE MASTER / LOCAL: "+out+" / "+actual+"s. Manual film quality review required.\n");
