#!/usr/bin/env node
/** Authored Promptence film. No need to craft a generic prompt or API key.
 * Requires local Next studio, operator Playwright/Chromium, FFmpeg.
 *
 * npm run motion:signature -- --lang en --out out/promptence-signature.mp4
 */
import { spawnSync } from "node:child_process";
import { writeFile,mkdir } from "node:fs/promises";
import { dirname,resolve } from "node:path";
import process from "node:process";
const argv=process.argv.slice(2),opts={};
for(let i=0;i<argv.length;i++){
 const flag=argv[i];
 if(flag==="--silent"){opts.silent=true;continue;}
 if(!["--lang","--format","--out","--voice","--reference","--screen","--chromium","--url","--fps"].includes(flag)){
   throw new Error("Unknown flag "+flag);
 }
 const value=argv[++i];if(!value||value.startsWith("--"))throw new Error("Value missing for "+flag);
 opts[flag.slice(2)]=value;
}
const lang=opts.lang||"en",format=opts.format||"portrait";
if(!["en","ru","hy"].includes(lang)||!["portrait","square","landscape"].includes(format))throw new Error("Invalid film locale or format");
const url=new URL(opts.url||"http://127.0.0.1:3000/motion");
if(url.protocol!=="http:"||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||url.pathname!=="/motion")throw new Error("--url must be local Studio at /motion");
const target=resolve(opts.out||"out/promptence-signature-"+lang+"-"+format+".mp4");
if(!target.toLowerCase().endsWith(".mp4"))throw new Error("Output must be .mp4");
await mkdir(dirname(target),{recursive:true});
const prefix=target.slice(0,-4);
try{
 const endpoint=new URL("/api/motion/signature?lang="+lang+"&format="+format,url);
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error("Local signature director HTTP "+response.status);
 const data=await response.json();
 if(data.project?.signatureFilm!=="promptence-answer"||data.project.scenes.length!==8)throw new Error("Signature director returned unexpected project");
 const projectPath=prefix+".motion.json";
 await writeFile(projectPath,JSON.stringify(data.project,null,2)+"\n");
 const master=[projectPath,target,"--url",url.href];
 for(const key of ["voice","reference","screen","chromium","fps"])if(opts[key])master.push("--"+key,opts[key]);
 if(opts.silent)master.push("--silent");
 const produced=spawnSync(process.execPath,["scripts/motion/render-master.mjs",...master],{stdio:"inherit",timeout:35*60*1000});
 if(produced.status!==0)throw new Error("Offline cinema master failed; see stdout and director audit.");
 const validation=spawnSync(process.execPath,["scripts/motion/verify-render.mjs",target,...(opts.silent&&!opts.voice?[]:["--require-audio"])],{stdio:"inherit",timeout:120_000});
 if(validation.status!==0)throw new Error("Rendered MP4 did not pass codec and integrity checks");
 process.stdout.write("SIGNATURE MASTER VERIFIED: "+target+"\n");
}catch(err){
 process.stderr.write("Signature Film: "+(err instanceof Error?err.message:String(err))+"\n");
 process.exitCode=1;
}
