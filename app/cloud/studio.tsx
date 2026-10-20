"use client";
import {useMemo,useState} from "react";
import {studioModules,type StudioModule} from "@/lib/cloud/studio";
import type {CloudSnapshot} from "@/lib/cloud/command-center";
import styles from "./studio.module.css";
type Category="All"|"Deploy"|"Compute"|"Data"|"Operations"|"Security";
const categories:Category[]=["All","Deploy","Compute","Data","Operations","Security"];
const countFor=(data:CloudSnapshot,item:StudioModule)=>{
 if(item.capability!=="inventory"||item.source==="none")return null;
 if(!data.sources?.[item.source])return null;
 return item.source==="apps"?data.applications.length:item.source==="servers"?data.servers.length:
  item.source==="deployments"?data.deployments.length:data.projects.length;
};
export default function CloudStudio({data,onOpenSetup}:{data:CloudSnapshot;onOpenSetup:()=>void}){
 const [category,setCategory]=useState<Category>("All");
 const [query,setQuery]=useState("");
 const [active,setActive]=useState("sites");
 const selected=studioModules.find(m=>m.id===active)||studioModules[0];
 const results=useMemo(()=>studioModules.filter(m=>(category==="All"||m.category===category)&&
  (m.name+" "+m.description+" "+m.engine+" "+m.scope.join(" ")).toLowerCase().includes(query.toLowerCase().trim())
 ),[category,query]);
 const number=countFor(data,selected);
 return <section className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.eyebrow}>MARKARIAN CLOUD OS / UNIFIED PLATFORM</span><h1>Everything.<em> One workspace.</em></h1>
    <p>Deploy, databases, authentication, storage, queues, observability and security in one operator console. Every module is visible; its actual readiness is never simulated.</p></div>
   <span className={styles.version}>PLATFORM V1 · READ ONLY</span>
  </header>
  <div className={styles.counters}><article><small>PLATFORM MODULES</small><strong>{studioModules.length}</strong><span>Unified capability map</span></article>
   <article><small>LIVE DATA SOURCES</small><strong>{Object.values(data.sources||{}).filter(Boolean).length}/4</strong><span>Coolify inventory endpoints</span></article>
   <article><small>RUNNING VPS</small><strong>{data.sources?.servers?data.servers.length:"—"}</strong><span>Observed, not assumed</span></article>
  </div>
  <div className={styles.filterBar}>
   <label className={styles.search}><span>⌕</span><input aria-label="Search Cloud Studio modules" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search capability, technology, deployment…"/></label>
   <div className={styles.categories}>{categories.map(c=><button key={c} type="button" className={category===c?styles.categoryActive:styles.category} onClick={()=>setCategory(c)} aria-pressed={category===c}>{c}</button>)}</div>
  </div>
  <div className={styles.content}>
   <div className={styles.cards}>
    {results.length===0?<div className={styles.noResults}>No modules found. Try another filter.</div>:results.map(m=>{
     const count=countFor(data,m);
     const isReading=count!==null;
     return <button key={m.id} type="button" onClick={()=>setActive(m.id)} aria-pressed={selected.id===m.id} className={selected.id===m.id?styles.selected:styles.card}>
      <div className={styles.cardHead}><span className={styles.glyph}>{m.icon}</span><small>{m.category.toUpperCase()}</small></div>
      <strong>{m.name}</strong><span className={styles.description}>{m.description}</span>
      <span className={styles.cardBottom}><i className={isReading?styles.dotLive:styles.dotPlan}/>{isReading?"READING "+count+" RECORDS":"SETUP / ROADMAP"}</span>
     </button>;
    })}
   </div>
   <aside className={styles.details}>
    <div className={styles.detailsTop}><span className={styles.eyebrow}>SELECTED SERVICE</span><span className={number!==null?styles.reading:styles.planning}>{number!==null?"CONNECTED INVENTORY":"NOT DEPLOYED"}</span></div>
    <h2>{selected.name}</h2><p>{selected.description}</p>
    <div className={styles.engine}><small>PLANNED IMPLEMENTATION</small><strong>{selected.engine}</strong></div>
    {number!==null&&<div className={styles.inventory}><small>RECORDS RETURNED BY COOLIFY</small><strong>{number}</strong><span>Inventory count alone does not mean the service is healthy.</span></div>}
    <h3>Capabilities</h3><ul>{selected.scope.map(s=><li key={s}>{s}</li>)}</ul>
    <h3>Launch requirements</h3><ol>{selected.gate.map(s=><li key={s}>{s}</li>)}</ol>
    <button type="button" className={styles.action} onClick={onOpenSetup}>Infrastructure setup ↗</button>
    <p className={styles.disclaimer}>No write/deploy actions are enabled. Database, auth, storage and backups require separate verified services before this console can operate them.</p>
   </aside>
  </div>
 </section>;
}
