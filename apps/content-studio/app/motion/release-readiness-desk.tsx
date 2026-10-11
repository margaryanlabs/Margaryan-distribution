"use client";
import type { MotionProject } from "@/lib/motion/studio";
import type { MotionQAReport } from "@/lib/motion/quality";
import { hasProductScreen } from "@/lib/motion/screen-media";
import { getMotionSceneSource } from "@/lib/motion/scene-source";
import {
  inspectReleaseReadiness,releaseReadinessExport,type ReadinessPanel
} from "@/lib/motion/release-readiness";
import styles from "./release-readiness-desk.module.css";

type Props={
  project:MotionProject;qa:MotionQAReport;
  voiceAttached:boolean;voiceSeconds:number|null;
  voiceReady:boolean;voiceOverflowSeconds:number;
  musicAttached:boolean;
  onNavigate:(panel:ReadinessPanel,shotIndex?:number)=>void;
};
const stateName={pass:"CHECKED",review:"HUMAN REVIEW",block:"FIX REQUIRED"};
export default function ReleaseReadinessDesk({
 project,qa,voiceAttached,voiceSeconds,voiceReady,voiceOverflowSeconds,musicAttached,onNavigate
}:Props){
 const report=inspectReleaseReadiness(project,qa,{
   getSource:id=>getMotionSceneSource(id),
   legacyScreen:hasProductScreen(project.brand),
   voiceAttached,voiceSeconds,voiceReady,voiceOverflowSeconds,musicAttached
 });
 const download=()=>{
   const blob=new Blob([releaseReadinessExport(report)],{type:"application/json"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;
   a.download="motion-"+project.brand+"-production-review.json";
   document.body.appendChild(a);a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),30_000);
 };
 return <section className={styles.desk} aria-label="Source and release readiness review">
   <div className={styles.overline}><span>THE PRODUCTION DESK / ORIGINAL FILM EVIDENCE</span>
     <span>NO CLAIMED AI-QUALITY SCORE</span></div>
   <div className={styles.hero}>
     <div>
       <h3>Is this film <em>actually ready?</em></h3>
       <p>Separate technical export readiness from commercial approval. A decoded video, working button or pretty frame does not prove that facts, rights or sound are correct.</p>
     </div>
     <span className={styles.state} data-state={report.renderable?"review":"block"}>
       <i aria-hidden="true"/>{report.renderable?"STRUCTURE RENDERABLE":"TECHNICAL ISSUES"}
     </span>
   </div>
   <div className={styles.stats}>
     <div><strong>{report.boundSources}<span> / {report.sourceShots}</span></strong>
       <small>PRODUCT SHOTS WITH LOCAL SOURCES</small></div>
     <div><strong>{report.blockers}</strong><small>ACTIONABLE BLOCKERS</small></div>
     <div><strong>{report.reviews}</strong><small>REVIEW ITEMS OPEN</small></div>
     <div><strong>{voiceAttached?"ATTACHED":"NOT SET"}</strong>
       <small>REAL HUMAN NARRATION</small></div>
   </div>
   <div className={styles.sectionTitle}><strong>01 / SCENE EVIDENCE MAP</strong>
     <span>SELECT A SHOT TO FIX OR VERIFY</span></div>
   <div className={styles.shotMap}>
     {report.shots.map(shot=><button type="button" key={shot.index}
       className={styles.shot} data-state={shot.status}
       title={shot.detail} onClick={()=>onNavigate(shot.status==="block"?"media":"scene",shot.index)}>
       <span className={styles.shotTop}><b>{String(shot.index+1).padStart(2,"0")}</b>
         <span>{shot.seconds.toFixed(1)}s</span></span>
       <strong>{shot.headline||"UNTITLED SHOT"}</strong>
       <small>{({
         "motion-graphics":"ORIGINAL MOTION",
         "real-video":"REAL VIDEO",
         "real-image":"REAL IMAGE",
         "legacy-image":"LEGACY SOURCE",
         "missing-source":"SOURCE MISSING"
       })[shot.source]}</small>
       <span className={styles.shotFoot}>{shot.status==="block"?"FIX SOURCE ↗":"INSPECT SHOT ↗"}</span>
     </button>)}
   </div>
   <div className={styles.sectionTitle}><strong>02 / WHAT STILL NEEDS ATTENTION</strong>
     <button type="button" onClick={download}>↓ SAVE REVIEW MANIFEST</button></div>
   <div className={styles.checks}>
     {report.items.map(i=><div className={styles.check} data-state={i.state} key={i.id}>
       <span className={styles.checkIcon} aria-hidden="true">
         {i.state==="block"?"!":i.state==="pass"?"✓":"◐"}
       </span>
       <div className={styles.checkBody}>
         <div><b>{i.label}</b><small>{stateName[i.state]}</small></div>
         <p>{i.detail}</p>
       </div>
       <button type="button" onClick={()=>onNavigate(i.panel,i.shotIndex)}>
         {i.action} <span>↗</span>
       </button>
     </div>)}
   </div>
   <div className={styles.disclosure}>
     <span>RELEASE STANDARD / HUMAN-IN-THE-LOOP</span>
     <p><b>This is not a release certificate.</b> The operator must verify source ownership,
       product claims, captions, voice timing and the final exported file by watching
       and listening to the complete video. We do not invent a client sign-off,
       a completed export or a successful sales result.</p>
   </div>
 </section>;
}
