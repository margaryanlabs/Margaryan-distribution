#!/usr/bin/env node
/** Motion OS export preflight. Requires system ffprobe; ffmpeg optional. */
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const media=process.argv[2];
const expectVoice=process.argv.includes("--require-audio");
if (!media){process.stderr.write("Usage: npm run motion:verify -- /path/to/video.mp4 [--require-audio]\n");process.exit(2);}
try {
  if(statSync(media).size<100_000)throw new Error("Media file is unexpectedly small");
  const probe=spawnSync("ffprobe",["-v","error","-show_format","-show_streams","-of","json",media],{encoding:"utf8",timeout:60_000,maxBuffer:4_000_000});
  if(probe.error||probe.status!==0)throw new Error("ffprobe failed; install FFmpeg or check media file");
  const info=JSON.parse(probe.stdout);
  const video=info.streams?.find(x=>x.codec_type==="video");
  const audio=info.streams?.find(x=>x.codec_type==="audio");
  const duration=Number(info.format?.duration);
  const failures=[],warnings=[];
  if(!video)failures.push("No video stream");
  if(!Number.isFinite(duration)||duration<2||duration>65)failures.push("Unexpected or unparseable duration");
  if(video&&Math.min(video.width,video.height)<600)warnings.push("Video below target resolution");
  if(video&&video.pix_fmt&&!["yuv420p","yuvj420p"].includes(video.pix_fmt))warnings.push("Pixel format may not play on all mobile devices");
  if(video&&video.codec_name!=="h264")warnings.push("Final social MP4 ideally needs H.264 encoding");
  if(expectVoice&&!audio)failures.push("Audio required but audio stream missing");
  if(audio&&audio.codec_name!=="aac"&&path.extname(media).toLowerCase()===".mp4")warnings.push("MP4 audio may not use universal AAC codec");
  const frameRate=video?.avg_frame_rate||"0/1";
  const [fnum,fden]=frameRate.split("/").map(Number);
  const fps=fden?fnum/fden:0;
  if(fps<24)warnings.push("Frame rate below 24 FPS");
  const black=spawnSync("ffmpeg",["-hide_banner","-v","info","-i",media,"-vf","blackdetect=d=0.4:pix_th=0.07","-an","-f","null","-"],
    {encoding:"utf8",timeout:120_000,maxBuffer:2_000_000});
  if(black.status===0){
    const spans=[...black.stderr.matchAll(/black_start:([0-9.]+)\s+black_end:([0-9.]+)\s+black_duration:([0-9.]+)/g)]
      .map(m=>({start:Number(m[1]),end:Number(m[2]),seconds:Number(m[3])}));
    if(spans.some(x=>x.seconds>0.8))warnings.push("Possible blank black segment over 0.8s detected");
  } else warnings.push("Black-frame scan unavailable; inspect rendered film manually");
  const report={ok:failures.length===0,file:path.basename(media),duration,fps,
    resolution:video?video.width+"x"+video.height:null,videoCodec:video?.codec_name||null,
    audioCodec:audio?.codec_name||null,failures,warnings,
    notes:"Automated media checks cannot verify original logo fidelity, subtitles, language quality, voice clarity or creative excellence."};
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.ok)process.exitCode=1;
} catch(e){process.stderr.write("Motion QA failed: "+(e instanceof Error?e.message:String(e))+"\n");process.exitCode=1;}
