"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardSnapshot, Lead, MissionRecord, ProductRecord } from "@/lib/types";
import styles from "./sales.module.css";

type StateResponse=DashboardSnapshot&{runtime?:{storage?:string;durable?:boolean;execution?:string;persistence?:string}};
function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);}
function short(value?:string){if(!value)return "—";return new Intl.DateTimeFormat("en",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}
function isReachable(lead:Lead){return Boolean(lead.email||lead.phone||lead.linkedinUrl||lead.instagramUrl);}
function stageLabel(stage:Lead["stage"]){return stage.replaceAll("_"," ").toUpperCase();}

export default function SalesPage(){
 const[state,setState]=useState<StateResponse|null>(null);
 const[busy,setBusy]=useState<string|null>(null);
 const[notice,setNotice]=useState("Promptence is the first internal client. External execution remains governed by existing approval and compliance gates.");

 async function refresh(){const res=await fetch("/api/state",{cache:"no-store"});const data=await res.json() as StateResponse;if(!res.ok)throw new Error((data as unknown as {error?:string}).error||"State load failed");setState(data);}
 useEffect(()=>{void refresh().catch(error=>setNotice(error instanceof Error?error.message:"State load failed"));},[]);

 const promptence=useMemo(()=>state?.products.find(product=>product.name.trim().toLowerCase()==="promptence"),[state]);
 const missions=useMemo(()=>promptence?(state?.missions||[]).filter(mission=>mission.input.productId===promptence.id):[],[state,promptence]);
 const mission=missions.find(item=>item.status==="active")||missions[0];
 const missionIds=new Set(missions.map(item=>item.id));
 const leads=useMemo(()=>state?(state.leads||[]).filter(lead=>lead.missionId&&missionIds.has(lead.missionId)):[],[state,missions.length]);
 const outreach=useMemo(()=>state?(state.outreach||[]).filter(item=>missionIds.has(item.missionId)):[],[state,missions.length]);
 const replies=useMemo(()=>state?(state.replies||[]).filter(item=>item.missionId&&missionIds.has(item.missionId)):[],[state,missions.length]);
 const meetings=useMemo(()=>state?(state.meetings||[]).filter(item=>missionIds.has(item.missionId)):[],[state,missions.length]);
 const actions=useMemo(()=>state?(state.actions||[]).filter(item=>missionIds.has(item.missionId)):[],[state,missions.length]);

 const reachable=leads.filter(isReachable).length;
 const contacted=leads.filter(lead=>["contacted","replied","qualified","meeting","won","lost"].includes(lead.stage)).length;
 const positiveReplies=replies.filter(reply=>reply.decision.intent==="positive").length;
 const qualified=leads.filter(lead=>["qualified","meeting","won"].includes(lead.stage)).length;
 const won=leads.filter(lead=>lead.stage==="won").length;
 const qualifiedPotential=leads.filter(lead=>["replied","qualified","meeting"].includes(lead.stage)).reduce((sum,lead)=>sum+(lead.estimatedValueUsd||0),0);
 const verifiedRevenue=(state?.performance||[]).filter(event=>missionIds.has(event.missionId)).reduce((sum,event)=>sum+Number(event.metrics.revenueUsd||0),0);
 const minScore=promptence?.salesMotion?.minimumLeadScore||68;
 const preparedLeadIds=new Set(outreach.map(item=>item.leadId));
 const ordered=[...leads].sort((a,b)=>{
   const rank={P0:4,P1:3,P2:2,P3:1} as const;
   const priority=(rank[b.priority||"P3"]-rank[a.priority||"P3"]);
   return priority||((b.score||0)-(a.score||0));
 });
 const eligible=leads.filter(lead=>(lead.score||0)>=minScore&&isReachable(lead)&&!lead.optedOut&&lead.stage!=="do_not_contact").length;

 async function bootstrap(){
  setBusy("bootstrap");setNotice("Initializing Promptence Product Brain and the first dedicated revenue mission…");
  try{const res=await fetch("/api/sales/promptence/bootstrap",{method:"POST"});const data=await res.json();if(!res.ok)throw new Error(data.error||"Bootstrap failed");setNotice(data.created?"Promptence revenue mission created. The machine now has a product-specific ICP, offer ladder and qualification rules.":"Existing Promptence revenue mission restored and Product Brain refreshed.");await refresh();}
  catch(error){setNotice(error instanceof Error?error.message:"Bootstrap failed");}finally{setBusy(null);}
 }

 async function advance(){
  if(!mission){setNotice("Bootstrap the Promptence sales mission first.");return;}
  setBusy("advance");setNotice("Sales machine is researching accounts, preparing qualified outreach, polling known replies and updating learning. No outbound action is executed by this button.");
  try{const res=await fetch("/api/sales/promptence/advance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({missionId:mission.id})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Sales advance failed");setNotice("Sales pass complete. Research and sequence preparation were updated; external sends remain behind existing execution gates.");await refresh();}
  catch(error){setNotice(error instanceof Error?error.message:"Sales advance failed");}finally{setBusy(null);}
 }

 async function research(){
  if(!mission){setNotice("Bootstrap the Promptence sales mission first.");return;}
  setBusy("research");setNotice("Researching the next evidence-backed Promptence accounts…");
  try{const res=await fetch("/api/research/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({missionId:mission.id,limit:10})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Research failed");setNotice("Research complete: "+String(data.researched||0)+" reviewed, "+String(data.added||0)+" net-new accounts added.");await refresh();}
  catch(error){setNotice(error instanceof Error?error.message:"Research failed");}finally{setBusy(null);}
 }

 return <main className={styles.shell}>
  <header className={styles.topbar}>
   <div><span className={styles.eyebrow}>MARGARYAN DISTRIBUTION / FIRST CLIENT: PROMPTENCE</span><h1>Revenue Command</h1><p>One operating view from account research to verified revenue. No fake pipeline, no invented proof, no anonymous mass outreach.</p></div>
   <div className={styles.runtime}><span className={state?.runtime?.execution==="live"?styles.live:styles.safe}/><div><b>{(state?.runtime?.execution||"dry-run").toUpperCase()}</b><small>{state?.runtime?.durable?"DURABLE STATE":"MEMORY STATE"}</small></div></div>
  </header>

  <div className={styles.notice}><span/> {notice}</div>

  <section className={styles.hero}>
   <div className={styles.heroCopy}>
    <span>PRIMARY REVENUE MISSION</span>
    <h2>Get Promptence to 10 paid customers.</h2>
    <p>{mission?.input.goal||"Bootstrap the dedicated Promptence sales motion. The agent will prioritize agencies and B2B SaaS accounts with explicit AI-search, SEO, content or category-competition signals."}</p>
    <div className={styles.buttons}>
     <button onClick={bootstrap} disabled={busy==="bootstrap"}>{busy==="bootstrap"?"Initializing…":mission?"Refresh Promptence brain":"Bootstrap Promptence sales"}</button>
     <button className={styles.secondary} onClick={research} disabled={!mission||busy==="research"}>{busy==="research"?"Researching…":"Research 10 accounts"}</button>
     <button className={styles.secondary} onClick={advance} disabled={!mission||busy==="advance"}>{busy==="advance"?"Advancing…":"Advance sales machine"}</button>
    </div>
   </div>
   <div className={styles.target}>
    <span>TARGET</span><strong>10</strong><p>paid customers</p>
    <div><b>{won}</b><small>won now</small></div>
   </div>
  </section>

  <section className={styles.metrics}>
   <article><span>ACCOUNTS</span><strong>{leads.length}</strong><small>{reachable} reachable</small></article>
   <article><span>QUALIFIED FOR OUTREACH</span><strong>{eligible}</strong><small>score ≥ {minScore}</small></article>
   <article><span>SEQUENCES READY</span><strong>{outreach.length}</strong><small>personalized + gated</small></article>
   <article><span>REPLIES</span><strong>{replies.length}</strong><small>{positiveReplies} positive</small></article>
   <article><span>MEETINGS</span><strong>{meetings.filter(item=>item.status==="booked").length}</strong><small>{meetings.length} total records</small></article>
   <article><span>QUALIFIED POTENTIAL</span><strong>{money(qualifiedPotential)}</strong><small>offer value, not revenue</small></article>
   <article><span>VERIFIED REVENUE</span><strong>{money(verifiedRevenue)}</strong><small>recorded factual sales</small></article>
  </section>

  <section className={styles.flow}>
   {[
    ["RESEARCHED",leads.length],
    ["REACHABLE",reachable],
    ["CONTACTED",contacted],
    ["REPLIED",leads.filter(item=>item.stage==="replied").length],
    ["QUALIFIED",qualified],
    ["WON",won]
   ].map(([label,value],index)=><div key={String(label)}><span>{String(label)}</span><strong>{String(value)}</strong>{index<5&&<i>→</i>}</div>)}
  </section>

  <div className={styles.grid}>
   <section className={styles.accounts}>
    <div className={styles.sectionHead}><div><span>NEXT BEST ACCOUNTS</span><h3>Evidence-ranked pipeline</h3></div><b>{ordered.length}</b></div>
    {ordered.length===0?<div className={styles.empty}>No Promptence accounts yet. Bootstrap the mission, then research the first 10 targets.</div>:
    <div className={styles.table}>
     <div className={styles.tableHead}><span>ACCOUNT</span><span>FIT</span><span>EVIDENCE</span><span>NEXT OFFER</span><span>STATE</span></div>
     {ordered.slice(0,24).map(lead=><article key={lead.id} className={styles.row}>
      <div className={styles.account}><div><b>{lead.priority||"P3"}</b><strong>{lead.company}</strong></div><small>{lead.segment||lead.country||"Unsegmented"}</small></div>
      <div className={styles.fit}><strong>{Math.round(lead.score||0)}</strong><small>{(lead.qualificationReasons||[])[0]||lead.fitReason||"Fit evidence pending"}</small></div>
      <div className={styles.evidence}><p>{(lead.buyingSignals||[])[0]||lead.fitReason||"No explicit buying signal stored yet."}</p>{lead.sourceUrls?.[0]&&<a href={lead.sourceUrls[0]} target="_blank" rel="noreferrer">source ↗</a>}</div>
      <div className={styles.offer}><strong>{lead.recommendedOffer||"Free AI visibility signal"}</strong><small>{lead.estimatedValueUsd?money(lead.estimatedValueUsd):"proof-first"}</small></div>
      <div className={styles.state}><span>{stageLabel(lead.stage)}</span><small>{preparedLeadIds.has(lead.id)?"sequence ready":lead.nextAction||"research"}</small><a href={`/leads/${lead.id}`}>open →</a></div>
     </article>)}
    </div>}
   </section>

   <aside className={styles.side}>
    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>SALES DOCTRINE</span><h3>What the machine is allowed to optimize</h3></div></div>
     <div className={styles.doctrine}>
      {(promptence?.salesMotion?.segments||[]).slice(0,4).map(segment=><div key={segment.id}><b>{segment.priority}</b><p><strong>{segment.label}</strong><small>{segment.description}</small></p></div>)}
      {!promptence&&<div className={styles.empty}>Promptence Product Brain is not initialized yet.</div>}
     </div>
    </section>

    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>OFFER LADDER</span><h3>Sell the next commitment</h3></div></div>
     <div className={styles.offers}>{(promptence?.salesMotion?.offers||[]).slice(0,7).map(offer=><div key={offer.code}><span>{offer.name}</span><b>{typeof offer.priceUsd==="number"?money(offer.priceUsd):"custom"}</b></div>)}</div>
    </section>

    <section className={styles.card}>
     <div className={styles.sectionHead}><div><span>MISSION HEALTH</span><h3>What happens next</h3></div></div>
     <dl className={styles.health}>
      <div><dt>Mission</dt><dd>{mission?.plan.missionName||"not started"}</dd></div>
      <div><dt>Created</dt><dd>{short(mission?.createdAt)}</dd></div>
      <div><dt>Queued actions</dt><dd>{actions.filter(item=>item.status==="queued"||item.status==="approved").length}</dd></div>
      <div><dt>Approval needed</dt><dd>{actions.filter(item=>item.mode==="APPROVE"&&item.status==="queued").length}</dd></div>
      <div><dt>Storage</dt><dd>{state?.runtime?.storage||"unknown"}</dd></div>
     </dl>
    </section>
   </aside>
  </div>
 </main>;
}
