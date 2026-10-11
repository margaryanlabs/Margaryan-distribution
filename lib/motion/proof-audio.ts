/**
 * Source-licensed voice/music mix for the ten-second Proof Director.
 * No automatic voice generation, identity cloning, time stretch or speech
 * speed adjustment. Local browser Web Audio only; nothing is uploaded.
 */
export interface ProofAudioSession {
  track:MediaStreamTrack;
  duration:number;
  stop:()=>Promise<void>;
}
const MOVIE_SECONDS=10;
const MAX_VOICE_BYTES=30_000_000;
const MAX_MUSIC_BYTES=50_000_000;
const finite=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
export async function inspectProofAudio(file:File,kind:"voice"|"music"){
  if(!file.type.startsWith("audio/"))throw Error("Select a browser-supported audio file");
  const maximum=kind==="voice"?MAX_VOICE_BYTES:MAX_MUSIC_BYTES;
  if(file.size<100||file.size>maximum)throw Error(kind+" file is empty or exceeds the limit");
  const context=new AudioContext();
  try{
    const decoded=await context.decodeAudioData(await file.arrayBuffer());
    if(!Number.isFinite(decoded.duration)||decoded.duration<.2)throw Error("Audio recording contains no decodable sound");
    if(kind==="voice"&&decoded.duration>9.8)throw Error("Spoken narration is longer than 9.8 seconds. Re-record naturally; do not accelerate voices.");
    let sum=0,n=0;
    const wave=decoded.getChannelData(0);
    for(let i=0;i<wave.length;i+=Math.max(1,Math.floor(wave.length/4096))){
      sum+=wave[i]*wave[i];n++;
    }
    if(sum/Math.max(1,n)<.0000001)throw Error("Audio is effectively silent");
    return {seconds:decoded.duration,channels:decoded.numberOfChannels,sampleRate:decoded.sampleRate};
  }finally{await context.close();}
}

/** Mix recorded/licensed tracks into a WebM review export.
 * The AudioContext and all generated nodes are owner-local. No voiceover
 * fallback exists: if no tracks were provided, caller exports video-only. */
export async function createProofAudioSession(
  voiceFile:File|null,musicFile:File|null,seconds=MOVIE_SECONDS
):Promise<ProofAudioSession|null>{
  if(!voiceFile&&!musicFile)return null;
  if(!Number.isFinite(seconds)||seconds<=0||seconds>60)throw Error("Invalid audio timeline");
  const context=new AudioContext();
  const active:AudioBufferSourceNode[]=[];
  try{
    await context.resume();
    const streams: Array<{kind:"voice"|"music";buffer:AudioBuffer}>=[];
    for(const [kind,file] of [["voice",voiceFile],["music",musicFile]] as const){
      if(!file)continue;
      const max=kind==="voice"?MAX_VOICE_BYTES:MAX_MUSIC_BYTES;
      if(!file.type.startsWith("audio/")||file.size>max||file.size<100)throw Error("Unsupported local sound asset: "+kind);
      const buffer=await context.decodeAudioData(await file.arrayBuffer());
      if(kind==="voice"&&buffer.duration>seconds-.15)throw Error("Narration does not fit the shot. No automatic speed-up allowed.");
      if(buffer.duration<.2)throw Error("Uploaded "+kind+" sound is too short");
      streams.push({kind,buffer});
    }
    const destination=context.createMediaStreamDestination();
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-15;
    compressor.knee.value=9;
    compressor.ratio.value=2.5;
    compressor.attack.value=.006;
    compressor.release.value=.19;
    compressor.connect(destination);
    const now=context.currentTime+.05;
    streams.forEach(({kind,buffer})=>{
      const player=context.createBufferSource();
      player.buffer=buffer;
      const volume=context.createGain();
      const level=kind==="voice"?.93:(voiceFile?.11:.35);
      volume.gain.setValueAtTime(0,now);
      volume.gain.linearRampToValueAtTime(level,now+(kind==="voice"?.035:.22));
      volume.gain.setValueAtTime(level,now+Math.max(.1,seconds-.52));
      volume.gain.linearRampToValueAtTime(0,now+seconds);
      player.loop=kind==="music"&&buffer.duration<seconds;
      player.connect(volume);volume.connect(compressor);
      player.start(now);
      player.stop(now+seconds+.1);
      active.push(player);
    });
    const track=destination.stream.getAudioTracks()[0];
    if(!track)throw Error("Browser has no mixable audio track");
    let closed=false;
    return {track,duration:seconds,stop:async()=>{
      if(closed)return;
      closed=true;
      for(const node of active)try{node.stop();}catch{}
      track.stop();
      if(context.state!=="closed")await context.close();
    }};
  }catch(error){
    for(const node of active)try{node.stop();}catch{}
    if(context.state!=="closed")await context.close();
    throw error;
  }
}
