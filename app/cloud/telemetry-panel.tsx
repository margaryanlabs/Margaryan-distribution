"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import type {TelemetryOverview} from "@/lib/cloud/telemetry";
import styles from "./telemetry-panel.module.css";

const empty:TelemetryOverview={
 mode:"setup",updatedAt:"",
 notice:"Self-hosted monitoring is not connected.",
 metrics:[
  {name:"scrapeTargets",label:"Monitored targets",value:null},
  {name:"healthyTargets",label:"Reachable targets",value:null},
  {name:"activeSeries",label:"Active metric series",value:null}
 ]
};
function display(n:number|null){return n===null?"—":new Intl.NumberFormat("en",{maximumFractionDigits:0}).format(n);}
export default function TelemetryPanel({compact=false}:{compact?:boolean}){
 const [snapshot,setSnapshot]=useState<TelemetryOverview>(empty);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/cloud/telemetry",{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)throw Error("Operator telemetry API cannot be accessed.");
   const result=await response.json() as TelemetryOverview;
   if(!Array.isArray(result.metrics)||result.metrics.length!==3||
    !["connected","degraded","setup"].includes(result.mode))throw Error("Unexpected telemetry response.");
   setSnapshot(result);
  }catch(err){
   setSnapshot(empty);
   setError(err instanceof Error?err.message:"Telemetry unavailable.");
  }finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const targets=useMemo(()=>snapshot.metrics.find(m=>m.name==="scrapeTargets")?.value??null,[snapshot]);
 const up=useMemo(()=>snapshot.metrics.find(m=>m.name==="healthyTargets")?.value??null,[snapshot]);
 const percent=targets!==null&&up!==null&&targets>0?Math.max(0,Math.min(100,up/targets*100)):null;
 const title=snapshot.mode==="connected"?"Prometheus connected":snapshot.mode==="degraded"?"Prometheus needs attention":"Prometheus not configured";
 if(compact)return <section className={styles.compact} aria-label="Self-hosted monitoring">
  <div className={styles.compactTitle}><span>OUR MONITORING</span><i className={snapshot.mode==="connected"?styles.dotOn:snapshot.mode==="degraded"?styles.dotWarn:styles.dotOff}/></div>
  <strong>{loading?"Checking…":title}</strong>
  <div className={styles.compactMetrics}>
   {snapshot.metrics.slice(0,2).map(m=><div key={m.name}><b>{display(m.value)}</b><small>{m.label}</small></div>)}
  </div>
  <p>Prometheus scrape targets only · {snapshot.mode==="connected"?"real data":"not a live health claim"}</p>
 </section>;
 return <div className={styles.root}>
  <header className={styles.hero}><div><span className={styles.kicker}>MARKARIAN OBSERVE · OWNER-MANAGED</span><h1>Know your <em>infrastructure.</em></h1>
   <p>Read-only monitoring from our own Prometheus. We distinguish real observations from missing information; no artificial uptime, costs or CPU numbers.</p></div>
   <button type="button" onClick={()=>void refresh()} disabled={loading}>{loading?"Checking…":"↻ Refresh metrics"}</button>
  </header>
  <div className={styles.mode}><i className={snapshot.mode==="connected"?styles.dotOn:snapshot.mode==="degraded"?styles.dotWarn:styles.dotOff}/><strong>{title}</strong>
   <span>{snapshot.notice}</span></div>
  {error&&<p role="alert" className={styles.alert}>{error}</p>}
  <section className={styles.stats} aria-label="Prometheus observed metrics">
   {snapshot.metrics.map(m=><article key={m.name}><small>{m.label.toUpperCase()}</small><strong>{display(m.value)}</strong>
    <p>{m.name==="scrapeTargets"?"Targets configured in Prometheus scrape jobs":m.name==="healthyTargets"?"Targets returning a successful scrape":"Active time series stored by Prometheus"}</p>
   </article>)}
  </section>
  <section className={styles.fleet}><div className={styles.fleetHeader}><div><span className={styles.kicker}>OBSERVABILITY · SCRAPE HEALTH</span><h2>Target reachability</h2></div><span>{percent===null?"No reliable percentage":percent.toFixed(0)+"% of scrape targets reachable"}</span></div>
   <div className={styles.track} role="img" aria-label={percent===null?"Target reachability has no data":"Target reachability "+percent.toFixed(0)+" percent"}><div style={{width:percent===null?"0%":percent+"%"}}/></div>
   <p>{percent===null?"A chart requires actual Prometheus samples. Connect and configure scrape targets first.":"This percentage describes Prometheus scrape targets, not global application uptime or customer availability."}</p>
  </section>
  <section className={styles.readiness}><span className={styles.kicker}>NEXT MONITORING GATES</span><h2>Make this production-grade</h2>
   <div><article><b>01</b><strong>Expose metrics privately</strong><small>Prometheus host behind TLS, VPN or protected network.</small></article>
    <article><b>02</b><strong>Add node and app exporters</strong><small>Our operations pilot currently scrapes only Prometheus itself.</small></article>
    <article><b>03</b><strong>Enable incident alerts</strong><small>Resource thresholds, failed scrapes, notifications and retention.</small></article>
    <article><b>04</b><strong>Test offsite restore</strong><small>Verify backing up Prometheus volume and recovery procedures.</small></article></div>
  </section>
  <p className={styles.foot}>Configuration: CLOUD_PROMETHEUS_URL and optional CLOUD_PROMETHEUS_TOKEN, both on the server. Read docs/cloud/SELF_HOSTED_TELEMETRY.md for secure deployment.</p>
 </div>;
}
