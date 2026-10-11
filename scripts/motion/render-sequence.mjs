#!/usr/bin/env node
/**
 * Margaryan Motion OS / Film Sequence operator master.
 *
 * Usage:
 * npm run motion:sequence -- film.motion-sequence.json out/film.mp4 --dry-run
 * npm run motion:sequence -- film.motion-sequence.json out/film.mp4 --fps 30
 *
 * Requires running local Motion Studio, Playwright Chromium and FFmpeg.
 * No paid AI/video API; real source files require explicit local media-map.
 */
import {readFile,writeFile,mkdir,rename,stat} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {resolve,dirname,join,basename,extname} from "node:path";
import {validateFilmSequence,escapeConcatFilePath} from "./film-sequence-core.mjs";

function parse(argv){
  const positional=[],options={};
  for(let i=0;i<argv.length;i++){
    const x=argv[i];
    if(x==="--dry-run"||x==="--silent"){
      options[x.slice(2)]=true;continue;
    }
    if(x.startsWith("--")){
      const key=x.slice(2);
      if(!["url","fps","crf","voice","music","media-map","chromium"].includes(key))
        throw Error("Unknown flag "+x);
      const value=argv[++i];
      if(!value||value.startsWith("--"))throw Error("Missing value for "+x);
      options[key]=value;
    }else positional.push(x);
  }
  if(positional.length!==2)throw Error("Usage: motion:sequence -- manifest.json film.mp4 [--dry-run] [--url local-Motion] [--voice local.wav] [--music licensed.mp3] [--media-map map.json] [--fps 30] [--crf 18]");
  const url=new URL(options.url||"http://127.0.0.1:3000/motion");
  if(url.protocol!=="http:"||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||url.pathname!=="/motion")
    throw Error("Render URL must be local Motion Studio (/motion)");
  const fps=Number(options.fps||30),crf=Number(options.crf||18);
  if(!Number.isInteger(fps)||fps<24||fps>60)throw Error("FPS must be 24–60");
  if(!Number.isInteger(crf)||crf<14||crf>28)throw Error("CRF must be 14–28");
  const outfile=resolve(positional[1]);
  if(extname(outfile).toLowerCase()!==".mp4")throw Error("Output must be an MP4");
  return {manifestPath:resolve(positional[0]),outfile,url,fps,crf,options};
}
function run(exe,args,timeout=45*60*1000){
  const p=spawnSync(exe,args,{stdio:"inherit",timeout});
  if(p.error||p.status!==0)throw Error(exe+" returned exit "+p.status+(p.error?": "+p.error.message:""));
}
function probe(path){
  const p=spawnSync("ffprobe",["-v","error","-show_entries",
    "format=duration:stream=index,codec_name,codec_type,width,height","-of","json",path],
    {encoding:"utf8",timeout:60_000,maxBuffer:200000});
  if(p.error||p.status!==0)throw Error("ffprobe failed on final film");
  return JSON.parse(p.stdout);
}
function onScreenCaptions(sequence){
  const cues=[];let t=0;
  const clock=time=>{
    const m=Math.floor(time/60_000);
    const s=Math.floor((time-m*60_000)/1000);
    const ms=Math.floor(time%1000);
    return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")+":"+
      String(s).padStart(2,"0")+","+String(ms).padStart(3,"0");
  };
  for(const part of sequence.chapters)for(const scene of part.project.scenes){
    const start=Math.round(t*1000),end=Math.round((t+scene.seconds)*1000);
    // These captions reproduce designed on-screen copy, NOT transcribed narration.
    cues.push(String(cues.length+1)+"\n"+clock(start)+" --> "+clock(end)+"\n"+
      scene.headline.trim().replace(/[\r\n]+/g," ")+"\n");
    t+=scene.seconds;
  }
  return cues.join("\n")+"\n";
}
async function localAudio(path,label){
  const resolved=resolve(path);
  const info=await stat(resolved);
  if(!info.isFile()||info.size<100||info.size>250_000_000)
    throw Error(label+" must be an operator-approved local file under 250 MB");
  const meta=probe(resolved);
  const audio=meta.streams?.find(x=>x.codec_type==="audio");
  const length=Number(meta.format?.duration);
  if(!audio||!Number.isFinite(length)||length<=0)throw Error(label+" has no decodable audio stream");
  return {path:resolved,duration:length};
}
async function main(){
  const {manifestPath,outfile,url,fps,crf,options}=parse(process.argv.slice(2));
  const info=await stat(manifestPath);
  if(!info.isFile()||info.size>300_000||info.size<30)throw Error("Sequence manifest must be 30B–300KB");
  const film=validateFilmSequence(JSON.parse(await readFile(manifestPath,"utf8")));
  const outputPlan={
    engine:"Margaryan Motion Film Sequence / operator-local v1",title:film.title,
    brand:film.brand,format:film.format,chapters:film.chapters.length,
    shots:film.shots,expectedDurationSeconds:film.durationSeconds,
    soundtrack:options.silent?"silent":options.music?"approved licensed music":
      options.voice?"approved narration":"original chapter soundtracks",
    timeline:film.chapters.map(({id,title,startSeconds,durationSeconds,shots})=>({id,title,startSeconds,durationSeconds,shots})),
    noOpenAiApiKey:true,cloudRender:false,requiresLocalChromiumFFmpeg:true
  };
  if(options["dry-run"]){
    console.log(JSON.stringify({ok:true,dryRun:true,plan:outputPlan},null,2));return;
  }
  if(options.silent&&(options.music||options.voice))
    throw Error("--silent cannot be combined with external audio; omit --silent to include your approved track");
  const music=options.music?await localAudio(options.music,"Music"):null;
  const voice=options.voice?await localAudio(options.voice,"Narration"):null;
  if(voice&&voice.duration>film.durationSeconds+.05)
    throw Error("Narration is longer than the film. Shorten it or lengthen your authored scenes.");
  const hasGlobalSound=Boolean(music||voice);
  if(options["media-map"]){
    const map=await stat(resolve(options["media-map"]));
    if(!map.isFile()||map.size>12_000)throw Error("Local media-map must be under 12KB");
  }
  const formats={portrait:[1080,1920],square:[1080,1080],landscape:[1920,1080]};
  await mkdir(dirname(outfile),{recursive:true});
  const work=join(dirname(outfile),basename(outfile,".mp4")+"-sequence-parts");
  await mkdir(work,{recursive:true});
  const files=[];
  for(const chapter of film.chapters){
    const index=String(chapter.index).padStart(2,"0");
    const projectFile=join(work,"part-"+index+".motion.json");
    const videoFile=join(work,"part-"+index+".mp4");
    await writeFile(projectFile,JSON.stringify(chapter.project,null,2)+"\n");
    const cmd=["scripts/motion/render-master.mjs",projectFile,videoFile,
      "--url",url.href,"--fps",String(fps),"--crf",String(crf)];
    if(options.chromium)cmd.push("--chromium",options.chromium);
    if(options["media-map"])cmd.push("--media-map",resolve(options["media-map"]));
    if(hasGlobalSound||options.silent)cmd.push("--silent");
    console.log("Motion Sequence: rendering "+chapter.title+" ("+chapter.index+"/"+film.chapters.length+")");
    run(process.execPath,cmd);
    run(process.execPath,["scripts/motion/verify-render.mjs",videoFile,
      ...(!hasGlobalSound&&!options.silent?["--require-audio"]:[])],150_000);
    files.push(videoFile);
  }
  const concatList=join(work,"segments.ffconcat");
  await writeFile(concatList,"ffconcat version 1.0\n"+files.map(escapeConcatFilePath).join("\n")+"\n");
  const staged=join(work,"stitched.mp4");
  run("ffmpeg",["-y","-hide_banner","-loglevel","error","-f","concat","-safe","0",
    "-i",concatList,"-c","copy","-movflags","+faststart",staged],240_000);
  const temp=join(work,"verified-final.mp4");
  if(hasGlobalSound){
    const inputs=["-i",staged];
    if(music)inputs.push("-stream_loop","-1","-i",music.path);
    if(voice)inputs.push("-i",voice.path);
    const filters=[],audios=[];
    const seconds=film.durationSeconds;
    if(music){
      const i=1;
      filters.push("["+i+":a]atrim=0:"+seconds.toFixed(3)+",asetpts=PTS-STARTPTS,volume="+(voice?".16":".75")+
        ",afade=t=in:st=0:d=.35,afade=t=out:st="+Math.max(0,seconds-1).toFixed(3)+":d=1[bg]");
      audios.push("[bg]");
    }
    if(voice){
      const i=music?2:1;
      filters.push("["+i+":a]asetpts=PTS-STARTPTS,apad,atrim=0:"+seconds.toFixed(3)+"[narr]");
      audios.push("[narr]");
    }
    filters.push(audios.length>1?audios.join("")+"amix=inputs=2:duration=longest:dropout_transition=0[aout]":
      audios[0]+"anull[aout]");
    run("ffmpeg",["-y","-hide_banner","-loglevel","error",...inputs,
      "-filter_complex",filters.join(";"),"-map","0:v:0","-map","[aout]",
      "-c:v","copy","-c:a","aac","-b:a","192k","-t",seconds.toFixed(3),
      "-movflags","+faststart",temp],240_000);
  }else{
    run("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",staged,"-c","copy",
      "-movflags","+faststart",temp],240_000);
  }
  const movie=probe(temp);
  const duration=Number(movie.format?.duration);
  const track=movie.streams?.find(s=>s.codec_type==="video");
  const audio=movie.streams?.find(s=>s.codec_type==="audio");
  if(!track||track.codec_name!=="h264"||track.width!==formats[film.format][0]||
      track.height!==formats[film.format][1])throw Error("Final video format mismatch");
  if(!Number.isFinite(duration)||Math.abs(duration-film.durationSeconds)>Math.max(.65,film.chapters.length*.13))
    throw Error("Final duration mismatch: expected "+film.durationSeconds+" got "+duration);
  if(!options.silent&&!audio)throw Error("Film soundtrack missing");
  if(options.silent&&audio)throw Error("Silent film unexpectedly has an audio track");
  await rename(temp,outfile);
  const stem=outfile.slice(0,-4);
  const report={...outputPlan,file:outfile,actualDurationSeconds:duration,
    videoCodec:track.codec_name,audioCodec:audio?.codec_name||null,
    mediaMapUsed:Boolean(options["media-map"]),
    scenesRequireOwnerMedia:film.chapters.some(c=>c.project.scenes.some(s=>s.kind==="screen")),
    humanReviewRequired:true,
    note:"Designed on-screen captions are not narration transcripts. Technical QA does not certify aesthetic quality or licensing."};
  await Promise.all([
    writeFile(stem+".on-screen.srt",onScreenCaptions(film)),
    writeFile(stem+".chapters.json",JSON.stringify(outputPlan.timeline,null,2)+"\n"),
    writeFile(stem+".sequence-report.json",JSON.stringify(report,null,2)+"\n")
  ]);
  console.log("MOTION SEQUENCE COMPLETE\n"+JSON.stringify(report,null,2));
}
main().catch(e=>{console.error("Motion Sequence:",e instanceof Error?e.message:String(e));process.exitCode=1;});
