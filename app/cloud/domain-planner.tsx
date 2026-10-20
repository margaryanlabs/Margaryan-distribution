"use client";
import {useMemo,useState} from "react";
import {domainConnectPlan,domainInputErrors,type DomainDraft} from "@/lib/cloud/domain-plan";
import styles from "./domain-planner.module.css";
const defaultValue:DomainDraft={hostname:"",ipv4:"",project:"staging-app"};
export default function DomainPlanner({onOpenSetup}:{onOpenSetup:()=>void}){
 const [draft,setDraft]=useState<DomainDraft>(defaultValue);
 const [copyStatus,setCopyStatus]=useState("");
 const [showJson,setShowJson]=useState(false);
 const errors=useMemo(()=>domainInputErrors(draft),[draft]);
 const plan=useMemo(()=>errors.length?null:domainConnectPlan(draft),[draft,errors]);
 function update(key:keyof DomainDraft,value:string){setDraft(v=>({...v,[key]:value}));setCopyStatus("");}
 async function copy(){
  if(!plan)return;
  try{await navigator.clipboard.writeText(JSON.stringify(plan,null,2));setCopyStatus("DNS connection plan copied for owner review.");}
  catch{setCopyStatus("Clipboard unavailable. Plan remains visible on this page.");}
 }
 return <section className={styles.root}>
  <header className={styles.hero}><div><span className={styles.kicker}>MARKARIAN CLOUD / PRIVATE EDGE</span>
   <h1>Connect every <em>domain.</em></h1>
   <p>A controlled DNS workflow for our own servers. Preview the exact record, verify HTTPS and keep rollback possible.</p></div>
   <span className={styles.tag}>REVIEW MODE · NO DNS CHANGES</span></header>
  <div className={styles.grid}>
   <section className={styles.panel}><div><span className={styles.kicker}>01 / DOMAIN CONFIGURATION</span><h2>New domain connection</h2></div>
    <div className={styles.inputs}>
     <label>Project slug<input placeholder="staging-app" value={draft.project} onChange={e=>update("project",e.target.value)}/></label>
     <label>Domain name<input placeholder="app.example.com" value={draft.hostname} onChange={e=>update("hostname",e.target.value)}/></label>
     <label>Public VPS IPv4<input placeholder="Public IP from your own VPS" value={draft.ipv4} onChange={e=>update("ipv4",e.target.value)}/></label>
    </div>
    <p className={styles.note}>Only use the IP that your VPS provider actually assigned. The DNS host field in your registrar may require a relative name instead of the full hostname. Check the existing zone before editing.</p>
    {draft.hostname||draft.ipv4?<div className={styles.errors} role="status">{errors.length?errors.map(e=><p key={e}>{e}</p>):"DNS plan inputs are valid. No DNS or TLS verification has occurred."}</div>:null}
   </section>
   <section className={styles.panel}><div><span className={styles.kicker}>02 / PUBLIC DNS RECORD</span><h2>Record preview</h2></div>
    <div className={styles.preview}><span>RECORD TYPE<strong>A</strong></span><span>HOSTNAME<strong>{plan?.dns.host||"—"}</strong></span>
     <span>VALUE / TARGET<strong>{plan?.dns.value||"—"}</strong></span><span>TTL<strong>Auto / 300 seconds</strong></span></div>
    <p className={styles.note}>Creating this record at your DNS provider and attaching the hostname in Coolify are separate deliberate actions. The console does not perform them yet.</p>
    <div className={styles.buttons}><button type="button" disabled={!plan} onClick={()=>void copy()}>Copy reviewed plan ↗</button>
     <button type="button" onClick={()=>setShowJson(x=>!x)}>{showJson?"Hide":"Show"} JSON</button></div>
    {showJson&&<pre>{plan?JSON.stringify(plan,null,2):"Complete valid project, hostname and IP fields."}</pre>}
    <p role="status">{copyStatus}</p>
   </section>
  </div>
  <section className={styles.checks}><span className={styles.kicker}>03 / RELEASE GATES</span><h2>Before the domain goes live</h2>
   <div>{(plan?.checks||[
    "Confirm your VPS has a public IP and a secure Coolify installation",
    "Confirm domain ownership and the DNS provider",
    "Add the hostname and validate DNS, TLS and application health",
    "Test cutover and rollback on staging before production"
   ]).map((s,i)=><article key={s}><span>{String(i+1).padStart(2,"0")}</span><strong>{s}</strong><small>NOT VERIFIED</small></article>)}</div>
   <button type="button" onClick={onOpenSetup}>Own VPS setup ↗</button>
  </section>
  <p className={styles.foot}>No registrar API permissions, credentials or live DNS edits are requested by this browser. Full multi-tenant domain automation comes after secured server access and auditable approvals.</p>
 </section>;
}
