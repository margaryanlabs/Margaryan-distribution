"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {buildPortfolio,appHealth,githubRepository,type CloudSnapshot,type LocalProject} from "@/lib/cloud/command-center";
import {healthSignals,domainRecords,type Signal} from "@/lib/cloud/health-signals";
import type {ProviderView} from "@/lib/cloud/providers";
import type {ClickHouseStatus} from "@/lib/cloud/clickhouse";
import type {TelemetryOverview} from "@/lib/cloud/telemetry";
import type {SentinelStatus} from "@/lib/cloud/sentinel-status";
import type {SupervisorStatus} from "@/lib/cloud/agent-supervisor-status";
import styles from "./mission-control.module.css";

type Props={data:CloudSnapshot;loading:boolean;startView?:View;onRefresh:()=>void;onOpenSetup:()=>void;onOpenOwned:()=>void;
 onOpenDeploy:()=>void;onOpenRecovery:()=>void;onOpenStudio:()=>void;onOpenTelemetry:()=>void;onOpenDomains:()=>void};
type View="fleet"|"projects"|"data"|"agents";
type ProjectFilter="all"|"hosted"|"issues"|"planned";
type Auxiliary={providers:ProviderView[]|null;clickhouse:ClickHouseStatus|null;telemetry:TelemetryOverview|null;sentinel:SentinelStatus|null;supervisor:SupervisorStatus|null;error:string};
const sourceModes:{id:View;name:string;hint:string}[]=[
 {id:"fleet",name:"Infrastructure",hint:"Servers and releases"},
 {id:"projects",name:"Projects",hint:"All applications"},
 {id:"data",name:"Data & domains",hint:"Databases and DNS"},
 {id:"agents",name:"Agent Watch",hint:"Detection and automation"}
];
const fallback:Auxiliary={providers:null,clickhouse:null,telemetry:null,sentinel:null,supervisor:null,error:""};
const indicators=[
 {id:"supervisor",name:"Agent Supervisor",scope:"Portfolio + infrastructure findings · source freshness · safe triage"},
 {id:"decision",name:"Decision Command Observer",scope:"VETO worker liveness, market-readyz, governed PAPER cycle evidence"},
 {id:"portfolio",name:"Portfolio Guardian",scope:"All GitHub projects · Decision Command · CI and pull requests"},
 {id:"infrastructure",name:"Infrastructure Sentinel",scope:"Hosts · availability · incident detection"},
 {id:"deploy",name:"Release Guardian",scope:"Deployments · failures · rollback evidence"},
 {id:"data",name:"Database Observer",scope:"PostgreSQL · ClickHouse · storage health"},
 {id:"security",name:"Security Auditor",scope:"Secrets · domain TLS · policy drift"},
 {id:"cost",name:"Capacity Analyst",scope:"Resource pressure · quotas · spending"}
];
function displayStatus(status:string,connected:boolean){
 if(!connected)return "Not migrated";
 const value=appHealth(status);
 return value==="running"?"Running":value==="attention"?"Needs attention":"Unverified";
}
function tone(status:string,connected=true){
 if(!connected)return styles.off;
 const level=appHealth(status);
 return level==="running"?styles.ok:level==="attention"?styles.bad:styles.off;
}
function when(raw:string){
 const date=new Date(raw);
 return raw&&!Number.isNaN(date.getTime())?date.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Not checked";
}
function safeText(value:string){return value.length>105?value.slice(0,105)+"…":value;}
function labelState(state:ProviderView["state"]){return state==="connected"?"Connected":state==="error"?"Connection error":"Not configured";}
export default function MissionControl({data,loading,startView="fleet",onRefresh,onOpenSetup,onOpenOwned,onOpenDeploy,onOpenRecovery,onOpenStudio,onOpenTelemetry,onOpenDomains}:Props){
 const [view,setView]=useState<View>(startView);
 const [projectFilter,setProjectFilter]=useState<ProjectFilter>("all");
 const [search,setSearch]=useState("");
 const [selected,setSelected]=useState("");
 const [local,setLocal]=useState<LocalProject[]>([]);
 const [adding,setAdding]=useState(false);
 const [name,setName]=useState("");const [repository,setRepository]=useState("");const [formError,setFormError]=useState("");
 const [ready,setReady]=useState(false);
 const [watch,setWatch]=useState(false);
 const [severeOnly,setSevereOnly]=useState(false);
 const [sentinelCopy,setSentinelCopy]=useState("");
 const [aux,setAux]=useState<Auxiliary>(fallback);
 const [auxLoading,setAuxLoading]=useState(true);
 const readAux=useCallback(async()=>{
  const results=await Promise.allSettled([
   fetch("/api/cloud/providers",{cache:"no-store",credentials:"same-origin"}).then(async r=>{if(!r.ok)throw Error("Provider inventory unavailable");return r.json() as Promise<{providers:ProviderView[]}>;}),
   fetch("/api/cloud/clickhouse",{cache:"no-store",credentials:"same-origin"}).then(async r=>{if(!r.ok)throw Error("ClickHouse status unavailable");return r.json() as Promise<ClickHouseStatus>;}),
   fetch("/api/cloud/telemetry",{cache:"no-store",credentials:"same-origin"}).then(async r=>{if(!r.ok)throw Error("Prometheus unavailable");return r.json() as Promise<TelemetryOverview>;}),
   fetch("/api/cloud/sentinel",{cache:"no-store",credentials:"same-origin"}).then(async r=>{if(!r.ok)throw Error("Sentinel status unavailable");return r.json() as Promise<SentinelStatus>;}),
   fetch("/api/cloud/agent-supervisor",{cache:"no-store",credentials:"same-origin"}).then(async r=>{if(!r.ok)throw Error("Supervisor status unavailable");return r.json() as Promise<SupervisorStatus>;})
  ]);
  setAux({
   providers:results[0].status==="fulfilled"&&Array.isArray(results[0].value.providers)?results[0].value.providers:null,
   clickhouse:results[1].status==="fulfilled"&&["setup","connected","error"].includes(results[1].value.state)?results[1].value:null,
   telemetry:results[2].status==="fulfilled"&&["setup","connected","degraded"].includes(results[2].value.mode)?results[2].value:null,
   sentinel:results[3].status==="fulfilled"&&["not_configured","connected","stale","error"].includes(results[3].value.state)?results[3].value:null,
   supervisor:results[4].status==="fulfilled"&&["not_configured","recent","stale","error"].includes(results[4].value.state)?results[4].value:null,
   error:results.some(x=>x.status==="rejected")?"Some external status sources are unavailable.":""});
  setAuxLoading(false);
 },[]);
 useEffect(()=>{void readAux();},[readAux]);
 useEffect(()=>{
  if(!watch)return;
  const interval=setInterval(()=>{onRefresh();void readAux();},60000);
  return()=>clearInterval(interval);
 },[watch,onRefresh,readAux]);
 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem("markarian-cloud-projects-v1")||"[]") as unknown;
   if(Array.isArray(saved))setLocal(saved.filter((p):p is LocalProject=>Boolean(p&&typeof p==="object"&&
    typeof p.id==="string"&&typeof p.name==="string"&&typeof p.repository==="string"&&githubRepository(p.repository))).slice(0,50));
  }catch{setFormError("This browser could not read its local project list.");}
  setReady(true);
 },[]);
 const projects=useMemo(()=>buildPortfolio(data,local),[data,local]);
 const health=useMemo(()=>healthSignals(data),[data]);
 const domains=useMemo(()=>domainRecords(data),[data]);
 const alerts=useMemo(()=>health.signals.filter(x=>!severeOnly||x.severity==="critical"),[health,severeOnly]);
 const filtered=useMemo(()=>projects.filter(p=>(projectFilter==="all"||
  (projectFilter==="hosted"&&p.linked)||(projectFilter==="planned"&&!p.linked)||(projectFilter==="issues"&&p.linked&&p.health==="attention"))&&
  (p.name+" "+(p.repository||"")+" "+p.type).toLowerCase().includes(search.toLowerCase().trim())
 ),[projects,projectFilter,search]);
 const active=projects.find(p=>p.key===selected);
 const serversReady=data.sources?.servers===true;
 const appsReady=data.sources?.applications===true;
 const deploysReady=data.sources?.deployments===true;
 const connected=Object.values(data.sources||{}).some(Boolean);
 const problems=health.signals.filter(x=>x.severity!=="info").length;
 function addProject(){
  const repo=githubRepository(repository),trimmed=name.trim();
  if(!ready||!repo||trimmed.length<2||trimmed.length>80){setFormError("Use a project name and valid GitHub owner/repository.");return;}
  if(projects.some(p=>p.repository&&githubRepository(p.repository)===repo)){setFormError("This repository is already listed.");return;}
  if(local.length>=50){setFormError("Local registry limit of 50 additional projects reached.");return;}
  const next=[...local,{id:crypto.randomUUID(),name:trimmed,repository:repo}];
  try{localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));setLocal(next);setName("");setRepository("");setAdding(false);setFormError("");}
  catch{setFormError("Local storage is unavailable; project was not saved.");}
 }
 function removeProject(){
  if(!active||active.category!=="local")return;
  const next=local.filter(p=>active.key!=="local:"+p.id);
  try{localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));setLocal(next);setSelected("");}
  catch{setFormError("Could not update local project list.");}
 }
 return <div className={styles.root}>
  <div className={styles.headline}><span><span className={styles.mark}/> MARKARIAN / INFRASTRUCTURE INTELLIGENCE</span>
   <span>OWNER WORKSPACE <b>—</b> V3.0</span></div>
  <section className={styles.hero}>
   <div className={styles.heroCopy}>
    <div className={styles.heroStatus}><i className={connected?styles.liveDot:styles.idleDot}/>{connected?"COOLIFY INVENTORY AVAILABLE":"PRIVATE CLOUD · BUILDING"}</div>
    <h1>Your entire cloud.<br/><em>One command.</em></h1>
    <p>Applications, servers, databases, domains and operational intelligence — controlled by Margaryan Labs, not rented from a dashboard vendor.</p>
    <div className={styles.heroActions}>
     <button type="button" className={styles.actionPrimary} onClick={onOpenOwned}>Our infrastructure <span>↗</span></button>
     <button type="button" className={styles.actionSecondary} onClick={onOpenDeploy}>New deployment <span>+</span></button>
    </div>
   </div>
   <div className={styles.topology} aria-label="Private infrastructure conceptual topology; live nodes are labelled when connected">
    <div className={styles.radar}/><div className={styles.arcA}/><div className={styles.arcB}/>
    <span className={styles.connectionLineA}/><span className={styles.connectionLineB}/><span className={styles.connectionLineC}/>
    <span className={styles.connectionLineD}/>
    <div className={styles.topologyCore}><span className={styles.coreGlyph}>M</span><strong>MARKARIAN</strong><small>PRIVATE CORE</small></div>
    <div className={styles.nodeCompute}><span className={serversReady?styles.liveDot:styles.idleDot}/>COMPUTE <b>{serversReady?data.servers.length:"—"}</b></div>
    <div className={styles.nodeApps}><span className={appsReady?styles.liveDot:styles.idleDot}/>APPS <b>{appsReady?data.applications.length:"—"}</b></div>
    <div className={styles.nodeData}><span className={aux.clickhouse?.state==="connected"?styles.liveDot:styles.idleDot}/>DATA <b>{aux.clickhouse?.state==="connected"?"CH":"—"}</b></div>
    <div className={styles.nodeObserve}><span className={styles.idleDot}/>AGENTS <b>PLANNED</b></div>
    <small className={styles.topologyDisclaimer}>LIVE VALUES ONLY FROM CONNECTED SOURCES</small>
   </div>
  </section>
  <div className={styles.commandBar}>
   <div className={styles.connection}><span className={data.mode==="connected"?styles.liveDot:data.mode==="degraded"?styles.warnDot:styles.idleDot}/>
    <strong>{data.mode==="connected"?"Inventory connected":data.mode==="degraded"?"Partial availability":"Awaiting our servers"}</strong>
    <small>Last inventory check: {when(data.updatedAt)}</small>
   </div>
   <div className={styles.barButtons}>
    <button type="button" className={watch?styles.watchActive:styles.watch} aria-pressed={watch} onClick={()=>setWatch(x=>!x)}>
     <i className={watch?styles.liveDot:styles.idleDot}/> {watch?"SESSION WATCH ON":"SESSION WATCH OFF"}</button>
    <button type="button" className={styles.refresh} onClick={()=>{onRefresh();void readAux();}} disabled={loading}>{loading?"Refreshing…":"↻ Refresh all"}</button>
   </div>
  </div>
  <section className={styles.kpis} aria-label="Observed infrastructure metrics">
   <div><span>KNOWN PROJECTS</span><strong>{String(projects.length).padStart(2,"0")}</strong><small>Our portfolio</small></div>
   <div><span>RUNNING APPLICATIONS</span><strong>{appsReady?String(health.online).padStart(2,"0"):"—"}</strong><small>{appsReady?"Coolify reported":"No live app source"}</small></div>
   <div><span>SERVER FLEET</span><strong>{serversReady?String(data.servers.length).padStart(2,"0"):"—"}</strong><small>{serversReady?"Registered in Coolify":"Not connected"}</small></div>
   <div><span>WARNINGS / ERRORS</span><strong>{connected?String(problems).padStart(2,"0"):"—"}</strong><small>{connected?"Derived from observed records":"No verified health feed"}</small></div>
  </section>
  <nav className={styles.switcher} aria-label="Infrastructure workspace view">
   {sourceModes.map(s=><button type="button" key={s.id} aria-current={view===s.id?"page":undefined} onClick={()=>setView(s.id)}>
    <span>{s.name}</span><small>{s.hint}</small></button>)}
  </nav>
  {view==="fleet"&&<div className={styles.dashboard}>
   <div className={styles.mainStack}>
    <section className={styles.surface}>
     <div className={styles.sectionHeader}><div><span className={styles.overline}>COMPUTE / HOST INVENTORY</span><h2>Server fleet</h2></div>
      <button type="button" className={styles.microLink} onClick={onOpenSetup}>Connect node ↗</button></div>
     {!serversReady?<div className={styles.noSource}><span>◌</span><div><strong>No live server inventory</strong><p>Secure Coolify on our VPS to receive real reachability and node status.</p></div></div>:
      data.servers.length===0?<div className={styles.noSource}><span>◌</span><div><strong>No servers returned</strong><p>Coolify is connected but no host records were reported.</p></div></div>:
      <div className={styles.rows}>{data.servers.map(s=><div key={s.uuid} className={styles.hostRow}>
       <span className={styles.machine}>▥</span><div><strong>{s.name||"Unnamed node"}</strong><small>{s.description||s.ip||"No host details"}</small></div>
       <span className={styles.state}><i className={tone(s.status)}/>{s.status||"Unknown"}</span></div>)}</div>}
    </section>
    <section className={styles.surface}>
     <div className={styles.sectionHeader}><div><span className={styles.overline}>RELEASE PIPELINE</span><h2>Recent deployments</h2></div>
      <button className={styles.microLink} onClick={onOpenDeploy} type="button">Deploy Engine ↗</button></div>
     {!deploysReady?<div className={styles.noSource}><span>↗</span><div><strong>Deployment history not connected</strong><p>Records will appear when Coolify reports them.</p></div></div>:
      data.deployments.length===0?<div className={styles.noSource}><span>↗</span><div><strong>No deployment records</strong><p>No deployments returned by Coolify.</p></div></div>:
      <div className={styles.rows}>{data.deployments.slice(0,7).map(d=><div key={d.uuid} className={styles.deployRow}>
       <span className={styles.deployGlyph}>↗</span><div><strong>{d.applicationName||"Unnamed deployment"}</strong><small>{d.commit?d.commit.slice(0,8)+" · ":""}{when(d.createdAt)}</small></div>
       <span className={styles.state}><i className={tone(d.status)}/>{safeText(d.status||"Unknown")}</span></div>)}</div>}
    </section>
   </div>
   <div className={styles.sideStack}>
    <section className={styles.signalPanel}>
     <div className={styles.sectionHeader}><div><span className={styles.overline}>OPERATIONS / SIGNAL FEED</span><h2>System alerts</h2></div>
      <button type="button" className={styles.smallToggle} aria-pressed={severeOnly} onClick={()=>setSevereOnly(x=>!x)}>{severeOnly?"Critical only":"All signals"} <span>⌄</span></button></div>
     {alerts.length===0?<div className={styles.quiet}><span>✓</span><strong>No alerts in available data</strong><small>This is not a guarantee that all systems are healthy.</small></div>:
      <div className={styles.alertRows}>{alerts.slice(0,6).map(s=><div key={s.id} className={styles.alertItem}>
       <i className={s.severity==="critical"?styles.bad:s.severity==="warning"?styles.warnDot:styles.idleDot}/>
       <div><strong>{s.title}</strong><small>{s.detail}</small><span>{s.source}</span></div></div>)}</div>}
    </section>
    <section className={styles.agentTeaser}><div><span className={styles.overline}>AUTONOMOUS INTELLIGENCE</span><span className={styles.agentsPlanned}>COMING LATER</span></div>
     <strong>Infrastructure agents</strong><p>Read-only detection rules are available now. Background AI agents, approvals and remediation require a running service.</p>
     <button type="button" onClick={()=>setView("agents")}>Explore Agent Watch ↗</button></section>
   </div>
  </div>}
  {view==="projects"&&<section className={styles.surface}>
   <div className={styles.sectionHeader}><div><span className={styles.overline}>APPLICATION OPERATIONS</span><h2>Our projects <small className={styles.count}>{projects.length}</small></h2></div>
    <button type="button" className={styles.smallAction} onClick={()=>setAdding(x=>!x)}>{adding?"Cancel":"+ Add project"}</button></div>
   {adding&&<form className={styles.addForm} onSubmit={e=>{e.preventDefault();addProject();}}>
    <span>Local migration entry only — no repository, database or server is changed.</span>
    <input aria-label="Project name" value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" required maxLength={80}/>
    <input aria-label="GitHub repository" value={repository} onChange={e=>setRepository(e.target.value)} placeholder="owner/repository" required/>
    <button type="submit" disabled={!ready}>Save to this browser</button>
   </form>}
   {formError&&<p className={styles.formError} role="alert">{formError}</p>}
   <div className={styles.projectControls}><label className={styles.search}><span>⌕</span><input aria-label="Search projects" placeholder="Search names or GitHub repos" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className={styles.filter} role="group" aria-label="Project status filter">
     {([["all","All"],["hosted","Hosted"],["issues","Issues"],["planned","To migrate"]] as const).map(([key,text])=>
      <button type="button" key={key} aria-pressed={projectFilter===key} onClick={()=>setProjectFilter(key)}>{text}</button>)}</div></div>
   <div className={styles.projectTable}><div className={styles.tableHeading}><span>APPLICATION</span><span>PLATFORM</span><span>STATE</span></div>
    {filtered.length===0?<div className={styles.empty}>No projects match this filter.</div>:
    filtered.map(p=><div key={p.key}>
     <button type="button" className={styles.projectRow} aria-expanded={selected===p.key} onClick={()=>setSelected(selected===p.key?"":p.key)}>
      <span className={styles.projectIdentity}><b>{p.name.slice(0,2).toUpperCase()}</b><span><strong>{p.name}</strong><small>{p.repository||p.type}</small></span></span>
      <span className={styles.providerName}>{p.linked?"Coolify":"Migration plan"}</span><span className={styles.state}><i className={p.linked?(p.health==="running"?styles.ok:p.health==="attention"?styles.bad:styles.off):styles.off}/>
      {p.linked?(p.health==="running"?"Running":p.health==="attention"?"Needs attention":"Unverified"):"Not hosted"} <b>⌄</b></span></button>
     {selected===p.key&&<div className={styles.projectExpanded}>
      <p>{p.linked?"Matched to Coolify by GitHub repository. Provider status is shown as received.":"A planned migration, not a live deployment."}</p>
      <div><span>Repository <strong>{p.repository||"Not verified"}</strong></span><span>Live app records <strong>{p.liveApplications.length}</strong></span>
       <span>Risk <strong>{p.risk||"Not assessed"}</strong></span></div>
      <div className={styles.detailsActions}><button type="button" onClick={onOpenDeploy}>Plan staging deploy ↗</button>
       {p.category==="local"&&<button type="button" onClick={removeProject}>Remove local planning entry</button>}</div>
     </div>}
    </div>)}</div>
   <p className={styles.disclaimer}>Hosted statuses require a connected Coolify source. Catalog entries are migration plans, not proof of live availability.</p>
  </section>}
  {view==="data"&&<div className={styles.dataGrid}>
   <section className={styles.surface}>
    <div className={styles.sectionHeader}><div><span className={styles.overline}>OWNED DATA PLANE</span><h2>Databases & services</h2></div><button type="button" className={styles.microLink} onClick={onOpenStudio}>All services ↗</button></div>
    <div className={styles.dataRows}>
     <div><span className={styles.sourceIcon}>▥</span><span><strong>PostgreSQL + Supabase stack</strong><small>Auth · Realtime · Storage · Functions</small></span><span className={styles.notReady}>SELF-HOST NOT VERIFIED</span></div>
     <div><span className={styles.sourceIcon}>▤</span><span><strong>ClickHouse</strong><small>{aux.clickhouse?.state==="connected"?"Version "+aux.clickhouse.version+" · uptime "+Math.floor((aux.clickhouse.uptimeSeconds||0)/3600)+"h":aux.clickhouse?.notice||"Not configured"}</small></span>
      <span className={aux.clickhouse?.state==="connected"?styles.connected:styles.notReady}>{aux.clickhouse?.state==="connected"?"CONNECTED":aux.clickhouse?.state==="error"?"ERROR":"NOT CONFIGURED"}</span></div>
     <div><span className={styles.sourceIcon}>⌁</span><span><strong>Prometheus monitoring</strong><small>{aux.telemetry?.mode==="connected"?aux.telemetry.metrics.map(m=>m.name==="healthyTargets"?"Reachable: "+(m.value===null?"—":m.value):m.name==="scrapeTargets"?"Targets: "+(m.value===null?"—":m.value):"").filter(Boolean).join(" · "):aux.telemetry?.notice||"Private metrics endpoint not connected"}</small></span><span className={aux.telemetry?.mode==="connected"?styles.connected:styles.notReady}>{aux.telemetry?.mode==="connected"?"CONNECTED":aux.telemetry?.mode==="degraded"?"PARTIAL":"NOT CONFIGURED"}</span></div>
     <div><span className={styles.sourceIcon}>⌁</span><span><strong>Object Storage + Backups</strong><small>Separate encrypted backup and restore verification required</small></span><span className={styles.notReady}>UNVERIFIED</span></div>
    </div>
    <div className={styles.bridgeTitle}><span className={styles.overline}>LEGACY PROVIDER BRIDGE</span><span>{auxLoading?"Refreshing…":"Read-only project discovery"}</span></div>
    <div className={styles.bridges}>{(["vercel","railway","supabase"] as const).map(id=>{
     const p=aux.providers?.find(x=>x.id===id);
     return <div key={id}><span>{id==="supabase"?"Supabase Cloud":id==="vercel"?"Vercel":"Railway"}</span>
      <strong>{p?.state==="connected"?p.total:"—"}</strong><small>{p?labelState(p.state):"Status unavailable"}</small>
     </div>;})}</div>
    {aux.error&&<p className={styles.errorText}>{aux.error}</p>}
   </section>
   <section className={styles.surface}>
    <div className={styles.sectionHeader}><div><span className={styles.overline}>DOMAINS & EDGE</span><h2>Domain connections</h2></div><button type="button" className={styles.microLink} onClick={onOpenDomains}>Connect domain ↗</button></div>
    {!appsReady?<div className={styles.noSource}><span>◎</span><div><strong>Waiting for domain inventory</strong><p>Connect Coolify to view configured application hostnames.</p></div></div>:
     domains.length===0?<div className={styles.noSource}><span>◎</span><div><strong>No domains reported</strong><p>No application domains have been configured in the connected inventory.</p></div></div>:
     <div className={styles.domains}>{domains.map(d=><div key={d.id}><span><strong>{d.host}</strong><small>{d.app}</small></span>
      <span className={styles.notReady}>DNS/TLS UNVERIFIED</span></div>)}</div>}
    <p className={styles.disclaimer}>Coolify domain configuration is not a DNS propagation, certificate validity or uptime check. Those verifications need a separate trusted probe.</p>
   </section>
  </div>}
  {view==="agents"&&<div className={styles.agentGrid}>
   <section className={styles.surface}>
    <div className={styles.sectionHeader}><div><span className={styles.overline}>MARGARYAN CLOUD / COMMAND LAYER</span><h2>Agent Supervisor</h2></div>
      <span className={aux.supervisor?.state==="recent"?styles.ok:styles.notReady}>{aux.supervisor?.state==="recent"?"RECENT AUDIT":aux.supervisor?.state==="stale"?"STALE EVIDENCE":"NOT CONNECTED"}</span></div>
    <p className={styles.lead}>Unified read-only intelligence from GitHub Portfolio Guardian and Coolify Sentinel. Missing evidence is never a green status.</p>
    <div className={styles.supervisorMetrics}>
      <div><span>Observed findings</span><strong>{aux.supervisor?.state==="recent"?aux.supervisor.incidentCount:"—"}</strong></div>
      <div><span>Critical</span><strong>{aux.supervisor?.state==="recent"?aux.supervisor.criticalCount:"—"}</strong></div>
      <div><span>Last audit</span><strong>{aux.supervisor?.checkedAt?when(aux.supervisor.checkedAt):"Not verified"}</strong></div>
    </div>
    <div className={styles.supervisorSources}>{(aux.supervisor?.sources||[]).map(src=><div key={src.id}><span>{src.id==="portfolio"?"GitHub / Portfolio":src.id==="decision"?"VETO / Decision Specialist":"Coolify / Infrastructure"}</span><b>{src.state.toUpperCase()}</b></div>)}</div>
    {aux.supervisor?.state==="recent"&&aux.supervisor.incidents.length>0?<div className={styles.supervisorFeed}>{aux.supervisor.incidents.map(item=><div key={item.id}>
      <span className={item.severity==="critical"?styles.bad:item.severity==="warning"?styles.warnDot:styles.off}/>
      <div><strong>{safeText(item.title)}</strong><small>{item.project||item.origin} · {item.severity.toUpperCase()}</small></div>
    </div>)}</div>:<p className={styles.disclaimer}>{aux.supervisor?.notice||"A private server report is required. No scheduled audit has been verified."}</p>}
    <div className={styles.supervisorDecision}><strong>VETO Decision Command</strong><small>Worker evidence: {aux.supervisor?.sources.find(s=>s.id==="decision")?.state.toUpperCase()||"NOT CONNECTED"} · market-readyz and PAPER-cycle checks only. Feed integrity, profitability and live trading authority: NOT VERIFIED</small></div>
    <p className={styles.disclaimer}>Source setup only until an owner-operated scheduler produces fresh snapshots. No trading, production edits or automatic recovery permissions.</p>
   </section>
   <section className={styles.surface}>
    <div className={styles.sectionHeader}><div><span className={styles.overline}>INFRASTRUCTURE INTELLIGENCE</span><h2>Agent operations</h2></div>
     <span className={styles.notReady}>{aux.sentinel?.state==="connected"?"SENTINEL RECENT POLL":"RULES · READ ONLY"}</span></div>
    <p className={styles.lead}>Start with deterministic, inspectable health rules. Future agents can investigate anomalies and propose repairs, but cannot modify production without explicit approval and an audit trail.</p>
    <div className={styles.rulesHeader}><strong>Current rule findings</strong><button type="button" className={styles.smallToggle} aria-pressed={severeOnly} onClick={()=>setSevereOnly(v=>!v)}>{severeOnly?"Critical":"All severities"} ⌄</button></div>
    {alerts.length===0?<p className={styles.empty}>No rule findings in available data. Sources may be disconnected.</p>:<div className={styles.ruleList}>
     {alerts.map((s:Signal)=><div key={s.id}><span className={s.severity==="critical"?styles.bad:s.severity==="warning"?styles.warnDot:styles.off}/><div><strong>{s.title}</strong>
      <small>{s.detail}</small><em>{s.source} · {s.severity}</em></div></div>)}</div>}
   </section>
   <section className={styles.surface}>
    <div className={styles.sectionHeader}><div><span className={styles.overline}>AUTOMATION ROADMAP</span><h2>Future AI agents</h2></div></div>
    <div className={styles.agentList}>{indicators.map(a=><div key={a.id}><span className={styles.agentMark}>✳</span>
      <span><strong>{a.name}</strong><small>{a.scope}</small></span><span className={styles.notReady}>{a.id==="supervisor"?(aux.supervisor?.state==="recent"?"RECENT AUDIT":"SOURCE READY"):a.id==="decision"?(aux.supervisor?.sources.find(s=>s.id==="decision")?.state==="recent"?"RECENT PROBE":"SOURCE READY"):a.id==="portfolio"?"SOURCE READY":a.id==="infrastructure"?(aux.sentinel?.state==="connected"?"RECENT POLL":aux.sentinel?.state==="stale"?"STALE": "SOURCE READY"):"PLANNED"}</span></div>)}</div>
    <div className={styles.sentinelReady}><div><span className={styles.overline}>SENTINEL V1 / SERVER SIDE</span>
     <strong>{aux.sentinel?.state==="connected"?"Recent server-side Sentinel poll":aux.sentinel?.state==="stale"?"Sentinel's last poll is stale":"Read-only watcher source prepared"}</strong>
     <small>{aux.sentinel?.state==="connected"?
      "Last check "+when(aux.sentinel.checkedAt||"")+" · "+aux.sentinel.activeIncidents+" observed findings ("+aux.sentinel.criticalCount+" critical)."+
      " This is a read-only poll, not autonomous repair.":
      aux.sentinel?.state==="stale"?"The last completed check is older than five minutes. Freshness is not guaranteed.":
      "Server-side scheduling is not configured. Source-only, no 24/7 monitoring yet."}</small></div>
     <code>node --experimental-strip-types scripts/cloud/sentinel.mjs --plan</code>
     <button type="button" onClick={()=>{void navigator.clipboard.writeText("node --experimental-strip-types scripts/cloud/sentinel.mjs --plan").then(()=>setSentinelCopy("Setup command copied")).catch(()=>setSentinelCopy("Clipboard unavailable"));}}>Copy setup command ↗</button>
     <span role="status">{sentinelCopy}</span></div>
    <div className={styles.sentinelReady}><div><span className={styles.overline}>PORTFOLIO GUARDIAN V1 / SOURCE ONLY</span>
     <strong>GitHub portfolio audits — prepared, not scheduled</strong>
     <small>Includes VETO Decision Command, VETOGRAM, SOFIA, Promptence and all GitHub repositories accessible to a scoped operator token. CI and PR metadata only. An actual runner, secret and scheduling are not configured; no live scan is claimed.</small></div>
     <code>node scripts/cloud/portfolio-guardian.mjs --plan</code></div>
    <div className={styles.gate}><strong>Execution permission boundary</strong><p>AI agents will start with read-only diagnostics. Restart, deploy, DNS and database write operations require scoped roles, approval and an immutable audit trail.</p></div>
    <button type="button" className={styles.agentAction} onClick={onOpenTelemetry}>Open observability ↗</button>
   </section>
  </div>}
  <footer className={styles.footer}><span>MARKARIAN CLOUD / OWNER CONTROL CENTER</span>
   <span>{watch?"Refreshing while this browser session stays open · every 60 seconds":"Session watch paused"} · No infrastructure changes from this screen.</span></footer>
 </div>;
}
