#!/usr/bin/env node
/** Measured loudness of the actual encoded video, not a creative certification. */
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
export function parseLoudnormMeasurement(log){
 const start=log.lastIndexOf("{\n");
 if(start<0)throw Error("SOUND QA: FFmpeg loudness measurement missing");
 const end=log.indexOf("}",start);
 if(end<0)throw Error("SOUND QA: FFmpeg JSON incomplete");
 let data;
 try{data=JSON.parse(log.slice(start,end+1));}
 catch{throw Error("SOUND QA: invalid FFmpeg loudness JSON");}
 if(!("input_i" in data)||!("input_tp" in data)||!("input_lra" in data))
  throw Error("SOUND QA: incomplete loudness result");
 const integrated=Number(data.input_i),truePeak=Number(data.input_tp),lra=Number(data.input_lra);
 if(!Number.isFinite(integrated)||!Number.isFinite(truePeak)||!Number.isFinite(lra))
  throw Error("SOUND QA: audio is silent or cannot be measured");
 return {integratedLUFS:integrated,truePeakDBTP:truePeak,loudnessRangeLU:lra};
}
export function judgeAudioMaster(measurement){
 const warnings=[];
 if(measurement.integratedLUFS< -23.5)warnings.push("Integrated loudness extremely quiet; review audio levels.");
 if(measurement.integratedLUFS> -10.0)warnings.push("Integrated loudness too aggressive; review limiter/normalization.");
 if(measurement.truePeakDBTP> -0.3)warnings.push("Encoded audio has high true peaks; inspect distortion.");
 return {state:warnings.length?"review":"measured",warnings,measurement,
  voiceNaturalnessVerified:false,musicLicenseVerified:false,humanListeningRequired:true};
}
export function inspectAudioMaster(file){
 const source=resolve(file);
 const check=spawnSync("ffprobe",["-v","error","-select_streams","a:0",
  "-show_entries","stream=codec_name","-of","default=noprint_wrappers=1:nokey=1",source],{
   timeout:12000,encoding:"utf8",maxBuffer:50000});
 if(check.status!==0||!check.stdout.trim())throw Error("SOUND QA: encoded MP4 has no audio track");
 const run=spawnSync("ffmpeg",["-hide_banner","-nostats","-i",source,"-vn",
   "-af","loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json","-f","null","-"],{
   timeout:90000,encoding:"utf8",maxBuffer:300000});
 if(run.status!==0)throw Error("SOUND QA: final MP4 analysis failed: "+String(run.stderr).slice(-350));
 return {codec:check.stdout.trim(),...judgeAudioMaster(parseLoudnormMeasurement(run.stderr))};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try{
  if(process.argv.length!==3)throw Error("Usage: node qa-master-audio.mjs final.mp4");
  const result=inspectAudioMaster(process.argv[2]);
  process.stdout.write(JSON.stringify(result)+"\n");
  if(result.state!=="measured")process.exitCode=2;
 }catch(e){process.stderr.write(String(e.message||e)+"\n");process.exitCode=1;}
}
