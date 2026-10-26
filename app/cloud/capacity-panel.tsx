"use client";
import {useMemo,useState} from "react";
import {defaultWorkloads,twoProductWorkloads,planCapacity,type NodeCapacity,type Workload} from "@/lib/cloud/capacity";
import styles from "./capacity-panel.module.css";

const sizes=[
 {label:"Small",cpu:4,ramMiB:8192},
 {label:"Medium",cpu:8,ramMiB:16384},
 {label:"Large",cpu:16,ramMiB:32768},
 {label:"XL",cpu:32,ramMiB:65536},
 {label:"Enterprise",cpu:64,ramMiB:131072}
] as const;
const formatMemory=(n:number)=>n>=1024?(n/1024).toLocaleString("en",{maximumFractionDigits:1})+" GiB":n+" MiB";
type ObservedServer={uuid:string;name:string;status:string};
export default function CapacityPanel({onDeploy,onSetup,observedServers=[],inventoryConnected=false}:{
 onDeploy:()=>void;onSetup:()=>void;observedServers?:ObservedServer[];inventoryConnected?:boolean
}){
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
   <p>Architect from one node to a distributed service fleet. Capacity is a workload forecast, not a spending ceiling, autoscaler or live performance measurement.</p>
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
    <div className={styles.customSizing}>
      <label>Custom vCPU <input type="number" min="1" step="1" value={node.cpu} onChange={e=>{
        const cpu=Number(e.target.value);if(!Number.isSafeInteger(cpu)||cpu<1)return;
        setNode(old=>({...old,cpu,reservedCpu:Math.min(old.reservedCpu,Math.max(0,cpu-1))}));
      }}/></label>
      <label>Custom RAM (GiB) <input type="number" min="1" step="1" value={node.ramMiB/1024} onChange={e=>{
        const gib=Number(e.target.value);if(!Number.isSafeInteger(gib)||gib<1||!Number.isSafeInteger(gib*1024))return;
        setNode(old=>({...old,ramMiB:gib*1024,reservedRamMiB:Math.min(old.reservedRamMiB,gib*1024-512)}));
      }}/></label>
    </div>
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
  <section className={styles.cost} aria-label="Scalable architecture planning">
   <div><span className={styles.kicker}>MARKARIAN CLOUD / SCALE WITH DEMAND</span><h2>One platform. Any practical number of nodes.</h2>
    <p>Start with the capacity the applications actually need; expand into dedicated app, data, worker and observability nodes. The fleet planner allocates separate VETOGRAM and Promptence data pools and spreads HTTP replicas across independent zones.</p>
    <p>Cost is an operational signal, not an automatic block on architecture. A one-VPS estimate does not equal managed multi-zone availability. Database replication, verified backups and incident recovery remain separate engineering requirements.</p>
   </div>
   <a href="https://github.com/margaryanlabs/Margaryan-distribution/tree/feat/cloud-fleet-runtime-architecture-20261026/deploy/cloud/fleet" target="_blank" rel="noopener noreferrer">Review fleet manifest ↗</a>
  </section>
  <section className={styles.liveServers} aria-label="Coolify read-only server inventory">
   <div><span className={styles.kicker}>LIVE COOLIFY / READ-ONLY SERVER INVENTORY</span>
    <h2>{inventoryConnected?"Connected server records":"Live inventory not connected"}</h2>
    <p>These are actual Coolify records when authenticated, not evidence of physical zone separation, spare capacity, database replication, backups or verified failover. The private fleet UUID verifier must be run by the operator to match planned nodes.</p>
   </div>
   {inventoryConnected&&observedServers.length>0?
     <ul>{observedServers.slice(0,30).map(server=><li key={server.uuid}>
       <strong>{server.name||"Unnamed node"}</strong>
       <span>{server.status==="healthy"?"Reachable / usable":server.status||"Unknown"}</span>
     </li>)}</ul>:
     <p>No verified owned servers are currently available in the connected snapshot.</p>}
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
   <p>— This single-host preview complements the multi-node Fleet Planner. No automatic provisioning is enabled. Offsite backups and tested restores are mandatory for data safety.</p>
  </div>
  <div className={styles.actions}>
   <button type="button" onClick={onSetup}>VPS launch checklist ↗</button>
   <button type="button" onClick={onDeploy}>Plan a staging deployment ↗</button>
   <button type="button" className={styles.subtle} onClick={()=>setGuide(x=>!x)}>{guide?"Hide":"Show"} purchase decision rules</button>
  </div>
  {guide&&<div className={styles.guide}><strong>When should we buy the first VPS?</strong>
   <p>Only after source builds/tests pass; backup destination and recovery procedures are ready; the host has confirmed CPU/RAM/disk/network capacity; and the disposable Coolify pilot can be deployed. Start with staging. Do not migrate any production DNS or Supabase data before verified restoration.</p></div>}
  <footer className={styles.foot}>SINGLE-NODE PREVIEW + DISTRIBUTED FLEET PLAN · NO FIXED SPEND CAP · NO SERVER PROVISIONING</footer>
 </section>;
}
