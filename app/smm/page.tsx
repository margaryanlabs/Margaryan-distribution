"use client";

import {useEffect,useMemo,useState} from "react";
import type {DashboardSnapshot,MissionRecord,PerformanceEvent} from "@/lib/types";
import styles from "./smm.module.css";

const CHANNELS=["linkedin","x","instagram","email"] as const;
type MarketingChannel=(typeof CHANNELS)[number];

function compact(value:number){
  return new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(value);
}
function money(value:number){
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
}
function when(value?:string){
  if(!value)return"Unscheduled";
  return new Intl.DateTimeFormat("en",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function channelLabel(channel:string){
  return channel==="x"?"X":channel.charAt(0).toUpperCase()+channel.slice(1);
}
function sumMetric(events:PerformanceEvent[],key:"impressions"|"engagements"|"clicks"|"replies"|"meetings"|"revenueUsd"){
  return events.reduce((sum,event)=>sum+Number(event.metrics[key]||0),0);
}

export default function SmmPage(){
  const[state,setState]=useState<DashboardSnapshot|null>(null);
  const[missionId,setMissionId]=useState("");
  const[source,setSource]=useState("");
  const[busy,setBusy]=useState<string|null>(null);
  const[notice,setNotice]=useState("Marketing Command connects content production to demand, replies, meetings and verified revenue.");

  async function refresh(){
    const res=await fetch("/api/state",{cache:"no-store"});
    const data=await res.json() as DashboardSnapshot;
    if(!res.ok)throw new Error((data as unknown as {error?:string}).error||"State load failed");
    setState(data);
    if(!missionId){
      const promptence=data.products.find(item=>item.name.trim().toLowerCase()==="promptence");
      const promptenceMission=data.missions.find(item=>item.status==="active"&&item.input.productId===promptence?.id);
      setMissionId(promptenceMission?.id||data.missions.find(item=>item.status==="active")?.id||data.missions[0]?.id||"");
    }
  }

  useEffect(()=>{void refresh().catch(error=>setNotice(error instanceof Error?error.message:"State load failed"));},[]);

  const mission=useMemo(()=>state?.missions.find(item=>item.id===missionId),[state,missionId]);
  const product=useMemo(()=>mission?.input.productId?state?.products.find(item=>item.id===mission.input.productId):undefined,[state,mission]);
  const drafts=useMemo(()=>state?.content.filter(item=>item.missionId===missionId)||[],[state,missionId]);
  const events=useMemo(()=>state?.performance.filter(item=>item.missionId===missionId)||[],[state,missionId]);
  const learnings=useMemo(()=>state?.learnings.filter(item=>item.missionId===missionId)||[],[state,missionId]);
  const latestLearning=learnings[0];

  const published=drafts.filter(item=>item.status==="published").length;
  const scheduled=drafts.filter(item=>item.status==="scheduled").length;
  const mediaBlocked=drafts.filter(item=>item.requiresMedia&&!item.mediaUrl).length;
  const qualityItems=drafts.filter(item=>typeof item.qualityScore==="number");
  const avgQuality=qualityItems.length?Math.round(qualityItems.reduce((sum,item)=>sum+Number(item.qualityScore||0),0)/qualityItems.length):0;

  const impressions=sumMetric(events,"impressions");
  const engagements=sumMetric(events,"engagements");
  const clicks=sumMetric(events,"clicks");
  const replies=sumMetric(events,"replies");
  const meetings=sumMetric(events,"meetings");
  const revenue=sumMetric(events,"revenueUsd");
  const engagementRate=impressions?Math.round(engagements/impressions*1000)/10:0;
  const clickRate=impressions?Math.round(clicks/impressions*1000)/10:0;

  const channels=CHANNELS.map(channel=>{
    const channelDrafts=drafts.filter(item=>item.channel===channel);
    const channelEvents=events.filter(item=>item.channel===channel);
    const scoreItems=channelDrafts.filter(item=>typeof item.qualityScore==="number");
    return{
      channel,
      drafts:channelDrafts.length,
      published:channelDrafts.filter(item=>item.status==="published").length,
      scheduled:channelDrafts.filter(item=>item.status==="scheduled").length,
      quality:scoreItems.length?Math.round(scoreItems.reduce((sum,item)=>sum+Number(item.qualityScore||0),0)/scoreItems.length):0,
      impressions:sumMetric(channelEvents,"impressions"),
      engagements:sumMetric(channelEvents,"engagements"),
      clicks:sumMetric(channelEvents,"clicks"),
      replies:sumMetric(channelEvents,"replies"),
      revenue:sumMetric(channelEvents,"revenueUsd")
    };
  });

  const queue=[...drafts].sort((a,b)=>{
    const rank={failed:0,draft:1,approved:2,scheduled:3,published:4} as const;
    return rank[a.status]-rank[b.status]||(a.scheduledAt||"9999").localeCompare(b.scheduledAt||"9999");
  });

  async function buildCampaign(){
    if(!missionId)return;
    setBusy("campaign");setNotice("Building a seven-day, channel-native campaign from the active Product Brain…");
    try{
      const res=await fetch("/api/content/campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({missionId,days:7})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Campaign failed");
      setNotice(`Created ${data.drafts.length} assets and ${data.queued.length} governed scheduled actions.`);
      await refresh();
    }catch(error){setNotice(error instanceof Error?error.message:"Campaign failed");}
    finally{setBusy(null);}
  }

  async function repurpose(){
    if(!missionId||!source.trim())return;
    setBusy("repurpose");setNotice("Turning one source into channel-native distribution assets…");
    try{
      const res=await fetch("/api/content/repurpose",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({missionId,sourceText:source})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||"Repurpose failed");
      setNotice(`Repurposed source into ${data.drafts.length} channel-native assets.`);
      setSource("");
      await refresh();
    }catch(error){setNotice(error instanceof Error?error.message:"Repurpose failed");}
    finally{setBusy(null);}
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div>
        <span className={styles.eyebrow}>MARGARYAN DISTRIBUTION / MARKETING COMMAND</span>
        <h1>Demand Engine</h1>
        <p>One operating view for campaign creation, channel quality, distribution performance and the handoff from attention to revenue.</p>
      </div>
      <div className={styles.headerActions}>
        <a href="/sales">Revenue Command</a>
        <button onClick={()=>void refresh()}>Refresh</button>
      </div>
    </header>

    <div className={styles.notice}><span/> {notice}</div>

    <section className={styles.contextBar}>
      <label>
        <span>ACTIVE MISSION</span>
        <select value={missionId} onChange={event=>setMissionId(event.target.value)}>
          <option value="">Select mission</option>
          {(state?.missions||[]).map((item:MissionRecord)=><option key={item.id} value={item.id}>{item.plan.missionName}</option>)}
        </select>
      </label>
      <div><span>PRODUCT</span><strong>{product?.name||"No Product Brain"}</strong><small>{product?.oneLiner||mission?.plan.thesis||"Select a mission to see marketing context."}</small></div>
      <div><span>MARKET</span><strong>{mission?.input.market||"—"}</strong><small>{mission?.input.language?.toUpperCase()||"—"} · {mission?.input.autonomy||"—"} autonomy</small></div>
      <button onClick={buildCampaign} disabled={!missionId||busy==="campaign"}>{busy==="campaign"?"Building…":"Build 7-day campaign"}</button>
    </section>

    <section className={styles.metrics}>
      <article><span>ASSETS</span><strong>{drafts.length}</strong><small>{scheduled} scheduled · {published} published</small></article>
      <article><span>CONTENT QUALITY</span><strong>{avgQuality||"—"}{avgQuality?"%":""}</strong><small>{qualityItems.length} scored assets</small></article>
      <article><span>ATTENTION</span><strong>{compact(impressions)}</strong><small>{engagementRate}% engagement rate</small></article>
      <article><span>CLICKS</span><strong>{compact(clicks)}</strong><small>{clickRate}% click-through</small></article>
      <article><span>REPLIES</span><strong>{compact(replies)}</strong><small>{meetings} meetings attributed</small></article>
      <article><span>VERIFIED REVENUE</span><strong>{money(revenue)}</strong><small>performance events only</small></article>
    </section>

    <section className={styles.demandBridge}>
      <div className={styles.sectionHead}><div><span>DEMAND BRIDGE</span><h2>Content → attention → intent → revenue</h2></div><b>{events.length} evidence events</b></div>
      <div className={styles.bridge}>
        {[
          ["PUBLISHED",published],
          ["IMPRESSIONS",impressions],
          ["ENGAGEMENTS",engagements],
          ["CLICKS",clicks],
          ["REPLIES",replies],
          ["MEETINGS",meetings],
          ["REVENUE",revenue?money(revenue):"$0"]
        ].map(([label,value],index)=><div key={String(label)}><span>{String(label)}</span><strong>{typeof value==="number"?compact(value):String(value)}</strong>{index<6&&<i>→</i>}</div>)}
      </div>
    </section>

    <div className={styles.mainGrid}>
      <section className={styles.channelPanel}>
        <div className={styles.sectionHead}><div><span>CHANNEL INTELLIGENCE</span><h2>Where distribution is actually working</h2></div><b>{channels.filter(item=>item.published>0).length}/{channels.length} active</b></div>
        <div className={styles.channelGrid}>
          {channels.map(item=><article key={item.channel}>
            <div className={styles.channelTop}><div><i/><strong>{channelLabel(item.channel)}</strong></div><span>{item.published} live</span></div>
            <div className={styles.channelNumbers}>
              <div><span>ASSETS</span><b>{item.drafts}</b></div>
              <div><span>QUALITY</span><b>{item.quality||"—"}{item.quality?"%":""}</b></div>
              <div><span>CLICKS</span><b>{compact(item.clicks)}</b></div>
              <div><span>REPLIES</span><b>{compact(item.replies)}</b></div>
            </div>
            <div className={styles.channelFoot}><span>{compact(item.impressions)} impressions</span><strong>{item.revenue?money(item.revenue):"No attributed revenue yet"}</strong></div>
          </article>)}
        </div>
      </section>

      <aside className={styles.side}>
        <section className={styles.card}>
          <div className={styles.sectionHead}><div><span>CAMPAIGN INTELLIGENCE</span><h2>What the system learned</h2></div></div>
          {latestLearning?<div className={styles.learning}>
            <p>{latestLearning.summary}</p>
            <div>{latestLearning.recommendations.slice(0,5).map((item,index)=><article key={index}><b>{String(index+1).padStart(2,"0")}</b><span>{item}</span></article>)}</div>
          </div>:<div className={styles.empty}>No learning report yet. Performance evidence will turn into recommendations here.</div>}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHead}><div><span>PRODUCTION HEALTH</span><h2>What needs attention</h2></div></div>
          <div className={styles.health}>
            <div><span>Draft backlog</span><b>{drafts.filter(item=>item.status==="draft").length}</b></div>
            <div><span>Media blockers</span><b className={mediaBlocked?styles.warn:undefined}>{mediaBlocked}</b></div>
            <div><span>Failed assets</span><b className={drafts.some(item=>item.status==="failed")?styles.bad:undefined}>{drafts.filter(item=>item.status==="failed").length}</b></div>
            <div><span>Learning reports</span><b>{learnings.length}</b></div>
          </div>
        </section>
      </aside>
    </div>

    <section className={styles.composer}>
      <div className={styles.composerIntro}>
        <span>REPURPOSE STUDIO</span>
        <h2>One source. Four native distributions.</h2>
        <p>Paste a launch note, founder thought, transcript, case study or product update. The engine turns it into channel-specific assets using the active Product Brain.</p>
      </div>
      <div className={styles.composerBody}>
        <textarea value={source} onChange={event=>setSource(event.target.value)} placeholder="Paste source material here…"/>
        <div><span>{source.length.toLocaleString()} characters</span><button onClick={repurpose} disabled={!missionId||!source.trim()||busy==="repurpose"}>{busy==="repurpose"?"Repurposing…":"Create channel pack →"}</button></div>
      </div>
    </section>

    <section className={styles.calendarPanel}>
      <div className={styles.sectionHead}><div><span>EDITORIAL QUEUE</span><h2>Production calendar</h2></div><b>{queue.length} assets</b></div>
      {queue.length===0?<div className={styles.empty}>No content for this mission yet. Build a campaign or repurpose a source.</div>:
      <div className={styles.queue}>
        {queue.slice(0,24).map(item=><article key={item.id}>
          <div className={styles.assetMeta}>
            <span className={styles.channelBadge}>{channelLabel(item.channel)}</span>
            <span>{item.format||"post"}</span>
            <span>{item.pillar||"general"}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          {item.callToAction&&<div className={styles.cta}>{item.callToAction}</div>}
          <footer>
            <div><span className={styles[item.status]||styles.status}>{item.status}</span>{typeof item.qualityScore==="number"&&<b>Q {Math.round(item.qualityScore)}</b>}{item.requiresMedia&&!item.mediaUrl&&<em>MEDIA NEEDED</em>}</div>
            <time>{when(item.scheduledAt)}</time>
          </footer>
        </article>)}
      </div>}
    </section>
  </main>;
}
