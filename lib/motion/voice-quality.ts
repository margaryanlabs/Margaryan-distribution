/** Technical signal analysis on genuine local recordings (no transcription,
 * biometric inference, voice identity recognition or network transfers).
 * Clear-sounding speech still requires a human listening to the final film.
 */
export interface VoiceSignalReview {
  state:"ready"|"review"|"blocked";
  peak:number;
  rms:number;
  clippedPercent:number;
  nearSilencePercent:number;
  duration:number;
  notes:string[];
}
export function inspectVoiceSignal(data:{
 duration:number;numberOfChannels:number;getChannelData(index:number):Float32Array
}):VoiceSignalReview {
  const notes:string[]=[];
  if(!Number.isFinite(data.duration)||data.duration<=0||
     data.numberOfChannels<1||data.numberOfChannels>8)
    return{state:"blocked",peak:0,rms:0,clippedPercent:0,nearSilencePercent:100,
      duration:0,notes:["Cannot decode real voice samples."]};
  let peak=0,squares=0,clipped=0,silent=0,total=0;
  for(let c=0;c<data.numberOfChannels;c++){
    const samples=data.getChannelData(c);
    const step=Math.max(1,Math.floor(samples.length/350000));
    for(let i=0;i<samples.length;i+=step){
      const abs=Math.abs(samples[i]);
      if(!Number.isFinite(abs))continue;
      peak=Math.max(peak,abs);
      squares+=abs*abs;
      if(abs>=.995)clipped++;
      if(abs<.006)silent++;
      total++;
    }
  }
  const rms=total?Math.sqrt(squares/total):0;
  const clippedPercent=total?100*clipped/total:0;
  const nearSilencePercent=total?100*silent/total:100;
  if(data.duration<1.0)notes.push("Narration shorter than 1 second.");
  if(peak<.025||rms<.005)notes.push("Recording is extremely quiet. Check microphone input and record a new take.");
  if(clippedPercent>2)notes.push("Severe digital clipping; reduce input gain and record again.");
  else if(clippedPercent>.12)notes.push("Some samples are clipped. Check for distortion.");
  if(nearSilencePercent>96)notes.push("Most of the recording is near silence.");
  if(peak>.985)notes.push("Very high peak level. Listen for harsh consonants.");
  const block=data.duration<1||peak<.025||rms<.005||clippedPercent>2||nearSilencePercent>96;
  return{
    state:block?"blocked":notes.length?"review":"ready",
    peak:Number(peak.toFixed(4)),rms:Number(rms.toFixed(4)),
    clippedPercent:Number(clippedPercent.toFixed(2)),
    nearSilencePercent:Number(nearSilencePercent.toFixed(2)),
    duration:Number(data.duration.toFixed(2)),notes
  };
}
