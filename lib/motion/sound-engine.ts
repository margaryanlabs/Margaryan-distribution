import { durationOf, sceneAt, type MotionProject } from "./studio";
import { sanitizeAudioEdit, voiceWindow } from "./timeline-edit";

/** Source-honest local WebAudio mixing. Decodes in advance, schedules the
 * soundtrack only AFTER MediaRecorder starts so voice and first visual frame
 * share one timeline (the previous implementation introduced ~400ms drift).
 * The browser does not synthesize human speech.
 */
export interface ProceduralAudioSession {
  track:MediaStreamTrack;
  /** Called immediately after starting the video recorder; idempotent. */
  start():void;
  close():Promise<void>;
}
const NOTES=[55,65.41,73.42,82.41,98,110,130.81];
const cap=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export async function createProceduralSoundtrack(
  project:MotionProject,
  options:{voiceover?:File|null;music?:File|null;synth?:boolean;
    musicGain?:number;narrationGain?:number}={}
):Promise<ProceduralAudioSession>{
  if(typeof AudioContext==="undefined")throw Error("Web Audio not supported");
  const context=new AudioContext({sampleRate:44_100});
  try{
    const duration=durationOf(project);
    const edit=sanitizeAudioEdit(project.audio);
    const voiceFile=options.voiceover||null;
    const musicFile=options.music||null;
    if(voiceFile&&(voiceFile.size>15_000_000||!voiceFile.type.startsWith("audio/")))
      throw Error("Voice must be an audio file under 15 MB");
    if(musicFile&&(musicFile.size>30_000_000||!musicFile.type.startsWith("audio/")))
      throw Error("Licensed music must be an audio file under 30 MB");
    const [narration,music]=await Promise.all([
      voiceFile?context.decodeAudioData(await voiceFile.arrayBuffer()):Promise.resolve(null),
      musicFile?context.decodeAudioData(await musicFile.arrayBuffer()):Promise.resolve(null)
    ]);
    const timing=narration?voiceWindow(duration,edit,narration.duration):null;
    if(timing&&!timing.ready)throw Error(
      "NARRATION TIMELINE: usable voice "+timing.usableSeconds.toFixed(2)+"s at "+
      timing.start.toFixed(2)+"s does not fit "+duration.toFixed(2)+"s.");
    if(music&&(music.duration<.1||edit.musicTrim>=music.duration-.1))
      throw Error("Music trim leaves no audible content.");
    const destination=context.createMediaStreamDestination();
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-19;compressor.knee.value=22;compressor.ratio.value=8;
    compressor.attack.value=.009;compressor.release.value=.20;
    compressor.connect(destination);
    const originalGain=context.createGain();
    originalGain.gain.value=narration?.065:.26;
    originalGain.connect(compressor);
    const track=destination.stream.getAudioTracks()[0];
    if(!track)throw Error("No audio output track");
    await context.resume();
    let begun=false;
    let closed=false;
    function synthNote(note:number,wave:OscillatorType,start:number,seconds:number,volume:number,slide=0){
      const oscillator=context.createOscillator(),level=context.createGain();
      oscillator.type=wave;oscillator.frequency.setValueAtTime(note,start);
      if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,note+slide),start+seconds);
      level.gain.setValueAtTime(.0001,start);
      level.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+Math.min(.035,seconds*.16));
      level.gain.exponentialRampToValueAtTime(.0001,start+seconds);
      oscillator.connect(level);level.connect(originalGain);
      oscillator.start(start);oscillator.stop(start+seconds+.05);
    }
    function start(){
      if(begun||closed)return;
      begun=true;
      // The 45ms guard allows audio worklet / stream wiring without the
      // previous forced 400ms silent opening. Film begins on the recorder's
      // next video frame; exact samples still depend on browser MediaRecorder.
      const base=context.currentTime+.045;
      if(narration&&timing){
        const src=context.createBufferSource();src.buffer=narration;
        const gain=context.createGain();
        const volume=cap(options.narrationGain??.82,0,1.5);
        const at=base+timing.start,usable=timing.usableSeconds;
        const fadeIn=Math.min(usable/2,edit.voiceFadeIn);
        const fadeOut=Math.min(usable/2,edit.voiceFadeOut);
        gain.gain.setValueAtTime(fadeIn>.001?0:volume,at);
        if(fadeIn>.001)gain.gain.linearRampToValueAtTime(volume,at+fadeIn);
        gain.gain.setValueAtTime(volume,at+Math.max(fadeIn,usable-fadeOut));
        if(fadeOut>.001)gain.gain.linearRampToValueAtTime(0,at+usable);
        src.connect(gain);gain.connect(compressor);
        src.start(at,edit.voiceTrim);src.stop(at+usable+.01);
      }
      if(music){
        const src=context.createBufferSource();src.buffer=music;
        const level=context.createGain();
        const requested=cap(options.musicGain??.5,0,1);
        const full=requested*.32;
        const quiet=requested*.10;
        const fadeIn=Math.min(duration/2,edit.musicFadeIn);
        const fadeOut=Math.min(duration/2,edit.musicFadeOut);
        const fadeEnd=base+duration;
        level.gain.setValueAtTime(0,base);
        level.gain.linearRampToValueAtTime(full,base+Math.max(.01,fadeIn));
        if(timing){
          const vStart=base+timing.start;
          const vEnd=vStart+timing.usableSeconds;
          const lower=cap(vStart-.15,base+Math.max(.01,fadeIn),fadeEnd);
          level.gain.setValueAtTime(full,lower);
          level.gain.linearRampToValueAtTime(quiet,Math.max(lower+.015,vStart));
          level.gain.setValueAtTime(quiet,vEnd);
          if(vEnd+.2<fadeEnd)level.gain.linearRampToValueAtTime(full,vEnd+.2);
        }
        const endOfFade=Math.max(base+Math.max(.01,fadeIn),fadeEnd-fadeOut);
        level.gain.setValueAtTime(timing&&base+timing.start+timing.usableSeconds>endOfFade?quiet:full,endOfFade);
        level.gain.linearRampToValueAtTime(0,fadeEnd);
        src.connect(level);level.connect(compressor);
        src.loop=music.duration-edit.musicTrim<duration;
        src.loopStart=edit.musicTrim;src.loopEnd=music.duration;
        src.start(base,edit.musicTrim);src.stop(fadeEnd);
      }
      if(options.synth!==false){
        const root=project.brand==="veto"?0:project.brand==="promptence"?2:project.brand==="raios"?3:4;
        for(let i=0;i<Math.ceil(duration/3);i++){
          const step=base+i*3,span=Math.min(duration-i*3,3.2);
          if(span<=.05)break;
          const note=NOTES[(root+Math.floor(i/2))%NOTES.length];
          synthNote(note,"sine",step,span,.18);
          synthNote(note*1.5,"triangle",step,span,.035);
        }
        const beat=project.style==="kinetic"?.43:project.style==="technical"?.62:.72;
        for(let t=0;t<duration;t+=beat){
          const {scene}=sceneAt(project,t);
          synthNote(scene.kind==="kinetic"?108:84,"sine",base+t,.2,.11,-57);
          if(scene.kind==="network"&&Math.floor(t/beat)%2===1)
            synthNote(220,"triangle",base+t,.09,.025,-60);
        }
        let cursor=0;
        for(const [i,scene] of project.scenes.entries()){
          if(cursor<duration){
            synthNote(240+i*34,"sine",base+cursor,.48,.08,-160);
            synthNote(80,"triangle",base+cursor,.55,.055,-38);
          }
          cursor+=scene.seconds;
        }
      }
    }
    return {
      track,start,async close(){
        if(closed)return;closed=true;
        track.stop();await context.close().catch(()=>undefined);
      }
    };
  }catch(error){
    await context.close().catch(()=>undefined);
    throw error;
  }
}
