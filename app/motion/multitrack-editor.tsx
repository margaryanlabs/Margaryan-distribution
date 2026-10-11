"use client";
import { useEffect, useState } from "react";
import type { MotionAudioEdit, MotionProject } from "@/lib/motion/studio";
import { DEFAULT_AUDIO_EDIT, shotSpans, voiceWindow } from "@/lib/motion/timeline-edit";
import styles from "./multitrack-editor.module.css";

type Props={
  project:MotionProject;
  playhead:number;
  selectedIndex:number;
  voice:File|null;
  voiceSeconds:number|null;
  music:File|null;
  musicSeconds:number|null;
  playing:boolean;
  onSeek:(time:number)=>void;
  onSelect:(index:number)=>void;
  onEdit:(audio:MotionAudioEdit)=>void;
};
const fmt=(n:number)=>Math.max(0,n).toFixed(1)+"s";

function useWaveform(file:File|null):number[] {
  const [wave,setWave]=useState<number[]>([]);
  useEffect(()=>{
    if(!file){setWave([]);return;}
    let active=true;
    const AudioCtor=window.AudioContext;
    if(!AudioCtor)return;
    const ctx=new AudioCtor();
    void file.arrayBuffer().then(b=>ctx.decodeAudioData(b)).then(buffer=>{
      if(!active)return;
      const samples=buffer.getChannelData(0);
      const peak:number[]=[];
      const steps=96;
      for(let i=0;i<steps;i++){
        const begin=Math.floor(i*samples.length/steps);
        const end=Math.min(samples.length,Math.floor((i+1)*samples.length/steps));
        let amplitude=0;
        const stride=Math.max(1,Math.floor((end-begin)/160));
        for(let x=begin;x<end;x+=stride)amplitude=Math.max(amplitude,Math.abs(samples[x]));
        peak.push(Math.max(.07,Math.min(1,amplitude)));
      }
      const max=Math.max(.01,...peak);
      setWave(peak.map(v=>Math.max(.1,v/max)));
    }).catch(()=>{if(active)setWave([]);}).finally(()=>{void ctx.close().catch(()=>undefined);});
    return()=>{active=false;void ctx.close().catch(()=>undefined);};
  },[file]);
  return wave;
}
export default function MultitrackEditor({
  project,playhead,selectedIndex,voice,voiceSeconds,music,musicSeconds,playing,
  onSeek,onSelect,onEdit
}:Props){
  const spans=shotSpans(project);
  const total=spans.at(-1)?.end||1;
  const audio=project.audio||DEFAULT_AUDIO_EDIT;
  const v=voiceWindow(total,audio,voiceSeconds);
  const waveform=useWaveform(voice);
  const marks=Array.from({length:Math.ceil(total/5)+1},(_,index)=>index*5).filter(time=>time<=total);
  const playheadPercent=Math.min(100,Math.max(0,playhead/total*100));
  function update(field:keyof MotionAudioEdit,value:number){
    onEdit({...audio,[field]:Math.max(0,value)});
  }
  const editorDisabled=playing;
  return <section className={styles.editor} aria-label="Multi-track film editor">
    <div className={styles.head}>
      <div><span>05 / EDIT SUITE</span><h3>Multi-track timeline</h3></div>
      <strong>VIDEO / VOICE / MUSIC / COPY</strong>
    </div>
    <p className={styles.help}>Select a shot to edit it. Drag the time ruler to scrub. Voice placement and trim change the <b>actual exported audio</b>; on-screen copy is an editorial cue, not speech recognition.</p>
    <div className={styles.timelineOuter}>
      <div className={styles.trackRow}>
        <div className={styles.trackTitle}><b>TIME</b><small>{fmt(total)}</small></div>
        <div className={styles.ruler}>
          {marks.map(t=><span key={t} style={{left:(t/total*100)+"%"}}>{Math.round(t)}s</span>)}
          <input type="range" min={0} max={total} step=".025" value={Math.min(total,playhead)}
            aria-label="Scrub all video and audio tracks"
            onChange={event=>onSeek(Number(event.target.value))}/>
        </div>
      </div>
      <div className={styles.trackRow}>
        <div className={styles.trackTitle}><b>VIDEO</b><small>{spans.length} scenes</small></div>
        <div className={styles.track} aria-label="Video shots">
          <div className={styles.playhead} style={{left:playheadPercent+"%"}}/>
          {spans.map(({scene,index,start,width})=><button type="button" key={scene.id+"-"+index}
            className={styles.shot} data-selected={selectedIndex===index}
            style={{left:(start/total*100)+"%",width:(width/total*100)+"%"}}
            onClick={()=>onSelect(index)} aria-label={"Edit shot "+(index+1)+" "+scene.headline}>
            <span>{String(index+1).padStart(2,"0")} / {scene.kind.toUpperCase()}</span>
            <b>{scene.headline}</b>
            <small>{fmt(width)}</small>
          </button>)}
        </div>
      </div>
      <div className={styles.trackRow}>
        <div className={styles.trackTitle}><b>COPY</b><small>on-screen</small></div>
        <div className={styles.track+" "+styles.copyTrack}>
          <div className={styles.playhead} style={{left:playheadPercent+"%"}}/>
          {spans.map(({scene,index,start,width})=><button type="button" key={index}
            className={styles.copyCue} data-selected={selectedIndex===index}
            style={{left:(start/total*100)+"%",width:(width/total*100)+"%"}}
            onClick={()=>onSelect(index)} title={scene.headline}>
            <span>{scene.eyebrow}</span>
          </button>)}
        </div>
      </div>
      <div className={styles.trackRow}>
        <div className={styles.trackTitle}><b>VOICE</b><small>{voice?fmt(v.usableSeconds):"no recording"}</small></div>
        <div className={styles.track+" "+styles.audioTrack}>
          <div className={styles.playhead} style={{left:playheadPercent+"%"}}/>
          {voice && v.usableSeconds>.05 && <div className={styles.voiceClip}
            data-invalid={!v.ready}
            style={{left:(v.start/total*100)+"%",width:(Math.max(0,Math.min(total-v.start,v.usableSeconds))/total*100)+"%"}}
            title={"Voice starts "+fmt(v.start)+" / trim "+fmt(audio.voiceTrim)}>
            <span>◉ {voice.name}</span>
            <div className={styles.waveform}>{waveform.map((height,index)=><i key={index} style={{height:Math.round(height*88)+"%"}}/>)}</div>
          </div>}
          {!voice&&<span className={styles.empty}>Upload a recorded voice above</span>}
        </div>
      </div>
      <div className={styles.trackRow}>
        <div className={styles.trackTitle}><b>MUSIC</b><small>{music?"licensed": "optional"}</small></div>
        <div className={styles.track+" "+styles.audioTrack}>
          <div className={styles.playhead} style={{left:playheadPercent+"%"}}/>
          {music&&<div className={styles.musicClip}
            title={"Music source trim "+fmt(audio.musicTrim)}>
            <span>♫ {music.name}</span><i/>
          </div>}
          {!music&&<span className={styles.empty}>Upload licensed music above, or use the original procedural score</span>}
        </div>
      </div>
    </div>
    <div className={styles.editControls}>
      <div className={styles.group}>
        <div className={styles.groupTitle}>NARRATION / PLACEMENT <span>{voice?v.ready?"READY":"REVIEW":"NO FILE"}</span></div>
        <label>START <strong>{fmt(audio.voiceStart)}</strong>
          <input type="range" min="0" max={Math.max(0,total-.2)} step=".1" value={Math.min(audio.voiceStart,total-.2)}
            disabled={!voice||editorDisabled}
            onChange={e=>update("voiceStart",Number(e.target.value))}/>
        </label>
        <label>TRIM FROM SOURCE <strong>{fmt(audio.voiceTrim)}</strong>
          <input type="range" min="0" max={Math.max(0,(voiceSeconds||0)-.2)} step=".1"
            value={Math.min(audio.voiceTrim,Math.max(0,(voiceSeconds||0)-.2))}
            disabled={!voice||voiceSeconds===null||editorDisabled}
            onChange={e=>update("voiceTrim",Number(e.target.value))}/>
        </label>
        <label>FADE IN <strong>{fmt(audio.voiceFadeIn)}</strong>
          <input type="range" min="0" max="2" step=".05" value={audio.voiceFadeIn}
            disabled={!voice||editorDisabled} onChange={e=>update("voiceFadeIn",Number(e.target.value))}/>
        </label>
        <label>FADE OUT <strong>{fmt(audio.voiceFadeOut)}</strong>
          <input type="range" min="0" max="2" step=".05" value={audio.voiceFadeOut}
            disabled={!voice||editorDisabled} onChange={e=>update("voiceFadeOut",Number(e.target.value))}/>
        </label>
      </div>
      <div className={styles.group}>
        <div className={styles.groupTitle}>MUSIC / FINISHING <span>{music?"LOCAL FILE":"STANDBY"}</span></div>
        <label>TRIM FROM SOURCE <strong>{fmt(audio.musicTrim)}</strong>
          <input type="range" min="0" max={Math.max(0,(musicSeconds||0)-.2)} step=".1"
            value={Math.min(audio.musicTrim,Math.max(0,(musicSeconds||0)-.2))}
            disabled={!music||musicSeconds===null||editorDisabled}
            onChange={e=>update("musicTrim",Number(e.target.value))}/>
        </label>
        <label>FADE IN <strong>{fmt(audio.musicFadeIn)}</strong>
          <input type="range" min="0" max="3" step=".05" value={audio.musicFadeIn}
            disabled={!music||editorDisabled} onChange={e=>update("musicFadeIn",Number(e.target.value))}/>
        </label>
        <label>FADE OUT <strong>{fmt(audio.musicFadeOut)}</strong>
          <input type="range" min="0" max="3" step=".05" value={audio.musicFadeOut}
            disabled={!music||editorDisabled} onChange={e=>update("musicFadeOut",Number(e.target.value))}/>
        </label>
        <div className={styles.guide}>Voice and music tracks stay on this device. Source files are not saved in the project JSON or uploaded to a server.</div>
      </div>
    </div>
    {voice&& !v.ready && <div className={styles.warning} role="alert">
      NARRATION CANNOT FIT: effective voice {fmt(v.usableSeconds)} starts at {fmt(v.start)} in a {fmt(total)} film.
      {v.overflowSeconds>0 ? " Overrun "+fmt(v.overflowSeconds)+". Reduce start offset, trim the voice or lengthen the film." :
        " Check trim settings and selected recording."} Export is blocked until corrected.
    </div>}
  </section>;
}
