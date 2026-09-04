"use client";

import {useEffect,useState} from "react";
import type {DistributionActionRecord} from "@/lib/types";

type Limit={allowed:boolean;count:number;limit?:number;reason?:string};
type Ops={limits:Record<string,Limit>;retries:DistributionActionRecord[];blocked:DistributionActionRecord[];deadLetters:DistributionActionRecord[];failed:DistributionActionRecord[]};

export default function OperationsPage(){
 const[data,setData]=useState<Ops|null>(null);async function refresh(){const res=await fetch("/api/operations",{cache:"no-store"});setData(await res.json() as Ops);}useEffect(()=>{void refresh();},[]);
 const card={border:"1px solid #242831",background:"#0f1115",borderRadius:12,padding:18} as const;
 const rows=[...[...(data?.deadLetters||[])].map(x=>({kind:"DEAD LETTER",tone:"bad",action:x})),...[...(data?.blocked||[])].map(x=>({kind:"BLOCKED",tone:"bad",action:x})),...[...(data?.retries||[])].map(x=>({kind:"RETRY",tone:"wait",action:x})),...[...(data?.failed||[])].map(x=>({kind:"FAILED",tone:"bad",action:x}))];
 return <main style={{maxWidth:1180,margin:"0 auto",padding:"36px 24px 70px"}}><header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"end",marginBottom:22}}><div><span className="eyebrow">MARGARYAN DISTRIBUTION / OPERATIONS</span><h1 style={{fontSize:42,margin:"8px 0 0"}}>Runtime Safety</h1><p style={{color:"#8f96a3",maxWidth:760,lineHeight:1.55}}>Daily caps, retry queue, provider failures and dead letters. Current counters are process-memory only until persistent storage is connected.</p></div><div style={{display:"flex",gap:8}}><a href="/autopilot" className="ghost" style={{textDecoration:"none"}}>Autopilot</a><a href="/" className="ghost" style={{textDecoration:"none"}}>Command</a></div></header>
 <section style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>{Object.entries(data?.limits||{}).map(([name,limit])=><article key={name} style={card}><span className="eyebrow">{name.toUpperCase()} / DAY</span><strong style={{display:"block",fontSize:28,marginTop:9}}>{limit.count} / {limit.limit??"∞"}</strong><small style={{color:limit.allowed?"#8f96a3":"#d89a9a"}}>{limit.allowed?"capacity available":limit.reason}</small></article>)}</section>
 <section style={card}><div className="panelHead"><div><span>EXCEPTIONS</span><h3>Actions requiring operator attention</h3></div><button className="ghost" onClick={()=>void refresh()}>Refresh</button></div><div style={{display:"grid",gap:10,marginTop:14}}>{rows.length===0&&<div className="empty">No blocked, retrying, failed or dead-letter actions in this process.</div>}{rows.map(({kind,tone,action})=><article key={`${kind}-${action.recordId}`} style={{border:"1px solid #20242c",borderRadius:10,padding:14,display:"grid",gridTemplateColumns:"1fr auto",gap:14}}><div><strong>{action.objective}</strong><p style={{color:"#8f96a3",margin:"6px 0"}}>{action.channel} / {action.kind} · retries {action.retryCount}</p><small>{action.error||"No error detail"}</small></div><span className={`pill ${tone}`}>{kind}</span></article>)}</div></section></main>;
}
