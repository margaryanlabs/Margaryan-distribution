/** Deterministic, restrained recorded-action sound design (no music API). */
export const AUDIO_SAMPLE_RATE=48000;
export function validateMotionInteractionEvidence(evidence){
 if(!evidence||evidence.schema!=="motion-interaction-cinema/v1"||
   evidence.sourceUrl!=="https://promptence.tech/"||
   evidence.providerAPIsUsed!==false||evidence.readOnly!==true||
   evidence.submitPrevented!==true||!Array.isArray(evidence.events))
   throw Error("Sound: only the original safe public Interaction Cinema evidence is accepted.");
 if(!Number.isFinite(evidence.duration)||evidence.duration<=0||evidence.duration>65)
   throw Error("Sound: invalid original film duration.");
 const ids=new Set();
 for(const e of evidence.events){
   if(!e||typeof e.action!=="string"||ids.has(e.action)||!["click","type","focus"].includes(e.kind)||
      e.publicReadOnly!==true||e.submitted!==false||e.source!=="live-browser"||
      !Number.isFinite(e.timestampSeconds)||e.timestampSeconds<0||
      e.timestampSeconds>evidence.duration)
     throw Error("Sound: unsigned/unsafe interaction event.");
   ids.add(e.action);
 }
 return evidence.events.length;
}
export function clickSample(t,amplitude=.21){
 if(!Number.isFinite(t)||t<0||t>.18)return 0;
 const attack=Math.min(1,t*320);
 const shape=attack*Math.exp(-t*52);
 return amplitude*shape*(.59*Math.sin(2*Math.PI*860*t)+.41*Math.sin(2*Math.PI*510*t));
}
export function eventSfxSample(evidence,seconds){
 let level=0;
 for(const event of evidence.events){
  if(event.kind==="click"){
   const t=seconds-event.timestampSeconds;
   level+=clickSample(t,.21);
  }else if(event.kind==="type"){
   for(const step of [.12,.31,.52,.73]){
    const t=seconds-(event.timestampSeconds+step);
    level+=clickSample(t,.062);
   }
  }
 }
 return Math.max(-.65,Math.min(.65,level));
}
/** Standard 16-bit mono PCM; the user's original score is mixed separately. */
export function writeEffectsPcm(evidence){
 validateMotionInteractionEvidence(evidence);
 const frames=Math.floor(evidence.duration*AUDIO_SAMPLE_RATE);
 if(frames>4_000_000)throw Error("Sound: oversized film");
 const audio=Buffer.alloc(44+frames*2);
 audio.write("RIFF",0,"ascii");
 audio.writeUInt32LE(36+frames*2,4);
 audio.write("WAVEfmt ",8,"ascii");
 audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);
 audio.writeUInt32LE(AUDIO_SAMPLE_RATE,24);
 audio.writeUInt32LE(AUDIO_SAMPLE_RATE*2,28);
 audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);
 audio.write("data",36,"ascii");audio.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++)audio.writeInt16LE(
  Math.round(eventSfxSample(evidence,i/AUDIO_SAMPLE_RATE)*32767),44+i*2);
 return audio;
}
