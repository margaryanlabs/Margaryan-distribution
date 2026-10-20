"use client";

import {useEffect,useMemo,useState} from "react";
import {cloudCatalog,migrationChecks,type CloudCatalogItem} from "@/lib/cloud/catalog";
import styles from "./migration-lab.module.css";

type CheckRecord=Record<string,boolean>;
type Progress=Record<string,CheckRecord>;
const KEY="markarian-cloud-migration-v1";
const riskColor={standard:styles.standard,high:styles.high,critical:styles.critical};
const steps=[...migrationChecks];
const escapeCsv=(value:string)=>'"'+value.replaceAll('"','""')+'"';
function repoUrl(item:CloudCatalogItem){
 return item.repository?"https://github.com/"+item.repository:null;
}
function humanRisk(level:CloudCatalogItem["level"]){
 return level==="critical"?"Critical dependencies":level==="high"?"Higher migration risk":"Standard preparation";
}
export default function MigrationLab(){
 const [selected,setSelected]=useState(cloudCatalog[0].id);
 const [saved,setSaved]=useState<Progress>({});
 const [loaded,setLoaded]=useState(false);
 const [message,setMessage]=useState("");
 useEffect(()=>{
  try{
   const raw=window.localStorage.getItem(KEY);
   if(raw){
    const parsed:unknown=JSON.parse(raw);
    if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
     const input=parsed as Record<string,unknown>;
     const next:Progress={};
     for(const item of cloudCatalog){
      const checks=input[item.id];
      if(checks&&typeof checks==="object"&&!Array.isArray(checks)){
       const record=checks as Record<string,unknown>;
       next[item.id]=Object.fromEntries(steps.map(step=>[step.id,record[step.id]===true]));
      }
     }
     setSaved(next);
    }
   }
  }catch{setMessage("Local checklist data could not be read; starting a fresh plan.");}
  setLoaded(true);
 },[]);
 const item=cloudCatalog.find(p=>p.id===selected)||cloudCatalog[0];
 const checked=saved[item.id]||{};
 const count=steps.filter(step=>checked[step.id]).length;
 const completed=useMemo(()=>cloudCatalog.reduce((total,p)=>total+steps.filter(s=>saved[p.id]?.[s.id]).length,0),[saved]);
 const total=steps.length*cloudCatalog.length;
 function toggle(id:string,enabled:boolean){
  if(!loaded)return;
  const update={...saved,[item.id]:{...checked,[id]:enabled}};
  setSaved(update);
  try{window.localStorage.setItem(KEY,JSON.stringify(update));setMessage("Saved on this device only — not on the server.");}
  catch{setMessage("Your browser blocked local storage; changes may disappear after refresh.");}
 }
 async function copyReport(){
  const rows=[
   ["Project","Repository","Repository verified","Preparation","Risk","Checklist"],
   ...cloudCatalog.map(p=>{
    const done=steps.filter(s=>saved[p.id]?.[s.id]).length;
    return [p.name,p.repository||"NOT VERIFIED",String(p.repositoryVerified),done+"/"+steps.length,p.level,
      steps.filter(s=>saved[p.id]?.[s.id]).map(s=>s.label).join("; ")];
   })
  ];
  const csv=rows.map(r=>r.map(escapeCsv).join(",")).join("\n");
  try{await navigator.clipboard.writeText(csv);setMessage("CSV checklist report copied. No secrets or deployment commands were included.");}
  catch{setMessage("Clipboard permission denied. Your checklist remains saved locally.");}
 }
 return <section className={styles.wrap}>
  <header className={styles.head}>
   <div><span className={styles.eyebrow}>MIGRATION READINESS · PLANNING ONLY</span><h1>Migration Lab</h1>
   <p>Prepare each product for our own infrastructure without touching production. Every checkbox is a manual planning note, not proof of a successful migration.</p></div>
   <button type="button" className={styles.export} onClick={()=>void copyReport()}>Copy CSV report ↗</button>
  </header>
  <div className={styles.summary}>
   <div><span>CATALOGUED PRODUCTS</span><b>{cloudCatalog.length}</b><small>Migration candidates, not live applications</small></div>
   <div><span>REPOSITORIES CONFIRMED</span><b>{cloudCatalog.filter(x=>x.repositoryVerified).length}</b><small>Verified through connected GitHub</small></div>
   <div><span>READINESS TASKS CHECKED</span><b>{completed}<i> / {total}</i></b><small>Manual browser-local progress</small></div>
  </div>
  <div className={styles.layout}>
   <aside className={styles.catalog} aria-label="Choose migration project">
    <div className={styles.catalogTop}>PORTFOLIO <span>{cloudCatalog.length} entries</span></div>
    {cloudCatalog.map(p=>{
     const done=steps.filter(s=>saved[p.id]?.[s.id]).length;
     return <button key={p.id} type="button" className={selected===p.id?styles.selected:styles.project} onClick={()=>{setSelected(p.id);setMessage("");}}>
      <span className={styles.projectName}>{p.name}<small>{p.type}</small></span><span className={styles.projectCount}>{done}/{steps.length}</span>
      <span className={styles.microTrack}><span style={{width:(done/steps.length*100)+"%"}}/></span>
     </button>;
    })}
   </aside>
   <div className={styles.details}>
    <div className={styles.titleLine}>
     <div><span className={styles.eyebrow}>DEPLOYMENT READINESS</span><h2>{item.name}</h2><p>{item.type} · {item.workload.replace("-"," + ")} workload</p></div>
     <span className={riskColor[item.level]}>{humanRisk(item.level)}</span>
    </div>
    <div className={styles.repoLine}><span>Repository</span>
     {item.repository&&item.repositoryVerified?<a href={repoUrl(item)||"#"} target="_blank" rel="noreferrer">{item.repository} ↗</a>:<strong>Needs verification</strong>}
    </div>
    <div className={styles.review}>
     <span>REVIEW BEFORE MIGRATION</span>
     <ul>{item.review.map(r=><li key={r}>{r}</li>)}</ul>
     <small>Review topics are risk hypotheses, not findings from a production infrastructure audit.</small>
    </div>
    <div className={styles.checkHead}><h3>Pre-migration checklist</h3><span>{count}/{steps.length} manually checked</span></div>
    <div className={styles.checks}>
     {steps.map((step,index)=><label className={styles.check} key={step.id}>
      <input type="checkbox" disabled={!loaded} checked={!!checked[step.id]} onChange={e=>toggle(step.id,e.target.checked)}/>
      <span className={styles.customCheck} aria-hidden="true">{checked[step.id]?"✓":""}</span>
      <span className={styles.checkCopy}><strong>{String(index+1).padStart(2,"0")} · {step.label}</strong><small>{step.hint}</small></span>
     </label>)}
    </div>
    <p className={styles.warning}><strong>Production unchanged.</strong> This tool does not deploy code, read environment secrets, copy databases or update domains. Completion must be independently validated before cutover.</p>
   </div>
  </div>
  <div className={styles.notice} role="status">{message||"Checklist progress is stored only in this browser, never in GitHub or our servers."}</div>
 </section>;
}
