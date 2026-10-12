import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const clamp=(value,maximum,fallback=0)=>
  typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(maximum,value)):fallback;
const f=n=>Number(n).toFixed(3);

/**
 * Sound Director v2: actual speech-controlled sidechain ducking, mild speech
 * compression and EBU R128 normalization. No external voice/music API.
 * Neither loudness measurements nor this mix certify a professional voice.
 */
export function buildAudioMix({project,opts,scorePath,duration,probeAudio=probe}){
  const e=project.audio||{};
  const voiceStart=clamp(e.voiceStart,64),voiceTrim=clamp(e.voiceTrim,3600);
  const musicTrim=clamp(e.musicTrim,3600);
  const voiceFadeIn=clamp(e.voiceFadeIn,5,.08),voiceFadeOut=clamp(e.voiceFadeOut,5,.18);
  const musicFadeIn=clamp(e.musicFadeIn,5,.4),musicFadeOut=clamp(e.musicFadeOut,5,.65);
  const audio=[];
  let narrationDuration=null;
  if(opts.voice){
    const path=resolve(opts.voice);
    narrationDuration=probeAudio(path);
    if(!Number.isFinite(narrationDuration)||narrationDuration<=voiceTrim+.05)
      throw Error("NARRATION SOURCE: trim removes all usable sound.");
    const usable=narrationDuration-voiceTrim;
    if(voiceStart+usable>duration-.05)
      throw Error("NARRATION TIMING: "+f(usable)+"s voice + "+f(voiceStart)+
        "s offset exceeds "+f(duration)+"s film. Trim or reposition the source.");
    audio.push({path,kind:"voice",volume:1});
  }
  if(opts.music||scorePath) {
    const path=resolve(opts.music||scorePath);
    if(opts.music){
      const sourceSeconds=probeAudio(path);
      if(!Number.isFinite(sourceSeconds)||sourceSeconds<=musicTrim+.1)
        throw Error("MUSIC TIMING: source trim removes the soundtrack.");
    }
    // Retain audible music between spoken lines; duck dynamically during narration.
    audio.push({path,kind:"music",volume:opts.voice ? .62 : .75});
  }
  const audioInputArgs=[],filters=[];
  for(const [index,item] of audio.entries()){
    if(item.kind==="music"&&opts.music)audioInputArgs.push("-stream_loop","-1");
    audioInputArgs.push("-i",item.path);
    const steps=[];
    if(item.kind==="voice"){
      const usable=narrationDuration-voiceTrim;
      const fadeIn=Math.min(usable/2,voiceFadeIn);
      const fadeOut=Math.min(usable/2,voiceFadeOut);
      steps.push("atrim=start="+f(voiceTrim)+":duration="+f(usable),
        "asetpts=PTS-STARTPTS",
        "highpass=f=80",
        "acompressor=threshold=0.125:ratio=2.3:attack=12:release=170:makeup=1.12",
        "volume="+item.volume);
      if(fadeIn>.001)steps.push("afade=t=in:st=0:d="+f(fadeIn));
      if(fadeOut>.001)steps.push("afade=t=out:st="+f(usable-fadeOut)+":d="+f(fadeOut));
      steps.push("adelay="+Math.round(voiceStart*1000)+":all=1");
    }else{
      steps.push("atrim=start="+f(opts.music?musicTrim:0),
        "asetpts=PTS-STARTPTS","volume="+item.volume);
      const fadeIn=Math.min(duration/2,musicFadeIn);
      const fadeOut=Math.min(duration/2,musicFadeOut);
      if(fadeIn>.001)steps.push("afade=t=in:st=0:d="+f(fadeIn));
      if(fadeOut>.001)steps.push("afade=t=out:st="+f(duration-fadeOut)+":d="+f(fadeOut));
    }
    steps.push("apad","atrim=0:"+f(duration));
    filters.push("["+(index+1)+":a:0]"+steps.join(",")+"[aud"+index+"]");
  }
  const audioMap=[];
  const voiceAndMusic=audio.some(s=>s.kind==="voice")&&audio.some(s=>s.kind==="music");
  if(!audio.length)audioMap.push("-an");
  else{
    if(voiceAndMusic){
      filters.push(
        "[aud0]asplit=2[narration][sidechain]",
        "[aud1][sidechain]sidechaincompress=threshold=0.024:ratio=7:attack=35:release=300:detection=rms[ducked]",
        "[narration][ducked]amix=inputs=2:duration=first:dropout_transition=0[premaster]"
      );
    }else filters.push("[aud0]anull[premaster]");
    // EBU R128 and a final limiter prevent egregious technical peaks.
    // Human listening is still needed for intonation, music and aesthetics.
    filters.push("[premaster]alimiter=limit=0.94:attack=5:release=55:level=false,loudnorm=I=-16:TP=-1.5:LRA=11[aout]");
    audioMap.push("-filter_complex",filters.join(";"),"-map","0:v:0",
      "-map","[aout]","-c:a","aac","-b:a","192k");
  }
  return {
    audioInputArgs,audioMap,audioTracks:audio.length,
    metadata:{voiceStart,voiceTrim,musicTrim,voiceFadeIn,voiceFadeOut,musicFadeIn,musicFadeOut,
      narrationDuration,voiceRequested:!!opts.voice,musicRequested:!!opts.music,
      mixEngine:"Margaryan Sound Director v2",dynamicVoiceSidechain:voiceAndMusic,
      integratedLoudnessTarget:-16,truePeakTarget:-1.5,humanListeningRequired:true}
  };
}
function probe(path){
  const result=spawnSync("ffprobe",["-v","error","-show_entries","format=duration","-of","json",path],{
    encoding:"utf8",timeout:30000,maxBuffer:300000
  });
  if(result.status!==0)throw Error("Audio source probe failed: "+(result.stderr||path).slice(-400));
  const seconds=Number(JSON.parse(result.stdout).format?.duration);
  if(!Number.isFinite(seconds)||seconds<=0)throw Error("Audio source has no usable duration: "+path);
  return seconds;
}
