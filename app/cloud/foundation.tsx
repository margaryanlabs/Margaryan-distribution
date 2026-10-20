"use client";

import {useState} from "react";
import {foundationServices,foundationGates} from "@/lib/cloud/foundation";
import styles from "./foundation.module.css";

export default function CloudFoundation(){
 const [active,setActive]=useState("data");
 const service=foundationServices.find(s=>s.id===active)||foundationServices[2];
 return <section className={styles.root}>
  <div className={styles.head}>
   <div><span className={styles.kicker}>OWNER-MANAGED INFRASTRUCTURE · BLUEPRINT V2</span>
    <h1>The cloud is <em>ours to operate.</em></h1>
    <p>A composable foundation for deployments, runtimes and data. Blueprints are source code and plans only. Nothing below is a running service.</p>
   </div><span className={styles.stage}>NOT DEPLOYED</span>
  </div>
  <div className={styles.grid}>
   {foundationServices.map(s=><button type="button" key={s.id} onClick={()=>setActive(s.id)}
    aria-pressed={active===s.id} className={active===s.id?styles.selected:styles.card}>
    <span className={styles.cardTop}><strong>{s.title}</strong><small>◇ PREPARED</small></span>
    <span className={styles.replacement}>Replaces {s.replacement}</span>
    <span className={styles.subtitle}>{s.subtitle}</span>
   </button>)}
  </div>
  <article className={styles.details}>
   <div className={styles.detailsHead}><div><span className={styles.kicker}>DEPLOYMENT BLUEPRINT</span><h2>{service.title}</h2>
    <p>{service.software}</p></div><span className={styles.stage}>{service.isolation==="isolated"?"DEDICATED RESOURCES":"SHARED COMPUTE"}</span></div>
   <div className={styles.requirements}><strong>Required before launch</strong>
    <ul>{service.requirements.map(item=><li key={item}>{item}</li>)}</ul></div>
   <div className={styles.note}><strong>Source location</strong><code>{service.doc}</code>
    <p>Open this path in the GitHub feature branch. No credentials, databases, users or DNS records are created here.</p></div>
  </article>
  <article className={styles.gates}><div><span className={styles.kicker}>SAFE MIGRATION</span><h2>Infrastructure release gates</h2></div>
   <div className={styles.gateGrid}>{foundationGates.map((g,i)=><div key={g.id} className={styles.gate}>
    <span>{String(i+1).padStart(2,"0")}</span><strong>{g.label}</strong><small>{g.description}</small>
   </div>)}</div>
  </article>
  <p className={styles.footer}>This interface does not make a readiness claim or manage customer workloads. First deployments require an owned VPS, protected credentials and verified backups.</p>
 </section>;
}