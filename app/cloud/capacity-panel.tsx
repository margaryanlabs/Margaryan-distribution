"use client";
import {useMemo,useState} from "react";
import {defaultWorkloads,twoProductWorkloads,planCapacity,type NodeCapacity,type Workload} from "@/lib/cloud/capacity";
import styles from "./capacity-panel.module.css";

const sizes=[
 {label:"Small",cpu:4,ramMiB:8192},
 {label:"Medium",cpu:8,ramMiB:16384},
 {label:"Large",cpu:16,ramMiB:32768},
 {label:"XL",cpu:32,ramMiB:65536}
] as const;
const formatMemory=(n:number)=>n>=1024?(n/1024).toLocaleString("en",{maximumFractionDigits:1})+" GiB":n+" MiB";
export default function CapacityPanel({onDeploy,onSetup}:{onDeploy:()=>void;onSetup:()=>void}){
 const [node,setNode]=useState<NodeCapacity>({cpu:16,ramMiB:32768,reservedCpu:2,reservedRamMiB:4096});
 const [workloads,setWorkloads]=useState<Workload[]>(twoProductWorkloads);
 const [scenario,setScenario]=useState<"first-two"|"portfolio">("first-two");
 const [guide,setGuide]=useState(false);
 const result=useMemo(()=>planCapacity(node,workloads),[node,workloads]);
 function setPreset(v:{cpu:number;ramMiB:number}){
  setNode({cpu:v.cpu,ramMiB:v.ramMiB,reservedCpu:v.cpu>2?2:1,
   reservedRamMiB:Math.min(v.ramMiB/4,4096)});
 }
 function chooseScenario(next:"first-two"|"portfolio"){
  setScenario(next);
  setWorkloads(next==="first-two"?[...twoProductWorkloads]:[...defaultWorkloads]);
 }
 function toggle(id:string,enabled:boolean){setWorkloads(items=>items.map(x=>x.id===id?{...x,enabled}:x));}
 const active=workloads.filter(x=>x.enabled);
 const cpu=Math.max(0,Math.min(100,result.cpuPercent||0));
 const ram=Math.max(0,Math.min(100,result.ramPercent||0));
 return <section className={styles.root}>
  <header className={styles.hero}>
   <span className={styles.kicker}>MARKARIAN CLOUD / OWN INFRASTRUCTURE PLANNING</span>
   <h1>Buy the right <em>capacity.</em></h1>
   <p>Before paying for VPS, model what our applications may need. These are manual allocation assumptions, not measured demand, vendor quotes or a guarantee of 1,000 users.</p>
  </header>
  <section className={styles.scenarios} aria-label="Workload planning scenario">
   <button type="button" aria-pressed={scenario==="first-two"} onClick={()=>chooseScenario("first-two")}>VETOGRAM + Promptence</button>
   <button type="button" aria-pressed={scenario==="portfolio"} onClick={()=>chooseScenario("portfolio")}>Original portfolio model</button>
   <p>Two-product preset isolates Neon-compatible VETOGRAM PostgreSQL from Promptence Supabase. All figures are hypothetical allocations, not observed CPU/RAM use.</p>
  </section>
  <div className={styles.top}>
   <section className={styles.host}>
    <div className={styles.header}><span className={styles.kicker}>01 / SERVER PROFILE</span><h2>Choose a candidate host</h2></div>
    <div className={styles.presets}>{sizes.map(s=><button type="button" key={s.label} onClick={()=>setPreset(s)}
     aria-pressed={node.cpu===s.cpu&&node.ramMiB===s.ramMiB}><b>{s.label}</b><small>{s.cpu} vCPU · {formatMemory(s.ramMiB)}</small></button>)}</div>
    <div className={styles.details}><div><span>VIRTUAL CPU</span><strong>{node.cpu}</strong><small>vCPU total</small></div><div><span>MEMORY</span><strong>{formatMemory(node.ramMiB)}</strong><small>RAM total</small></div>
     <div><span>OS RESERVE</span><strong>{node.reservedCpu} CPU</strong><small>{formatMemory(node.reservedRamMiB)} kept free</small></div></div>
   </section>
   <section className={styles.result}>
    <div className={styles.header}><span className={styles.kicker}>02 / CAPACITY OUTCOME</span><h2>{result.fit?"Within planned limit":"Capacity exceeded"}</h2></div>
    <div className={styles.barRow}><div><span>CPU ALLOCATION</span><b>{result.usedCpu} / {result.availableCpu} vCPU</b></div>
     <div className={styles.track}><div style={{width:cpu+"%"}}/></div></div>
    <div className={styles.barRow}><div><span>MEMORY ALLOCATION</span><b>{formatMemory(result.usedRamMiB)} / {formatMemory(result.availableRamMiB)}</b></div>
     <div className={styles.track}><div style={{width:ram+"%"}}/></div></div>
    <p>{result.fit?"The selected allocations fit on paper. Real hosts still need disk, I/O, CPU burst and failure headroom.":"The selected host cannot fit these planned allocations. Increase capacity or split workloads."}</p>
   </section>
  </div>
  <section className={styles.cost} aria-label="Read-only hosting cost reference">
   <div><span className={styles.kicker}>COST POLICY / 26 OCT 2026 / NOT A QUOTE</span><h2>Hosting budget: $50 / month</h2>
    <p>Reference only: Hetzner CX53 $34.99 + IPv4 $0.60 + external Object Storage approx. $7.99 = <strong>$43.58 before VAT</strong>. A $5 reserve leaves $1.42 headroom. Optional server snapshots (~$7), taxes, traffic, domains, AI models and email can exceed $50.</p>
    <p>Hetzner usage alerts do not enforce a spending cap. This page never provisions a server and cannot approve payment or production cutover.</p>
   </div>
   <a href="https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/" target="_blank" rel="noopener noreferrer">Review official pricing ↗</a>
  </section>
  <section className={styles.workloads}>
   <div className={styles.workHeader}><div><span className={styles.kicker}>03 / OUR APPLICATIONS</span><h2>Plan workloads</h2></div><span>{active.length} enabled / {workloads.length} profiles</span></div>
   <div className={styles.rows}>{workloads.map(w=><label className={styles.row} key={w.id}>
    <input type="checkbox" checked={w.enabled} onChange={e=>toggle(w.id,e.target.checked)}/>
    <span className={styles.indicator}>{w.name.slice(0,2).toUpperCase()}</span>
    <span className={styles.name}><strong>{w.name}</strong><small>{w.notes}</small></span>
    <span className={styles.allocation}>{w.cpu} vCPU <b> / </b> {formatMemory(w.ramMiB)}</span>
    <span className={styles.state}>{w.enabled?"INCLUDED":"EXCLUDED"}</span>
   </label>)}</div>
  </section>
  <div className={styles.warnings}>
   <span className={styles.kicker}>CAPACITY ADVISORIES</span>
   {result.notes.length?result.notes.map((n,i)=><p key={i}>— {n}</p>):
    <p>— Keep primary databases separate from analytics and media rendering when moving beyond a disposable pilot.</p>}
   <p>— The inexpensive shared-vCPU plans do not reserve CPU exclusively. Check disk IOPS, bandwidth, geography and supplier availability before ordering.</p>
   <p>— This page does not fetch current VPS prices or create a server. Separate offsite backups, data isolation and verified restores are mandatory before production.</p>
  </div>
  <div className={styles.actions}>
   <button type="button" onClick={onSetup}>VPS launch checklist ↗</button>
   <button type="button" onClick={onDeploy}>Plan a staging deployment ↗</button>
   <button type="button" className={styles.subtle} onClick={()=>setGuide(x=>!x)}>{guide?"Hide":"Show"} purchase decision rules</button>
  </div>
  {guide&&<div className={styles.guide}><strong>When should we buy the first VPS?</strong>
   <p>Only after source builds/tests pass; backup destination and recovery procedures are ready; the host has confirmed CPU/RAM/disk/network capacity; and the disposable Coolify pilot can be deployed. Start with staging. Do not migrate any production DNS or Supabase data before verified restoration.</p></div>}
  <footer className={styles.foot}>ESTIMATES ONLY · NOT A RESOURCE MONITOR · NOT A PRICE QUOTE</footer>
 </section>;
}
