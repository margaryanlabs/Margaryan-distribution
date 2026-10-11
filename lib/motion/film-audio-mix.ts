/**
 * Consent-only browser mixing for the Film Sequence visual workprint.
 * Files remain in the browser; no media upload or generative voice.
 * Output is captured from MediaStreamAudioDestinationNode alongside Canvas.
 */
export type FilmAudioKind="voice"|"music";
export type FilmSoundFiles={voice:File|null;music:File|null};
export const MAX_AUDIO_SOURCE_BYTES=40_000_000;
const allowed=/\.(mp3|wav|wave|m4a|aac|ogg|opus|webm|flac)$/i;

export function validateSoundSource(file:Pick<File,"name"|"size"|"type">,label:FilmAudioKind):void {
  if(typeof file.name!=="string"||file.name.length>190||!allowed.test(file.name)||
     file.name.includes("/")||file.name.includes("\\"))
    throw Error(label+": choose an approved local audio file (WAV/MP3/M4A/OGG/WebM/FLAC)");
  if(!Number.isFinite(file.size)||file.size<128||file.size>MAX_AUDIO_SOURCE_BYTES)
    throw Error(label+": file must be 128 bytes–40MB");
  if(file.type&&!file.type.startsWith("audio/")&&!["video/webm","video/mp4","application/ogg"].includes(file.type))
    throw Error(label+": selected file is not a supported audio container");
}
export function soundtrackConfig(seconds:number,hasVoice:boolean,hasMusic:boolean,rights:boolean){
  if(!Number.isFinite(seconds)||seconds<2||seconds>300)
    throw Error("Browser soundtrack duration must be 2–300 seconds");
  if((hasVoice||hasMusic)&&!rights)
    throw Error("Approve media ownership/licensing before recording with voice or music");
  return {seconds,hasVoice,hasMusic,
    voiceVolume:1,
    musicVolume:hasVoice?0.19:0.7,
    fadeIn:.18,
    fadeOut:.8,
    mode:hasVoice||hasMusic?"approved-local-audio":"silent" as const
  };
}
export type FilmBrowserAudio={
  stream:MediaStream;
  start:()=>Promise<void>;
  close:()=>Promise<void>;
};
export async function prepareFilmAudio(files:FilmSoundFiles,seconds:number,rights:boolean):Promise<FilmBrowserAudio|null>{
  const hasVoice=Boolean(files.voice),hasMusic=Boolean(files.music);
  const plan=soundtrackConfig(seconds,hasVoice,hasMusic,rights);
  if(plan.mode==="silent")return null;
  if(files.voice)validateSoundSource(files.voice,"voice");
  if(files.music)validateSoundSource(files.music,"music");
  const AudioCtor=window.AudioContext;
  if(!AudioCtor)throw Error("This browser cannot decode and capture user-approved audio");
  const ctx=new AudioCtor();
  const destination=ctx.createMediaStreamDestination();
  const nodes:AudioBufferSourceNode[]=[];
  let started=false,closed=false;
  try{
    // User gesture must authorize audio playback before decoding.
    await ctx.resume();
    const decoded=await Promise.all([files.voice,files.music].map(async file=>{
      if(!file)return null;
      const data=await file.arrayBuffer();
      const buffer=await ctx.decodeAudioData(data);
      if(!buffer.duration||!Number.isFinite(buffer.duration)||buffer.duration<.15)
        throw Error("Audio source was empty or undecodable");
      return buffer;
    }));
    return {
      stream:destination.stream,
      async start(){
        if(started||closed)throw Error("Audio playback already started or closed");
        started=true;
        await ctx.resume();
        const now=ctx.currentTime+.035;
        for(const [i,buffer] of decoded.entries()){
          if(!buffer)continue;
          const voice=i===0;
          const source=ctx.createBufferSource();
          const gain=ctx.createGain();
          source.buffer=buffer;
          source.loop=!voice;
          const volume=voice?plan.voiceVolume:plan.musicVolume;
          gain.gain.setValueAtTime(0,now);
          gain.gain.linearRampToValueAtTime(volume,now+plan.fadeIn);
          gain.gain.setValueAtTime(volume,now+Math.max(plan.fadeIn,seconds-plan.fadeOut));
          gain.gain.linearRampToValueAtTime(0,now+seconds);
          source.connect(gain);
          gain.connect(destination);
          gain.connect(ctx.destination); // local user can monitor sound while previewing.
          nodes.push(source);
          source.start(now);
          source.stop(now+seconds+.06);
        }
      },
      async close(){
        if(closed)return;closed=true;
        for(const source of nodes)try{source.stop();}catch{}
        destination.stream.getTracks().forEach(track=>track.stop());
        await ctx.close().catch(()=>{});
      }
    };
  }catch(e){
    destination.stream.getTracks().forEach(track=>track.stop());
    await ctx.close().catch(()=>{});
    throw e;
  }
}
