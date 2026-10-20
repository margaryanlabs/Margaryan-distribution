"use client";
import {useState} from "react";
import styles from "./recovery-panel.module.css";

type Phase="prepare"|"backup"|"inspect"|"restore";
const phases:{id:Phase;index:string;label:string;name:string;description:string;command:string;requirements:string[]}[]=[
 {id:"prepare",index:"01",label:"Preparation",name:"Confirm private storage",
  description:"Validate encrypted offsite storage credentials, private PostgreSQL password file and a unique project name.",
  command:"node scripts/cloud/recovery.mjs --plan\nnode scripts/cloud/recovery.mjs --preflight",
  requirements:["Offsite Restic repository exists and is independently recoverable","Protected credentials stored only on the operator host","PostgreSQL staging backup role has least-privilege access"]},
 {id:"backup",index:"02",label:"Create backup",name:"Stream into encrypted storage",
  description:"pg_dump streams directly into Restic. The command never writes an unencrypted dump file to local disk.",
  command:"node scripts/cloud/recovery.mjs --backup-postgres",
  requirements:["Server-side database and remote repository access already verified","Snapshot ID and archive filename recorded by the operator","Successful backup does not imply successful restoration"]},
 {id:"inspect",index:"03",label:"Verify archive",name:"Read an encrypted archive",
  description:"Restic streams one archive into pg_restore's format inspector. Integrity inspection is not a real SQL restore.",
  command:"node scripts/cloud/recovery.mjs --inspect-snapshot SNAPSHOT_ID PROJECT-TIMESTAMP.dump\nnode scripts/cloud/recovery.mjs --check-repository",
  requirements:["Use an actual previously returned snapshot ID and filename","Validate both snapshot inspection and repository integrity","Keep Restic encryption password outside the repository"]},
 {id:"restore",index:"04",label:"Restore drill",name:"Prove disaster recovery",
  description:"A separate, empty PostgreSQL staging instance must be restored and tested by an approved operator. This is a mandatory gate, not an automated web action.",
  command:"# Separate staging procedure only — see docs/cloud/RECOVERY.md",
  requirements:["Isolated new staging database with no production endpoints","Restore tables, policies and migrations; verify application login","Record timing, consistency checks and operator sign-off"]}
];
export default function RecoveryPanel(){
 const [active,setActive]=useState<Phase>("prepare");
 const [copied,setCopied]=useState("");
 const current=phases.find(x=>x.id===active)||phases[0];
 async function copy(){
  if(active==="restore")return;
  try{
   await navigator.clipboard.writeText(current.command);
   setCopied("Command copied. Configure all secrets on the protected server.");
  }catch{setCopied("Clipboard is unavailable. Commands remain visible for manual review.");}
 }
 return <section className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.kicker}>MARKARIAN CLOUD / DATA RESILIENCE</span>
    <h1>Recovery <em>Center.</em></h1>
    <p>Our data belongs to us. Prepare encrypted backups, inspect real archives and prove restoration before moving a single production database.</p></div>
   <div className={styles.seal}><span>◇</span><strong>OWNER-ONLY</strong><small>SOURCE READY · NOT DEPLOYED</small></div>
  </header>
  <div className={styles.metrics}>
   <article><span>OFFSITE BACKUP SOURCE</span><strong>Prepared</strong><small>PostgreSQL → Restic stream, operator CLI</small></article>
   <article><span>CONNECTED BACKUP REPOSITORY</span><strong>—</strong><small>No server-side evidence feed configured</small></article>
   <article><span>VERIFIED RECOVERY DRILLS</span><strong>—</strong><small>No real restore evidence has been collected</small></article>
  </div>
  <div className={styles.content}>
   <nav className={styles.phases} aria-label="Recovery process">
    {phases.map(p=><button key={p.id} type="button" onClick={()=>{setActive(p.id);setCopied("");}} className={active===p.id?styles.phaseActive:styles.phase} aria-pressed={active===p.id}>
     <span>{p.index}</span><strong>{p.label}</strong><small>{p.name}</small>
    </button>)}
   </nav>
   <article className={styles.detail}>
    <div className={styles.detailHeader}><span className={styles.kicker}>RECOVERY PROCEDURE / {current.index}</span><span className={styles.readonly}>MANUAL · SAFE MODE</span></div>
    <h2>{current.name}</h2><p>{current.description}</p>
    <h3>Operator command</h3>
    <div className={styles.terminal}>
     <div><span/><span/><span/><small>PRIVATE VPS TERMINAL · NODE 22+</small></div>
     <pre>{current.command}</pre>
    </div>
    <div className={styles.actions}>
     {active!=="restore"&&<button type="button" onClick={()=>void copy()}>Copy command <span>↗</span></button>}
     <span role="status">{copied||"Never paste passwords or API keys into the browser."}</span>
    </div>
    <h3>Before proceeding</h3>
    <ul>{current.requirements.map(x=><li key={x}>{x}</li>)}</ul>
   </article>
  </div>
  <section className={styles.boundary}><span className={styles.boundaryIcon}>⚿</span><div>
   <strong>Production databases are protected</strong>
   <p>This interface does not run backups, restore databases, delete snapshots, schedule jobs, display credentials, or assert a successful recovery. A proven staging restore is required before cutover.</p></div>
  </section>
  <footer className={styles.footer}>SOURCE: scripts/cloud/recovery.mjs · RUNBOOK: docs/cloud/RECOVERY.md · STORAGE AND SUPABASE OBJECT BACKUPS ARE SEPARATE WORKSTREAMS.</footer>
 </section>;
}
