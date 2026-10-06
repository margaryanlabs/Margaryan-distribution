"use client";

import {useEffect,useMemo,useState} from "react";
import type {DashboardSnapshot,LearningRanking,PerformanceEvent} from "@/lib/types";
import type {ExecutiveBrief} from "@/lib/agent/executive-brief";
import type {DecisionEngineReport} from "@/lib/agent/decision-engine";
import type {ExecutionPlan,StagedExecutionPlan} from "@/lib/agent/execution-planner";
import type {ResourceAllocationReport,AllocationScenarioId} from "@/lib/agent/resource-allocator";
import type {ExperimentAnalysis} from "@/lib/agent/experiment-ledger";
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
  const[decisions,setDecisions]=useState<DecisionEngineReport|null>(null);
  const[executionPlan,setExecutionPlan]=useState<ExecutionPlan|null>(null);
  const[stagedPlan,setStagedPlan]=useState<StagedExecutionPlan|null>(null);
  const[planBusy,setPlanBusy]=useState<string|null>(null);
  const[allocation,setAllocation]=useState<ResourceAllocationReport|null>(null);
  const[selectedScenario,setSelectedScenario]=useState<AllocationScenarioId|null>(null);
  const[allocationUnits,setAllocationUnits]=useState(100);
  const[allocationBusy,setAllocationBusy]=useState(false);
  const[experiments,setExperiments]=useState<ExperimentAnalysis[]>([]);
  const[experimentBusy,setExperimentBusy]=useState<string|null>(null);
  const[missionId,setMissionId]=useState("");
  const[hours,setHours]=useState(168);
  const[busy,setBusy]=useState(false);
  const[notice,setNotice]=useState("Intelligence uses recorded evidence and operational truth. It does not invent attribution or revenue.");

  async function loadDecisions(id:string){
    if(!id){setDecisions(null);return;}
    const res=await fetch("/api/intelligence/decisions?missionId="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json() as DecisionEngineReport&{error?:string};
    if(!res.ok)throw new Error(data.error||"Decision engine failed");
    setDecisions(data);
  }

  async function loadAllocator(id:string,units=allocationUnits){
    if(!id){setAllocation(null);return;}
    setAllocationBusy(true);
    try{
      const res=await fetch("/api/intelligence/resource-allocation?missionId="+encodeURIComponent(id)+"&units="+units,{cache:"no-store"});
      const data=await res.json() as ResourceAllocationReport&{error?:string};
      if(!res.ok)throw new Error(data.error||"Resource allocator failed");
      setAllocation(data);
      setSelectedScenario(current=>current&&data.scenarios.some(item=>item.id===current)?current:data.recommendedScenarioId);
    }finally{setAllocationBusy(false);}
  }

  async function loadExperiments(id:string){
    if(!id){setExperiments([]);return;}
    const res=await fetch("/api/intelligence/experiments?missionId="+encodeURIComponent(id),{cache:"no-store"});
    const data=await res.json() as {experiments?:ExperimentAnalysis[];error?:string};
    if(!res.ok)throw new Error(data.error||"Experiment ledger failed");
    setExperiments(data.experiments||[]);
  }

  async function updateExperiment(experimentId:string,action:"refresh"|"complete"|"stop"){
    setExperimentBusy(experimentId+":"+action);
    try{
      const res=await fetch("/api/intelligence/experiments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experimentId,action})});
      const data=await res.json() as {ok?:boolean;error?:string};
      if(!res.ok)throw new Error(data.error||"Experiment update failed");
      await loadExperiments(missionId);
      setNotice(action==="refresh"?"Experiment evidence reconciled.":action==="complete"?"Experiment marked complete with the evidence currently available.":"Experiment stopped; historical evidence remains in the ledger.");
    }catch(error){setNotice(error instanceof Error?error.message:"Experiment update failed");}
    finally{setExperimentBusy(null);}
  }

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
      const promptence=nextState.products.find(item=>item.name.trim().toLowerCase()==="promptence");
      const promptenceMission=nextState.missions.find(item=>item.status==="active"&&item.input.productId===promptence?.id);
      const scopedMissionId=missionId||promptenceMission?.id||nextState.missions.find(item=>item.status==="active")?.id||nextState.missions[0]?.id||"";
      if(!missionId&&scopedMissionId)setMissionId(scopedMissionId);
      if(scopedMissionId)await Promise.all([loadDecisions(scopedMissionId),loadAllocator(scopedMissionId,allocationUnits),loadExperiments(scopedMissionId)]);
      setExecutionPlan(null);setStagedPlan(null);
      setNotice("Decision Engine refreshed from CRM state, performance evidence, learning, quality and operational truth.");
    }catch(error){
      setNotice(error instanceof Error?error.message:"Intelligence refresh failed");
    }finally{setBusy(false);}
  }

  async function previewPlan(directiveId:string){
    if(!missionId)return;
    setPlanBusy("preview:"+directiveId);setStagedPlan(null);
    try{
      const res=await fetch("/api/intelligence/execution-plan?missionId="+encodeURIComponent(missionId)+"&directiveId="+encodeURIComponent(directiveId),{cache:"no-store"});
      const data=await res.json() as ExecutionPlan&{error?:string};
      if(!res.ok)throw new Error(data.error||"Execution plan preview failed");
      setExecutionPlan(data);
      setNotice("Execution plan preview created. No CRM or external action was changed.");
    }catch(error){setNotice(error instanceof Error?error.message:"Execution plan preview failed");}
    finally{setPlanBusy(null);}
  }

  async function stagePlan(){
    if(!executionPlan)return;
    setPlanBusy("stage");
    try{
      const res=await fetch("/api/intelligence/execution-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({missionId:executionPlan.missionId,directiveId:executionPlan.directiveId})});
      const data=await res.json() as StagedExecutionPlan&{ok?:boolean;error?:string};
      if(!res.ok)throw new Error(data.error||"Execution plan staging failed");
      setStagedPlan(data);
      setNotice(data.alreadyStaged?"This plan was already staged; no duplicate work was created.":"Plan staged into governed preparation and approval queues. No external action was executed.");
      await Promise.all([loadDecisions(executionPlan.missionId),loadExperiments(executionPlan.missionId)]);
    }catch(error){setNotice(error instanceof Error?error.message:"Execution plan staging failed");}
    finally{setPlanBusy(null);}
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
        <select value={missionId} onChange={event=>{const id=event.target.value;setMissionId(id);setExecutionPlan(null);setStagedPlan(null);void Promise.all([loadDecisions(id),loadAllocator(id,allocationUnits),loadExperiments(id)]).catch(error=>setNotice(error instanceof Error?error.message:"Intelligence refresh failed"));}}>
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

    <section className={styles.allocator}>
      <div className={styles.sectionHead}>
        <div><span>EXPERIMENT & RESOURCE ALLOCATOR</span><h2>How to distribute the next cycle of attention</h2></div>
        <div className={styles.allocatorControls}>
          <span>{allocationBusy?"RECALCULATING":"NON-MONETARY UNITS"}</span>
          <select value={allocationUnits} onChange={event=>{const value=Number(event.target.value);setAllocationUnits(value);void loadAllocator(missionId,value).catch(error=>setNotice(error instanceof Error?error.message:"Resource allocator failed"));}}>
            <option value={50}>50 units</option>
            <option value={100}>100 units</option>
            <option value={200}>200 units</option>
          </select>
        </div>
      </div>

      <div className={styles.allocationEvidence}>
        <span><b>{allocation?.evidenceSummary.openAccounts||0}</b> open accounts</span>
        <span><b>{allocation?.evidenceSummary.warmAccounts||0}</b> warm</span>
        <span><b>{allocation?.evidenceSummary.overdueAccounts||0}</b> overdue</span>
        <span><b>{allocation?.evidenceSummary.approvalBacklog||0}</b> approvals</span>
        <span><b>{allocation?.evidenceSummary.executionExceptions||0}</b> exceptions</span>
        <span><b>{allocation?.evidenceSummary.events||0}</b> evidence events</span>
      </div>

      <div className={styles.scenarioGrid}>
        {(allocation?.scenarios||[]).map(scenario=>{
          const active=(selectedScenario||allocation?.recommendedScenarioId)===scenario.id;
          const buckets=[
            ["Pipeline",scenario.buckets.pipeline],
            ["Research",scenario.buckets.research],
            ["Channels",scenario.buckets.channel_experiments],
            ["Offer / ICP",scenario.buckets.offer_icp_tests],
            ["Quality / Ops",scenario.buckets.quality_ops]
          ] as const;
          return <article key={scenario.id} className={active?styles.scenarioActive:undefined} onClick={()=>setSelectedScenario(scenario.id)}>
            <header><div><span>{scenario.recommended?"RECOMMENDED":"SCENARIO"}</span><h3>{scenario.name}</h3></div><b>{scenario.confidence.toUpperCase()}</b></header>
            <p>{scenario.thesis}</p>
            <div className={styles.allocationBars}>
              {buckets.map(([label,units])=><div key={label}><span>{label}</span><i><em style={{width:(units/scenario.totalUnits*100)+"%"}}/></i><b>{units}</b></div>)}
            </div>
            <div className={styles.scenarioGoal}><span>LEARNING GOAL</span><p>{scenario.learningGoal}</p></div>
          </article>;
        })}
      </div>

      {allocation&&<div className={styles.allocationDetail}>
        {allocation.scenarios.filter(item=>item.id===(selectedScenario||allocation.recommendedScenarioId)).map(scenario=><div key={scenario.id} className={styles.allocationDetailGrid}>
          <section>
            <div className={styles.subHead}><span>CHANNEL MIX</span><b>{scenario.buckets.channel_experiments} units</b></div>
            <div className={styles.mixList}>{scenario.channelMix.map(item=><div key={item.key}><div><strong>{item.label}</strong><small>{item.rationale}</small></div><span>{item.units} · {item.percent}%</span></div>)}{!scenario.channelMix.length&&<div className={styles.empty}>No channel has enough evidence for a weighted split yet.</div>}</div>
          </section>
          <section>
            <div className={styles.subHead}><span>ICP / OFFER LEARNING</span><b>exploration floor preserved</b></div>
            <div className={styles.mixList}>
              {[...scenario.segmentMix,...scenario.offerMix].slice(0,6).map(item=><div key={item.key}><div><strong>{item.label}</strong><small>{item.evidence.join(" · ")||item.rationale}</small></div><span>{item.units}</span></div>)}
              {!scenario.segmentMix.length&&!scenario.offerMix.length&&<div className={styles.empty}>More CRM outcomes are needed before weighting ICP or offer tests.</div>}
            </div>
          </section>
          <section className={styles.directivePortfolio}>
            <div className={styles.subHead}><span>PLANS TO BUILD</span><b>{scenario.suggestedDirectives.length}</b></div>
            {scenario.suggestedDirectives.map((item,index)=><button key={item.id} onClick={()=>void previewPlan(item.id)} disabled={planBusy==="preview:"+item.id}>
              <b>{String(index+1).padStart(2,"0")}</b><div><strong>{item.title}</strong><small>{item.scope.toUpperCase()} · priority {item.priority}</small></div><span>Plan →</span>
            </button>)}
            {!scenario.suggestedDirectives.length&&<div className={styles.empty}>No directive is strong enough to turn into an execution plan yet.</div>}
          </section>
        </div>)}
        <div className={styles.allocationGuardrail}>{allocation.disclaimer}</div>
      </div>}
    </section>

    <section className={styles.experimentLedger}>
      <div className={styles.sectionHead}>
        <div><span>EXPERIMENT LEDGER</span><h2>What we actually tested — and how strong the evidence is</h2></div>
        <b>{experiments.length} recorded</b>
      </div>
      {experiments.length===0?<div className={styles.empty}>No staged plan has created an experiment yet. Eligible execution plans will register a baseline and variant automatically.</div>:
      <div className={styles.experimentGrid}>
        {experiments.slice(0,8).map(item=>{
          const baseline=item.variants.find(variant=>variant.role==="baseline");
          const variant=item.variants.find(variant=>variant.role==="variant");
          return <article key={item.experiment.id}>
            <header>
              <div><span>{item.experiment.dimension.toUpperCase()} · {item.experiment.assignment.replaceAll("_"," ").toUpperCase()}</span><h3>{item.experiment.hypothesis}</h3></div>
              <div className={styles.experimentStatus}><b>{item.confidence.toUpperCase()}</b><small>{item.status.replaceAll("_"," ")}</small></div>
            </header>
            <div className={styles.armGrid}>
              {[baseline,variant].filter(Boolean).map(arm=><div key={arm!.id} className={arm!.role==="variant"?styles.variantArm:undefined}>
                <span>{arm!.role.toUpperCase()}</span>
                <strong>{arm!.label}</strong>
                <div><b>{arm!.exposureCount}</b><small>exposures</small></div>
                <div><b>{arm!.primaryMetricValue}</b><small>{item.experiment.primaryMetric}</small></div>
                <div><b>{arm!.ratePerExposure.toFixed(2)}</b><small>per exposure</small></div>
              </div>)}
            </div>
            <div className={styles.experimentVerdict}>
              <span>{item.causalLanguageAllowed?"CONTROLLED HOLDOUT":"DIRECTIONAL ONLY"}</span>
              <p>{item.conclusion}</p>
              {typeof item.upliftPercent==="number"&&<b>{item.upliftPercent>0?"+":""}{item.upliftPercent}% vs baseline</b>}
            </div>
            <footer>
              <div>{item.guardrails.slice(0,2).map((rule,index)=><span key={index}>{rule}</span>)}</div>
              <div className={styles.experimentActions}>
                <button onClick={()=>void updateExperiment(item.experiment.id,"refresh")} disabled={Boolean(experimentBusy)}>Refresh</button>
                {item.experiment.status==="running"&&<><button onClick={()=>void updateExperiment(item.experiment.id,"complete")} disabled={Boolean(experimentBusy)}>Complete</button><button className={styles.stopExperiment} onClick={()=>void updateExperiment(item.experiment.id,"stop")} disabled={Boolean(experimentBusy)}>Stop</button></>}
              </div>
            </footer>
          </article>;
        })}
      </div>}
    </section>

    <section className={styles.decisionEngine}>
      <div className={styles.sectionHead}><div><span>DECISION ENGINE</span><h2>What to do now — ranked by evidence and urgency</h2></div><b>{decisions?.directives.length||0} directives</b></div>
      <div className={styles.decisionHeadline}>
        <div><span>TOP RECOMMENDATION</span><h3>{decisions?.headline||"No strong intervention is justified yet."}</h3><p>{decisions?.disclaimer||"Guidance stays conservative until enough factual evidence exists."}</p></div>
        <div className={styles.evidenceChip}><span>EVIDENCE</span><strong>{decisions?.evidenceEventCount||0}</strong><small>factual events</small></div>
      </div>

      <div className={styles.directiveGrid}>
        {(decisions?.directives||[]).slice(0,6).map((item,index)=><article key={item.id} className={styles["kind_"+item.kind]}>
          <header><span>{String(index+1).padStart(2,"0")} · {item.scope.toUpperCase()}</span><b>{item.confidence.toUpperCase()}</b></header>
          <h3>{item.title}</h3>
          <p>{item.recommendation}</p>
          <div className={styles.directiveReason}>{item.reason}</div>
          <footer>{item.evidence.slice(0,3).map((evidence,i)=><span key={i}>{evidence}</span>)}</footer>
          <button className={styles.planButton} onClick={()=>void previewPlan(item.id)} disabled={planBusy==="preview:"+item.id}>{planBusy==="preview:"+item.id?"Planning…":"Build execution plan →"}</button>
        </article>)}
        {!decisions?.directives.length&&<div className={styles.empty}>The engine does not have enough evidence for a strong intervention. Keep collecting factual outcomes.</div>}
      </div>

      {executionPlan&&<section className={styles.planPanel}>
        <div className={styles.planHead}>
          <div><span>EXECUTION PLAN PREVIEW</span><h3>{executionPlan.title}</h3><p>{executionPlan.rationale}</p></div>
          <button onClick={()=>void stagePlan()} disabled={planBusy==="stage"}>{planBusy==="stage"?"Staging…":"Stage governed plan"}</button>
        </div>
        <div className={styles.planSteps}>
          {executionPlan.steps.map((step,index)=><article key={step.id}>
            <b>{String(index+1).padStart(2,"0")}</b>
            <div><strong>{step.title}</strong><p>{step.detail}</p><small>{step.externalExecution?"EXTERNAL":"INTERNAL / PREPARATION"} · {step.approvalRequired?"APPROVAL REQUIRED":"NO EXTERNAL EXECUTION"}</small></div>
          </article>)}
        </div>
        <div className={styles.guardrails}>
          {executionPlan.guardrails.map((item,index)=><span key={index}>{item}</span>)}
        </div>
        {stagedPlan&&<div className={styles.stagedReceipt}>
          <strong>{stagedPlan.alreadyStaged?"Already staged":"Staged successfully"}</strong>
          <span>{stagedPlan.preparedOutreach} outreach sequences prepared</span>
          <span>{stagedPlan.preparedCampaignAssets} campaign assets prepared</span>
          <span>{stagedPlan.queuedInternalActions} internal actions queued for approval</span>
        </div>}
      </section>}

      <div className={styles.engineBottom}>
        <div className={styles.accountPriority}>
          <div className={styles.subHead}><span>TODAY'S ACCOUNTS</span><b>TOP 5</b></div>
          {(decisions?.priorityAccounts||[]).map((account,index)=><a href={"/leads/"+account.leadId} key={account.leadId}>
            <b>{String(index+1).padStart(2,"0")}</b>
            <div><strong>{account.company}</strong><small>{account.stage.toUpperCase()} · score {account.score} · {account.reasons.join(" · ")}</small></div>
            <em>{account.decisionScore}</em>
          </a>)}
          {!decisions?.priorityAccounts.length&&<div className={styles.empty}>No active accounts qualify for a priority queue yet.</div>}
        </div>

        <div className={styles.channelPosture}>
          <div className={styles.subHead}><span>CHANNEL POSTURE</span><b>CONTROLLED TESTING</b></div>
          {(decisions?.channelGuidance||[]).map(item=><div key={item.channel}>
            <div><strong>{item.channel.toUpperCase()}</strong><small>{item.evidence}</small></div>
            <span className={styles["posture_"+item.posture]}>{item.posture.replaceAll("_"," ")}</span>
          </div>)}
          {!decisions?.channelGuidance.length&&<div className={styles.empty}>No channel has enough evidence for a posture yet.</div>}
        </div>
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
