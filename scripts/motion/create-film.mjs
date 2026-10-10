#!/usr/bin/env node
/**
 * Single-command offline director:
 * npm run motion:film -- --brand promptence --lang en --brief "..." --out film.mp4
 *
 * Optional --repo owner/name for source inspection (operator-scoped GitHub
 * access for private repositories), --voice mp3, --music mp3, --fps 30.
 *
 * Deliberately does not auto-publish assets or media.
 */
import { spawn, spawnSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

function args(input){
  const opt={};
  for(let i=0;i<input.length;i++){
    const value=input[i];
    if(!value.startsWith("--"))throw Error("Unexpected argument: "+value);
    const key=value.slice(2),next=input[++i];
    if(key==="silent"){opt.silent=true;continue;}
    if(!["brand","lang","brief","out","repo","format","style","voice","music","fps","url","chromium"].includes(key))throw Error("Unknown flag --"+key);
    if(!next||next.startsWith("--"))throw Error("Missing value for "+key);
    opt[key]=next;
  }
  if(!opt.brand||!opt.lang||!opt.brief||!opt.out)throw Error("Required: --brand --lang --brief --out");
  if(!["en","ru","hy"].includes(opt.lang))throw Error("Language must be en, ru or hy");
  if(!["portrait","square","landscape"].includes(opt.format||"portrait"))throw Error("Unknown format");
  if(!["cinematic","kinetic","technical"].includes(opt.style||"cinematic"))throw Error("Unknown style");
  if(!/^[a-z_]+$/.test(opt.brand))throw Error("Invalid brand ID");
  if(opt.brief.length<6||opt.brief.length>2000)throw Error("Creative brief must be 6–2000 characters");
  return opt;
}
async function script(file,params,quiet=false){
  const child=spawn(process.execPath,[file,...params],{stdio:quiet?["ignore","pipe","inherit"]:"inherit",env:process.env});
  let buffer="";
  if(quiet)child.stdout.on("data",d=>{buffer+=d.toString();if(buffer.length>2_000_000)child.kill();});
  const status=await new Promise((resolve,reject)=>{child.on("error",reject);child.on("close",resolve);});
  if(status!==0)throw Error(file+" exited with status "+status);
  return buffer;
}
try{
  const opt=args(process.argv.slice(2));
  const origin=opt.url||"http://127.0.0.1:3000/motion";
  const url=new URL(origin);
  if(url.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(url.hostname)||url.pathname!=="/motion")throw Error("--url must be the local Studio");
  const output=resolve(opt.out);
  if(!output.endsWith(".mp4"))throw Error("Use .mp4 output extension");
  await mkdir(dirname(output),{recursive:true});
  const prefix=output.slice(0,-4);

  if(opt.repo){
    if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(opt.repo))throw Error("Invalid owner/repo");
    const evidence=await script("scripts/motion/scan-repository.mjs",[opt.repo],true);
    const report=JSON.parse(evidence);
    await writeFile(prefix+".source-candidates.json",JSON.stringify(report,null,2)+"\n");
    process.stdout.write("Repo inspected (candidate assets require brand review): "+report.repository+"\n");
  }
  const endpoint=new URL("/api/motion/storyboard",origin);
  const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({
      prompt:opt.brief,brand:opt.brand,format:opt.format||"portrait",
      language:opt.lang,style:opt.style||"cinematic"
    }),signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw Error("Keyless director HTTP "+response.status+": "+(await response.text()).slice(0,600));
  const payload=await response.json();
  if(!payload.project||payload.requiresApiKey!==false)throw Error("Unexpected director response");
  const project=payload.project;
  if(!Array.isArray(project.scenes)||!project.scenes.length)throw Error("Director returned an empty storyboard");
  const projectFile=prefix+".motion.json";
  await writeFile(projectFile,JSON.stringify(project,null,2)+"\n");
  process.stdout.write("Storyboard saved: "+projectFile+" ("+project.scenes.length+" shots)\n");
  const childArgs=[projectFile,output,"--url",url.href];
  if(opt.voice)childArgs.push("--voice",opt.voice);
  if(opt.music)childArgs.push("--music",opt.music);
  if(opt.silent)childArgs.push("--silent");
  if(opt.fps)childArgs.push("--fps",opt.fps);
  if(opt.chromium)childArgs.push("--chromium",opt.chromium);
  await script("scripts/motion/render-master.mjs",childArgs);
  // The media QA process validates the actual encoded file, not a pretend success signal.
  const verdict=spawnSync(process.execPath,["scripts/motion/verify-render.mjs",output,
    ...(!opt.silent||opt.voice||opt.music?["--require-audio"]:[])],{stdio:"inherit",timeout:120_000});
  if(verdict.status!==0)throw Error("Encoded film failed media QA");
  process.stdout.write("FILM COMPLETE: "+output+"\n");
}catch(error){
  process.stderr.write("Motion Film: "+(error instanceof Error?error.message:String(error))+"\n");
  process.exitCode=1;
}
