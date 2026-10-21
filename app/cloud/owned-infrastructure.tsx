"use client";
import {useState} from "react";
import {ownedLayers,ownedSignals} from "@/lib/cloud/owned-infrastructure";
import type {CloudSnapshot} from "@/lib/cloud/command-center";
import styles from "./owned-infrastructure.module.css";

type Props={data:CloudSnapshot;onOpenSetup:()=>void;onOpenStudio:()=>void;onOpenMigration:()=>void};
const groups=["All","Control","Compute","Data","Operations","Trust"] as const;
const deployment=[
 {number:"01",title:"Control host",subtitle:"Private Coolify, GitHub deployments and ingress",label:"First host",source:"deploy/cloud/pilot"},
 {number:"02",title:"Data host",subtitle:"Self-hosted Supabase with private Postgres and Storage",label:"Separate resource",source:"docs/cloud/SELF_HOSTED_DATA.md"},
 {number:"03",title:"Operations host or isolated node",subtitle:"Valkey, Prometheus and Grafana starter",label:"Private only",source:"deploy/cloud/ops"},
 {number:"04",title:"Analytics capacity",subtitle:"VETO ClickHouse, AI and Motion rendering cannot share an undersized node",label:"Capacity review",source:"docs/cloud/MIGRATION_SOURCE_AUDIT.md"}
];
export default function OwnedInfrastructure({data,onOpenSetup,onOpenStudio,onOpenMigration}:Props){
 const [group,setGroup]=useState<(typeof groups)[number]>("All");
 const [selected,setSelected]=useState("runtime");
 const source=ownedLayers.find(x=>x.id===selected)||ownedLayers[1];
 const signals=ownedSignals(data);
 const current=ownedLayers.filter(x=>group==="All"||x.category===group);
 return <div className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.kicker}>MARKARIAN CLOUD OS / OWNED INFRASTRUCTURE</span>
    <h1>Our cloud.<em> Our rules.</em></h1>
    <p>One independent platform for our websites, databases, AI workloads, queues, storage and monitoring. Legacy providers are migration sources, not permanent dependencies.</p>
    <div className={styles.buttons}><button type="button" onClick={onOpenSetup} className={styles.primary}>Connect our VPS ↗</button>
     <button type="button" onClick={onOpenStudio} className={styles.secondary}>Explore capabilities →</button></div>
   </div>
   <span className={styles.state}>SOURCE PREPARED · NOT HOSTED</span>
  </header>
  <div className={styles.metrics} aria-label="Observed own infrastructure">
   <article><small>COOLIFY CONNECTION</small><strong>{signals.stage}</strong><span>Only real provider responses count as connected</span></article>
   <article><small>REGISTERED VPS</small><strong>{signals.serverCount===null?"—":signals.serverCount}</strong><span>Own servers reported by Coolify</span></article>
   <article><small>HOSTED APPLICATIONS</small><strong>{signals.applicationCount===null?"—":signals.applicationCount}</strong><span>Observed app records, not planned projects</span></article>
   <article><small>VERIFIED MIGRATIONS</small><strong>—</strong><span>No cutover evidence registry integrated yet</span></article>
  </div>
  <div className={styles.mid}>
   <section className={styles.catalog}>
    <div className={styles.head}><div><span className={styles.kicker}>OWN PLATFORM CAPABILITIES</span><h2>One integrated stack</h2></div><span className={styles.count}>{ownedLayers.length} foundations</span></div>
    <div className={styles.filters}>{groups.map(g=><button key={g} type="button" onClick={()=>setGroup(g)} aria-pressed={group===g} className={g===group?styles.filterActive:styles.filter}>{g}</button>)}</div>
    <div className={styles.layers}>{current.map(x=><button key={x.id} type="button" className={selected===x.id?styles.active:styles.layer} aria-pressed={selected===x.id} onClick={()=>setSelected(x.id)}>
     <span className={styles.layerIcon}>{x.id==="data"?"▤":x.id==="runtime"?"▦":x.id==="observe"?"⌁":x.id==="queue"?"⇄":x.id==="security"?"◇":x.id==="backup"?"⇣":"✦"}</span>
     <span className={styles.layerName}><strong>{x.name}</strong><small>{x.lead}</small></span>
     <span className={styles.layerStatus}>{x.status==="source-ready"?"SOURCE READY":"PLANNED"}</span>
    </button>)}</div>
   </section>
   <aside className={styles.details}>
    <span className={styles.kicker}>PLATFORM SERVICE · {source.category.toUpperCase()}</span>
    <h2>{source.name}</h2><p>{source.lead}</p>
    <div className={styles.engine}><small>ENGINE</small><strong>{source.engine}</strong></div>
    <h3>What we will own</h3><ul>{source.abilities.map(x=><li key={x}>{x}</li>)}</ul>
    <h3>Still required</h3><ul>{source.needs.map(x=><li key={x}>{x}</li>)}</ul>
    <div className={styles.source}><small>REPOSITORY PATH</small><code>{source.location}</code></div>
    <p className={styles.footnote}>“Source ready” means implementation files exist in Git. It does not mean the underlying service has been deployed, tested, secured or backed up.</p>
   </aside>
  </div>
  <section className={styles.deployment}><div className={styles.head}><div><span className={styles.kicker}>OUR SERVERS · RELEASE PATH</span><h2>From source code to real infrastructure</h2></div>
   <button type="button" onClick={onOpenMigration} className={styles.migrate}>Migration Lab ↗</button></div>
   <div className={styles.deploymentRows}>{deployment.map(x=><article key={x.number}><span className={styles.step}>{x.number}</span><div><strong>{x.title}</strong><small>{x.subtitle}</small><code>{x.source}</code></div><span className={styles.stepState}>{x.label}</span></article>)}</div>
  </section>
  <div className={styles.warning}><strong>Owner-only until hardened:</strong> no public management ports, no production database writes, and no automatic cutover. Authentication, test builds, secure networking, encrypted offsite backups and verified recovery come before handling real user data.</div>
 </div>;
}
