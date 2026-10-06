"use client";

import {useEffect,useMemo,useState} from "react";
import type {DashboardSnapshot,LearningRanking,PerformanceEvent} from "@/lib/types";
import type {ExecutiveBrief} from "@/lib/agent/executive-brief";
import styles from "./intelligence.module.css";

type QualityResponse={
  stats:{assessed:number;passed:number;blocked:number;average:number};
  items:Array<{id:string;type:string;channel:string;title:string;score:number;issues:string[];status:string;missionId?:string}>;
};

type Limit={allowed:boolean;count:number;limit?:number;reason?:string};
type OperationsResponse={
  limits:Record<string,Limit>;
  retries:Array<{recordId:string;objective:string;channel:string;kind:string;error?:string}>;
  blocked:Array<{recordId:string;objective:string;channel:string;kind:string;error?:string}>;
  deadLetters:Array<{recordId:string;objective:string;channel:string;kind:string;error?:string}>;
  failed:Array<{recordId:string;objective:string;channel:string;kind:string;error?:string}>;
};

function compact(value:number){
  return new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(value);
}
function money(value:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}
function when(value?:string){
  if(!value)return"—";
  return new Intl.DateTimeFormat("en",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function sum(events:PerformanceEvent[],key:"impressions"|"engagements"|"clicks"|"replies"|"positiveReplies"|"meetings"|"conversions"|"revenueUsd"){
  return events.reduce((total,event)=>total+Number(event.metrics[key]||0),0);
}
function top(items:LearningRanking[]|undefined){
  return (items||[]).slice(0,5);
}

export default function IntelligencePage(){
  const[state,setState]=useState<DashboardSnapshot|null>(null);
  const[quality,setQuality]=useState<QualityResponse|null>(null);
  const[ops,setOps]=useState<OperationsResponse|null>(null);
  const[brief,setBrief]=useState<ExecutiveBrief|null>(null);
  const[missionId,setMissionId]=useState("");
  const[hours,setHours]=useState(168);
  const[busy,setBusy]=useState(false);
  const[notice,setNotice]=useState("Intelligence uses recorded evidence and operational truth. It does not invent attribution or revenue.");

  async function refresh(nextHours=hours){
    setBusy(true);
    try{
      const[stateRes,qualityRes,opsRes,briefRes]=await Promise.all([
        fetch("/api/state",{cache:"no-store"}),
        fetch("/api/quality",{cache:"no-store"}),
        fetch("/api/operations",{cache:"no-store"}),
        fetch("/api/brief?hours="+nextHours,{cache:"no-store"})
      ]);
      const[nextState,nextQuality,nextOps,nextBrief]=await Promise.all([
        stateRes.json() as Promise<DashboardSnapshot>,
        qualityRes.json() as Promise<QualityResponse>,
        opsRes.json() as Promise<OperationsResponse>,
        briefRes.json() as Promise<ExecutiveBrief>
      ]);
      if(!stateRes.ok)throw new Error("State load failed");
      setState(nextState);setQuality(nextQuality);setOps(nextOps);setBrief(nextBrief);
      if(!missionId){
        const promptence=nextState.products.find(item=>item.name.trim().toLowerCase()==="promptence");
        const promptenceMission=nextState.missions.find(item=>item.status==="active"&&item.input.productId===promptence?.id);
        setMissionId(promptenceMission?.id||nextState.missions.find(item=>item.status==="active")?.id||nextState.missions[0]?.id||"");
      }
      setNotice("Intelligence refreshed from CRM state, evidence events, quality gates and operational exceptions.");
    }catch(error){
      setNotice(error instanceof Error?error.message:"Intelligence refresh failed");
    }finally{setBusy(false);}
  }

  useEffect(()=>{void refresh(168);},[]);

  const mission=useMemo(()=>state?.missions.find(item=>item.id===missionId),[state,missionId]);
  const product=useMemo(()=>mission?.input.productId?state?.products.find(item=>item.id===mission.input.productId):undefined,[state,mission]);
  const leads=useMemo(()=>state?.leads.filter(item=>item.missionId===missionId)||[],[state,missionId]);
  const events=useMemo(()=>state?.performance.filter(item=>item.missionId===missionId)||[],[state,missionId]);
  const learning=useMemo(()=>state?.learnings.find(item=>item.missionId===missionId),[state,missionId]);
  const missionQuality=useMemo(()=>quality?.items.filter(item=>!item.missionId||item.missionId===missionId)||[],[quality,missionId]);

  const revenue=sum(events,"revenueUsd");
  const meetings=sum(events,"meetings");
  const positiveReplies=sum(events,"positiveReplies");
  const clicks=sum(events,"clicks");
  const impressions=sum(events,"impressions");
  const conversions=sum(events,"conversions");
  const pipelineValue=leads.filter(item=>!["won","lost","do_not_contact"].includes(item.stage)).reduce((total,item)=>total+Number(item.estimatedValueUsd||0),0);
  const wonLeads=leads.filter(item=>item.stage==="won").length;
  const warmLeads=leads.filter(item=>["replied","qualified","meeting"].includes(item.stage)).length;
  const p0=leads.filter(item=>item.priority==="P0").length;
  const qualityAverage=missionQuality.length?Math.round(missionQuality.reduce((total,item)=>total+item.score,0)/missionQuality.length):quality?.stats.average||0;
  const exceptionCount=(ops?.blocked.length||0)+(ops?.deadLetters.length||0)+(ops?.failed.length||0)+(ops?.retries.length||0);
  const attention=(brief?.attention||[]).slice(0,6);
  const nextMoves=(brief?.nextMoves||[]).slice(0,6);
  const recommendations=(learning?.recommendations||[]).slice(0,6);

  const funnel=[
    ["ACCOUNTS",leads.length],
    ["P0",p0],
    ["WARM",warmLeads],
    ["POSITIVE",positiveReplies],
    ["MEETINGS",meetings],
    ["WON",wonLeads],
    ["REVENUE",revenue?money(revenue):"$0"]
  ] as const;

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>MARGARYAN DISTRIBUTION / INTELLIGENCE</span>
        <h1>Decision Intelligence</h1>
        <p>What changed, what is working, what is risky, and what the operator should do next — grounded only in recorded distribution evidence.</p>
      </div>
      <div className={styles.headerActions}>
        <select value={hours} onChange={event=>{const value=Number(event.target.value);setHours(value);void refresh(value);}}>
          <option value={24}>24 hours</option>
          <option value={48}>48 hours</option>
          <option value={168}>7 days</option>
        </select>
        <button onClick={()=>void refresh()} disabled={busy}>{busy?"Refreshing…":"Refresh intelligence"}</button>
      </div>
    </header>

    <div className={styles.notice}><span/> {notice}</div>

    <section className={styles.context}>
      <label>
        <span>MISSION SCOPE</span>
        <select value={missionId} onChange={event=>setMissionId(event.target.value)}>
          <option value="">Select mission</option>
          {(state?.missions||[]).map(item=><option key={item.id} value={item.id}>{item.plan.missionName}</option>)}
        </select>
      </label>
      <div><span>PRODUCT</span><strong>{product?.name||"Portfolio"}</strong><small>{product?.oneLiner||mission?.plan.thesis||"No active mission selected."}</small></div>
      <div><span>MARKET</span><strong>{mission?.input.market||"—"}</strong><small>{mission?.status||"—"} · {mission?.input.language?.toUpperCase()||"—"}</small></div>
      <div><span>EVIDENCE BASE</span><strong>{events.length} events</strong><small>{learning?"learning updated "+when(learning.generatedAt):"no learning pass yet"}</small></div>
    </section>

    <section className={styles.briefHero}>
      <div className={styles.briefCopy}>
        <span>EXECUTIVE READOUT / {hours===168?"7 DAYS":hours+" HOURS"}</span>
        <h2>{brief?.headline||"Building factual executive readout…"}</h2>
        <div className={styles.briefMeta}>
          <span>{brief?.metrics.positiveReplies||0} positive replies</span>
          <span>{brief?.metrics.meetingsBooked||0} booked meetings</span>
          <span>{brief?.metrics.approvalsNeeded||0} approvals waiting</span>
          <span>{brief?.metrics.failures||0} failures</span>
        </div>
      </div>
      <div className={styles.truth}>
        <span>TRUTH STATUS</span>
        <strong>{exceptionCount===0?"CLEAN":"ATTENTION"}</strong>
        <small>{exceptionCount===0?"No runtime exceptions in current read.":exceptionCount+" operational exceptions require review."}</small>
      </div>
    </section>

    <section className={styles.metrics}>
      <article><span>PIPELINE VALUE</span><strong>{money(pipelineValue)}</strong><small>estimated open offer value</small></article>
      <article><span>VERIFIED REVENUE</span><strong>{money(revenue)}</strong><small>performance evidence only</small></article>
      <article><span>MEETINGS</span><strong>{compact(meetings)}</strong><small>{wonLeads} won accounts</small></article>
      <article><span>QUALITY</span><strong>{qualityAverage||"—"}{qualityAverage?"%":""}</strong><small>{missionQuality.length} assessed items</small></article>
      <article><span>REACH</span><strong>{compact(impressions)}</strong><small>{compact(clicks)} recorded clicks</small></article>
      <article><span>CONVERSIONS</span><strong>{compact(conversions)}</strong><small>{events.length} factual events</small></article>
    </section>

    <section className={styles.funnelCard}>
      <div className={styles.sectionHead}><div><span>COMMERCIAL FUNNEL</span><h2>Account movement to verified revenue</h2></div><b>{leads.length} scoped accounts</b></div>
      <div className={styles.funnel}>
        {funnel.map(([label,value],index)=><div key={label}><span>{label}</span><strong>{typeof value==="number"?compact(value):value}</strong>{index<funnel.length-1&&<i>→</i>}</div>)}
      </div>
    </section>

    <div className={styles.decisionGrid}>
      <section className={styles.main}>
        <div className={styles.sectionHead}><div><span>WHAT WE LEARNED</span><h2>Evidence-ranked channel and message signal</h2></div><a href="/analytics">Open raw evidence →</a></div>
        <div className={styles.rankGrid}>
          <div className={styles.rankCard}>
            <h3>Channels</h3>
            {top(learning?.channelRankings).length===0?<div className={styles.empty}>No ranked channel evidence yet.</div>:top(learning?.channelRankings).map((item,index)=><div className={styles.rankRow} key={item.key}>
              <b>#{index+1}</b><div><strong>{item.key.toUpperCase()}</strong><small>{item.replies} replies · {item.meetings} meetings · {money(item.revenueUsd)}</small></div><em>{item.score}</em>
            </div>)}
          </div>
          <div className={styles.rankCard}>
            <h3>Content pillars</h3>
            {top(learning?.pillarRankings).length===0?<div className={styles.empty}>No content-linked pillar evidence yet.</div>:top(learning?.pillarRankings).map((item,index)=><div className={styles.rankRow} key={item.key}>
              <b>#{index+1}</b><div><strong>{item.key}</strong><small>{item.clicks} clicks · {item.positiveReplies} positive replies</small></div><em>{item.score}</em>
            </div>)}
          </div>
        </div>

        <div className={styles.sectionHeadSecondary}><span>NEXT EXPERIMENTS</span><b>{recommendations.length}</b></div>
        <div className={styles.experiments}>
          {recommendations.length===0?<div className={styles.empty}>Run a learning pass after factual performance arrives.</div>:recommendations.map((item,index)=><article key={index}><b>{String(index+1).padStart(2,"0")}</b><p>{item}</p></article>)}
        </div>
      </section>

      <aside className={styles.side}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><span>NEEDS YOU</span><h2>Operator attention</h2></div><a href="/operations">Operations →</a></div>
          <div className={styles.attention}>
            {attention.length===0?<div className={styles.empty}>No urgent human attention in the selected executive window.</div>:attention.map((item,index)=><div key={index}><b>!</b><p>{item}</p></div>)}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><span>NEXT BEST ACTIONS</span><h2>Highest-value moves</h2></div><a href="/sales">Revenue →</a></div>
          <div className={styles.moves}>
            {nextMoves.map((item,index)=><div key={index}><b>{String(index+1).padStart(2,"0")}</b><p>{item}</p></div>)}
          </div>
        </section>
      </aside>
    </div>

    <div className={styles.riskGrid}>
      <section className={styles.card}>
        <div className={styles.sectionHead}><div><span>QUALITY CONTROL</span><h2>Can this copy safely ship?</h2></div><a href="/quality">Inspect QA →</a></div>
        <div className={styles.qualityStrip}>
          <div><span>ASSESSED</span><strong>{quality?.stats.assessed||0}</strong></div>
          <div><span>PASSED</span><strong>{quality?.stats.passed||0}</strong></div>
          <div><span>BLOCKED</span><strong>{quality?.stats.blocked||0}</strong></div>
          <div><span>AVG SCORE</span><strong>{quality?.stats.average||0}</strong></div>
        </div>
        <div className={styles.issueList}>
          {(quality?.items||[]).filter(item=>item.score<70||item.issues.length).slice(0,5).map(item=><div key={item.id}><b>{item.score}</b><p><strong>{item.title}</strong><small>{item.channel} · {item.issues[0]||item.status}</small></p></div>)}
          {!quality?.items.some(item=>item.score<70||item.issues.length)&&<div className={styles.empty}>No current low-quality items need escalation.</div>}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}><div><span>RUNTIME RISK</span><h2>Execution health</h2></div><a href="/connections">Connections →</a></div>
        <div className={styles.limitGrid}>
          {Object.entries(ops?.limits||{}).map(([name,limit])=><div key={name}><span>{name.toUpperCase()}</span><strong>{limit.count} / {limit.limit??"∞"}</strong><small>{limit.allowed?"capacity available":limit.reason||"limit reached"}</small></div>)}
        </div>
        <div className={styles.exceptionRow}>
          <span>Retries <b>{ops?.retries.length||0}</b></span>
          <span>Blocked <b>{ops?.blocked.length||0}</b></span>
          <span>Failed <b>{ops?.failed.length||0}</b></span>
          <span>Dead letters <b>{ops?.deadLetters.length||0}</b></span>
        </div>
      </section>
    </div>
  </main>;
}
