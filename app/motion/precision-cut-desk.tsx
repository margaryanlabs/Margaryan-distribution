"use client";
import {useState} from "react";
import {sanitizeMotionProject, type MotionProject} from "@/lib/motion/studio";
import {getMotionSceneSource} from "@/lib/motion/scene-source";
import {
  moveMotionShot,duplicateMotionShot,splitMotionShot,type PrecisionEdit
} from "@/lib/motion/precision-edit";
import styles from "./precision-cut-desk.module.css";
type Props={
  project:MotionProject;
  selectedIndex:number;
  playhead:number;
  busy:boolean;
  onApply:(project:MotionProject,selectedIndex:number,description:string)=>void;
};
type EditHistory={before:MotionProject;selected:number;after:string};
export default function PrecisionCutDesk({project,selectedIndex,playhead,busy,onApply}:Props){
  const [history,setHistory]=useState<EditHistory|null>(null);
  const [error,setError]=useState<string|null>(null);
  const scene=project.scenes[selectedIndex];
  const start=project.scenes.slice(0,selectedIndex).reduce((n,s)=>n+s.seconds,0);
  const cut=Math.round((playhead-start)*100)/100;
  const safeSplit=scene&&cut>=2&&scene.seconds-cut>=2&&project.scenes.length<8;
  const historyAvailable=history!==null&&JSON.stringify(project)===history.after;
  const canDuplicate=project.scenes.length<8&&!(
    scene?.kind==="screen"&&scene.mediaId&&getMotionSceneSource(scene.mediaId)?.type!=="image");
  function perform(transform:()=>PrecisionEdit){
    if(busy)return;
    setError(null);
    try{
      const result=transform();
      const canonical=sanitizeMotionProject(result.project);
      setHistory({before:project,selected:selectedIndex,after:JSON.stringify(canonical)});
      onApply(canonical,result.selectedIndex,result.description);
    }catch(e){setError(e instanceof Error?e.message:String(e));}
  }
  function undo(){
    if(!historyAvailable||!history||busy)return;
    onApply(history.before,history.selected,"Previous film cut restored");
    setHistory(null);setError(null);
  }
  return <section className={styles.desk} aria-label="Precision picture editing tools">
    <div className={styles.head}>
      <span>06 / PICTURE EDITOR</span><strong>PRECISION CUT</strong>
    </div>
    <h3>Cut on the actual frame.</h3>
    <p className={styles.help}>Move, duplicate or split the selected shot without changing
      unrelated scenes. Real source video continues from its original inpoint when split.
      These edits preserve the film&apos;s duration except duplication.</p>
    <div className={styles.timecard}>
      <div><span>SELECTED</span><b>SHOT {String(selectedIndex+1).padStart(2,"0")}
        <small> / {scene?.kind.toUpperCase()||"NONE"}</small></b></div>
      <div><span>PLAYHEAD IN SHOT</span><b>{Math.max(0,cut).toFixed(2)}s <small> / {scene?.seconds.toFixed(2)}s</small></b></div>
    </div>
    <div className={styles.actions}>
      <button type="button" disabled={busy||selectedIndex<=0}
        onClick={()=>perform(()=>moveMotionShot(project,selectedIndex,-1))}>← MOVE EARLIER</button>
      <button type="button" disabled={busy||selectedIndex>=project.scenes.length-1}
        onClick={()=>perform(()=>moveMotionShot(project,selectedIndex,1))}>MOVE LATER →</button>
      <button type="button" disabled={busy||!canDuplicate}
        onClick={()=>perform(()=>duplicateMotionShot(project,selectedIndex,
          scene.mediaId?getMotionSceneSource(scene.mediaId)?.type:undefined))}>⧉ DUPLICATE SHOT</button>
      <button type="button" className={styles.split} disabled={busy||!safeSplit}
        onClick={()=>perform(()=>splitMotionShot(project,selectedIndex,cut))}>✂ SPLIT AT PLAYHEAD</button>
      <button type="button" className={styles.undo} disabled={busy||!historyAvailable}
        onClick={undo}>↶ UNDO LAST PICTURE EDIT</button>
    </div>
    {!safeSplit&&<p className={styles.guide}>To split: select a shot, move the timeline
      playhead so at least 2 seconds remain on each side. Maximum 8 shots in the current
      Cinematic engine. For real moving clips, splitting preserves chronological footage.</p>}
    {scene?.mediaId&&<p className={styles.guide}>
      ORIGINAL SOURCE / {getMotionSceneSource(scene.mediaId)?.filename||"local media not loaded"}.
      Real-source completeness is checked again before export.</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>;
}
