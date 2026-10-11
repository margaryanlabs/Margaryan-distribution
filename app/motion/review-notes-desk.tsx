"use client";
import {useEffect,useMemo,useState} from "react";
import type {MotionProject} from "@/lib/motion/studio";
import {
 addReviewMarker,markerSceneIndex,parseReviewMarkers,reviewMarkersAsText,
 reviewProjectStorageKey,updateReviewMarkerStatus,type ReviewMarker,type MarkerPriority
} from "@/lib/motion/review-markers";
import styles from "./review-notes-desk.module.css";

interface Props{
 project:MotionProject;
 playhead:number;
 activeIndex:number;
 onNavigate:(index:number,seconds:number)=>void;
}
const clock=(seconds:number)=>
 String(Math.floor(seconds/60)).padStart(2,"0")+":"+
 String(Math.floor(seconds%60)).padStart(2,"0")+"."+
 String(Math.round(seconds%1*100)).padStart(2,"0");
export default function ReviewNotesDesk({project,playhead,activeIndex,onNavigate}:Props){
 const key=useMemo(()=>reviewProjectStorageKey(project.brand,project.title,project.seed),
  [project.brand,project.title,project.seed]);
 const [notes,setNotes]=useState<ReviewMarker[]>([]);
 const [readyKey,setReadyKey]=useState<string|null>(null);
 const [draft,setDraft]=useState("");
 const [priority,setPriority]=useState<MarkerPriority>("fix");
 const [showAll,setShowAll]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
   try{
     setNotes(parseReviewMarkers(JSON.parse(localStorage.getItem(key)||"[]")));
     setReadyKey(key);
     setMessage("");
   }catch{
     setNotes([]);setReadyKey(key);setMessage("Local notes could not be loaded; check browser storage.");
   }
 },[key]);
 useEffect(()=>{
   if(readyKey!==key)return;
   try{localStorage.setItem(key,JSON.stringify(notes));}
   catch{setMessage("Local note storage unavailable. Export your notes now.");}
 },[notes,key,readyKey]);
 const open=notes.filter(n=>n.status==="open");
 const activeScene=project.scenes[activeIndex];
 const add=()=>{
   if(!activeScene)return;
   try{
     const id=crypto.randomUUID();
     setNotes(old=>addReviewMarker(old,{
       id,sceneId:activeScene.id,shotIndex:activeIndex,
       atSeconds:Math.min(project.scenes.reduce((a,x)=>a+x.seconds,0),Math.max(0,playhead)),
       text:draft,priority
     }));
     setDraft("");setMessage("Private marker added at "+clock(playhead)+". No client approval was recorded.");
   }catch(error){setMessage(error instanceof Error?error.message:"Unable to add a marker.");}
 };
 const save=()=>{
   const blob=new Blob([reviewMarkersAsText(project.title,notes,project.scenes)],
     {type:"text/plain;charset=utf-8"});
   const url=URL.createObjectURL(blob),a=document.createElement("a");
   a.href=url;a.download="motion-"+project.brand+"-director-notes.txt";
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
   setMessage("Human review notes exported to your device.");
 };
 return <section className={styles.desk} aria-label="Human film revision notes">
   <div className={styles.title}>
     <div><span>03 / DIRECTOR&apos;S MARKERS</span>
       <h3>Every fix, at the right frame.</h3>
       <p>Leave private timecoded notes while reviewing the cut. A resolved note is a human workflow state, not permission to publish.</p>
     </div>
     <b>{open.length} OPEN</b>
   </div>
   <div className={styles.composer}>
     <div className={styles.activeTime}><span>PLAYHEAD</span>
       <strong>{clock(playhead)}</strong>
       <small>SHOT {activeIndex+1} · {activeScene?.kind.toUpperCase()||"NONE"}</small>
     </div>
     <label>WHAT NEEDS ATTENTION?
       <textarea maxLength={320} rows={3} value={draft}
         onChange={e=>setDraft(e.target.value)}
         placeholder="Example: Keep the real dashboard visible longer; check narration before the next cut."/>
     </label>
     <div className={styles.composerFoot}>
       <label>PRIORITY
         <select value={priority} onChange={e=>setPriority(e.target.value as MarkerPriority)}>
           <option value="note">Observation</option>
           <option value="fix">Edit required</option>
           <option value="critical">Blocking issue</option>
         </select>
       </label>
       <button type="button" disabled={!draft.trim()||notes.length>=60||readyKey!==key}
         onClick={add}>+ MARK THIS MOMENT</button>
     </div>
   </div>
   <div className={styles.listHead}>
     <strong>REVISION QUEUE / {notes.length} NOTES</strong>
     <div><button type="button" onClick={()=>setShowAll(x=>!x)}>
         {showAll?"SHOW OPEN":"SHOW ALL"}</button>
       <button type="button" onClick={save}>↓ EXPORT NOTES</button></div>
   </div>
   <div className={styles.notes}>
     {(showAll?notes:open).length===0?<p className={styles.empty}>
       {notes.length===0?"No revision markers yet. Play the film and note any changes at the current frame.":
         "No open notes. Reopen any resolved item with SHOW ALL."}</p>
     :(showAll?notes:open).map(note=>{
       const current=markerSceneIndex(note,project.scenes);
       return <article key={note.id} className={styles.note} data-priority={note.priority}>
         <div className={styles.noteMeta}>
           <span>{clock(note.atSeconds)} · {current===null?"SHOT UNLINKED":"SHOT "+(current+1)}</span>
           <b>{note.status.toUpperCase()} / {note.priority.toUpperCase()}</b>
         </div>
         <p>{note.text}</p>
         <div className={styles.actions}>
           <button type="button" disabled={current===null}
             onClick={()=>{if(current!==null)onNavigate(current,note.atSeconds);}}>
             ↳ GO TO FRAME
           </button>
           <button type="button" onClick={()=>setNotes(old=>updateReviewMarkerStatus(
             old,note.id,note.status==="open"?"resolved":"open"))}>
             {note.status==="open"?"✓ MARK RESOLVED":"↶ REOPEN"}
           </button>
           <button type="button" className={styles.remove} aria-label="Delete note"
             onClick={()=>setNotes(old=>old.filter(x=>x.id!==note.id))}>×</button>
         </div>
       </article>;
     })}
   </div>
   {message&&<p className={styles.message} role="status">{message}</p>}
   <small className={styles.disclosure}>NOTES ARE PRIVATE TO THIS BROWSER, SCOPED TO THE CURRENT FILM TITLE.
     Export them before renaming the project or changing devices. This does not approve rights,
     certify frames or substitute for a checked exported MP4.</small>
 </section>;
}
