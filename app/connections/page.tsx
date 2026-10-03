"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./connections.module.css";

type Requirement={id:string;name:string;configured:boolean;required:boolean;variables:string[];why:string};
type Provider={id:string;name:string;configured:boolean;capability:string};
type Connections={
 executionEnabled:boolean;
 runtime:{storage?:string;durable?:boolean;persistence?:string};
 security:{operatorAuthConfigured?:boolean};
 automation:{portfolioCronConfigured?:boolean;workerConfigured?:boolean};
 launchRequirements:Requirement[];
 providers:Provider[];
};

export default function ConnectionsPage(){
 const[data,setData]=useState<Connections|null>(null);
 const[error,setError]=useState("");
 async function refresh(){setError("");const res=await fetch("/api/connections",{cache:"no-store"});const body=await res.json();if(!res.ok)throw new Error(body.error||"Connections status failed");setData(body);}
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Connections status failed"));},[]);
 const required=data?.launchRequirements.filter(item=>item.required)||[];
 const readyCount=required.filter(item=>item.configured).length;
 const next=required.find(item=>!item.configured);
 const mode=useMemo(()=>{
   if(!data)return"LOADING";
   if(!data.runtime.durable||!data.providers.find(p=>p.id==="openai")?.configured)return"OFFLINE";
   if(!data.executionEnabled)return"ASSISTED";
   return"LIVE";
 },[data]);

 return <main className={styles.shell}>
  <header className={styles.header}>
   <div><span className={styles.eyebrow}>MARGARYAN DISTRIBUTION / ACTIVATION</span><h1>Connections Center</h1><p>One place to see what the Promptence revenue machine can actually do right now — no green badges for missing infrastructure.</p></div>
   <div className={styles.mode}><span className={mode==="LIVE"?styles.live:mode==="ASSISTED"?styles.assisted:styles.offline}/><div><b>{mode}</b><small>{data?.runtime.storage||"checking runtime"}</small></div></div>
  </header>

  {error&&<div className={styles.notice}>{error}</div>}

  <section className={styles.summary}>
   <div><span>REQUIRED FOR ASSISTED SALES</span><strong>{readyCount}/{required.length}</strong><small>core activation checks</small></div>
   <div><span>DURABLE CRM</span><strong>{data?.runtime.durable?"READY":"OFF"}</strong><small>{data?.runtime.persistence||"checking"}</small></div>
   <div><span>OUTBOUND MODE</span><strong>{data?.executionEnabled?"LIVE":"SAFE"}</strong><small>{data?.executionEnabled?"provider actions may execute":"dry-run / review only"}</small></div>
   <div><span>NEXT STEP</span><strong className={styles.nextText}>{next?.name||"Run assisted cohort"}</strong><small>{next?.why||"Review the first 20–50 accounts before live send."}</small></div>
  </section>

  <section className={styles.grid}>
   <div className={styles.main}>
    <div className={styles.sectionHead}><div><span>LAUNCH REQUIREMENTS</span><h2>Promptence assisted-sales stack</h2></div><button onClick={()=>void refresh()}>Refresh</button></div>
    <div className={styles.requirements}>
     {(data?.launchRequirements||[]).map((item,index)=><article key={item.id} className={styles.requirement}>
      <div className={styles.step}>{String(index+1).padStart(2,"0")}</div>
      <div className={styles.reqCopy}><div className={styles.reqTitle}><strong>{item.name}</strong><span className={item.configured?styles.goodBadge:styles.badBadge}>{item.configured?"READY":"NOT CONNECTED"}</span>{!item.required&&<span className={styles.optional}>OPTIONAL NOW</span>}</div><p>{item.why}</p><div className={styles.vars}>{item.variables.map(variable=><code key={variable}>{variable}</code>)}</div></div>
     </article>)}
    </div>
   </div>

   <aside className={styles.side}>
    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>CHANNELS</span><h2>Provider capability</h2></div></div>
     <div className={styles.providers}>{(data?.providers||[]).map(provider=><div key={provider.id}><i className={provider.configured?styles.readyDot:styles.blockedDot}/><p><strong>{provider.name}</strong><small>{provider.capability}</small></p><b>{provider.configured?"ON":"OFF"}</b></div>)}</div>
    </section>

    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>ROLLOUT POLICY</span><h2>How we activate safely</h2></div></div>
     <div className={styles.policy}>
      <div><b>01</b><p><strong>Shadow</strong><small>Research and rank accounts. No outbound execution.</small></p></div>
      <div><b>02</b><p><strong>Assisted</strong><small>AI prepares sequences; operator approves every first touch.</small></p></div>
      <div><b>03</b><p><strong>Live</strong><small>Only after real reply/meeting data proves which motions deserve automation.</small></p></div>
     </div>
    </section>

    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>BOUNDARY</span><h2>What stays manual</h2></div></div>
     <p className={styles.boundary}>Pricing exceptions, unverified claims, first-wave cold outreach approval, high-risk voice calls and final revenue confirmation stay behind a human gate.</p>
     <a className={styles.salesLink} href="/sales">Open Revenue Command →</a>
    </section>
   </aside>
  </section>
 </main>;
}
