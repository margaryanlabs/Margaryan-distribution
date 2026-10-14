#!/usr/bin/env node
/**
 * Motion Studio Cinematic Engine 2.0 / native Cycles master
 * Runs Blender's actual ray-traced geometry render -> FFmpeg H.264 MP4.
 * Requires an owner-approved authentic product screenshot and a real Blender binary.
 * Never substitutes motion of a static image or fake metrics.
 */
import {spawnSync} from "node:child_process";
import {existsSync,mkdirSync,readFileSync,writeFileSync,statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
function options(argv){
  if(!argv[0])throw Error("Usage: node scripts/motion/render-cycles-promptence.mjs out.mp4 --screen /verified/public.png --blender /path/to/blender [--width 1280 --height 720 --samples 32 --start 1 --end 48] [--music original.wav] [--dry-run]");
  const o={output:path.resolve(argv[0]),blender:process.env.BLENDER_BIN||"blender",
    width:1280,height:720,samples:32,start:1,end:48,dryRun:false,encodeOnly:false,screen:null,music:null,scene:"v20"};
  for(let i=1;i<argv.length;i++){
    const k=argv[i];
    if(k==="--dry-run"){o.dryRun=true;continue;}
    if(k==="--encode-only"){o.encodeOnly=true;continue;}
    if(!["--screen","--blender","--width","--height","--samples","--start","--end","--music","--scene"].includes(k))
      throw Error("Unrecognized argument: "+k);
    if(!argv[++i])throw Error("Missing value for "+k);
    const v=argv[i];
    if(k==="--screen")o.screen=path.resolve(v);
    else if(k==="--blender")o.blender=v;
    else if(k==="--music")o.music=path.resolve(v);
    else if(k==="--scene")o.scene=v;
    else o[k.slice(2)]=Number(v);
  }
  if(!["v20","v21"].includes(o.scene))throw Error("Unknown Cycles scene, must be v20 or v21");
  if(path.extname(o.output).toLowerCase()!==".mp4")throw Error("Output must be .mp4");
  if(!o.screen)throw Error("Use --screen with a genuine owner-approved capture");
  if (![o.width,o.height,o.samples,o.start,o.end].every(Number.isInteger))
    throw Error("Render dimensions/frame settings must be integers");
  if(o.width<640||o.width>3840||o.height<360||o.height>2160)
    throw Error("Resolution out of safety range");
  if(Math.abs(o.width/o.height-16/9)>.001)throw Error("Only true 16:9 masters supported");
  if(o.samples<4||o.samples>1024)throw Error("Samples outside supported range");
  if(o.start<1||o.end>96||o.end<o.start||o.end-o.start>95)
    throw Error("Choose valid frames 1–96 and <=96 frames per master");
  if(!o.dryRun){
    if(!existsSync(o.screen)||statSync(o.screen).size<1024)
      throw Error("Approved screenshot absent or suspiciously small");
    if(o.music && !existsSync(o.music))throw Error("Original/approved music file missing");
  }
  return o;
}
function run(command,args,timeout){
  const x=spawnSync(command,args,{cwd:ROOT,encoding:"utf8",stdio:"inherit",timeout});
  if(x.error)throw Error(command+" spawn failed: "+x.error.message);
  if(x.status!==0)throw Error(command+" failed with status "+x.status);
}
function probe(mp4){
  const r=spawnSync("ffprobe",["-v","error","-count_frames","-show_entries",
    "format=duration,size:stream=codec_name,width,height,avg_frame_rate,nb_read_frames",
    "-of","json",mp4],{encoding:"utf8",timeout:30000});
  if(r.status!==0)throw Error("FFprobe could not verify master: "+r.stderr);
  return JSON.parse(r.stdout);
}
async function main(){
  const o=options(process.argv.slice(2));
  const n=o.end-o.start+1;
  const plan={
    title:"PROMPTENCE / Cinematic Engine 2.0",
    source:o.screen,authenticProductSource:true,engine:"Blender Cycles (ray tracing)",
    width:o.width,height:o.height,fps:24,frames:n,durationSeconds:n/24,
    samples:o.samples,output:o.output,score:o.music,scene:o.scene,encodeOnly:o.encodeOnly,
    publicationApproved:false,
    note:"Decoder/frame verification is not commercial creative approval"
  };
  if(o.dryRun){console.log(JSON.stringify(plan,null,2));return;}
  mkdirSync(path.dirname(o.output),{recursive:true});
  const base=o.output.slice(0,-4);
  const frameDir=base+"_cycles_frames";
  const blend=base+"_editable.blend";
  mkdirSync(frameDir,{recursive:true});
  const script=path.join(ROOT,"scripts/motion/",o.scene==="v21" ? "cycles-promptence-studio-v21.py" : "cycles-promptence-studio.py");
  const args=["-b","-t","6","--python",script,"--",
    "--screenshot",o.screen,"--output",frameDir,"--save-blend",blend,
    "--width",String(o.width),"--height",String(o.height),
    "--samples",String(o.samples),"--frames",o.start+":"+o.end,"--sequence"];
  if(o.encodeOnly){
    if(!existsSync(blend)||statSync(blend).size<30000)
      throw Error("Encode-only requires a real editable packed .blend from this output path");
  }else{
    run(o.blender,args,40*60*1000);
  }
  for(let i=o.start;i<=o.end;i++){
    const frame=path.join(frameDir,"frame_"+String(i).padStart(4,"0")+".png");
    if(!existsSync(frame)||statSync(frame).size<10000)
      throw Error("Cycles did not produce acceptable frame "+i);
  }
  const ffargs=["-y","-hide_banner","-loglevel","warning",
    "-framerate","24","-start_number",String(o.start),
    "-i",path.join(frameDir,"frame_%04d.png")];
  if(o.music)ffargs.push("-i",o.music);
  ffargs.push("-map","0:v:0");
  if(o.music)ffargs.push("-map","1:a:0");
  ffargs.push("-frames:v",String(n),"-c:v","libx264","-preset","slow",
    "-crf","16","-pix_fmt","yuv420p");
  if(o.music)ffargs.push("-c:a","aac","-b:a","192k","-af",
    "atrim=0:"+String(n/24)+",afade=t=out:st="+String(Math.max(.1,n/24-.35))+":d=0.3");
  else ffargs.push("-an");
  ffargs.push("-movflags","+faststart",o.output);
  run("ffmpeg",ffargs,600000);
  const data=probe(o.output);
  const video=data.streams.find(s=>s.codec_name==="h264");
  if(!video||video.width!==o.width||video.height!==o.height)
    throw Error("Rendered MP4 does not match H.264 or source resolution");
  if(video.nb_read_frames!==undefined&&Number(video.nb_read_frames)!==n)
    throw Error("Incorrect encoded frame count");
  if(Math.abs(Number(data.format.duration)-n/24)>.12)
    throw Error("Incorrect video duration");
  // Photometric sanity: four distinct rendered time points, not one static render.
  // FFmpeg outputs raw 48×27 luma planes so no native-image npm dependency is needed.
  const stamps=[.08,.32,.65,.92].map(v=>v*n/24);
  const probes=[];
  for(const t of stamps){
    const sample=spawnSync("ffmpeg",["-v","error","-ss",String(t),"-i",o.output,
      "-frames:v","1","-vf","scale=48:27,format=gray",
      "-f","rawvideo","-pix_fmt","gray","-"],{encoding:null,timeout:30000});
    if(sample.status!==0||sample.stdout.length!==48*27)
      throw Error("Cannot inspect native Cycles video framebuffer");
    const px=sample.stdout;
    let sum=0;for(const n of px)sum+=n;
    probes.push({time:+t.toFixed(3),mean:+(sum/px.length).toFixed(2),bytes:px});
  }
  if(probes.some(p=>p.mean<4))throw Error("Black or underexposed Cycles output blocked");
  let changed=0;
  for(let i=1;i<probes.length;i++){
    let diff=0;
    const current=probes[i].bytes,previous=probes[i-1].bytes;
    for(let j=0;j<current.length;j++)diff+=Math.abs(current[j]-previous[j]);
    const mae=diff/current.length;
    if(mae>.24)changed++;
    probes[i].mae=+mae.toFixed(3);
  }
  if(changed<2)throw Error("Frozen/near-static Cycles camera output blocked");
  plan.visualQA=probes.map(({bytes,...summary})=>summary);
  plan.ffprobe=data;
  plan.blend=blend;plan.framesDirectory=frameDir;
  plan.verification="Codec/frame checks PASSED; creative quality requires human inspection";
  writeFileSync(base+".qa.json",JSON.stringify(plan,null,2));
  console.log("CINEMA2_REAL_CYCLES_MP4_VALIDATED",o.output);
}
main().catch(e=>{console.error("CINEMA2_RELEASE_BLOCKED",e.message);process.exitCode=1});
