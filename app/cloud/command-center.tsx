"use client";

import {useEffect,useMemo,useState} from "react";
import {appHealth,buildPortfolio,githubRepository,infrastructureNotice,type CloudSnapshot,type LocalProject} from "@/lib/cloud/command-center";
import styles from "./command-center.module.css";
import ProviderConsole from "./provider-console";

type Filter="all"|"connected"|"planned"|"attention";
type Props={data:CloudSnapshot;loading:boolean;onRefresh:()=>void;onOpenSetup:()=>void;onOpenMigration:()=>void};
const dt=(value:string)=>{if(!value)return "Not checked";const d=new Date(value);return Number.isNaN(d.getTime())?"Not checked":d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});};
const mood=(name:"running"|"attention"|"unknown")=>name==="running"?styles.healthy:name==="attention"?styles.critical:styles.neutral;
function words(status:string){return status?status.replaceAll("_"," "):"Unknown";}
const chip=(health:"running"|"attention"|"unknown")=>health==="running"?styles.statusGood:health==="attention"?styles.statusBad:styles.statusUnknown;
export default function CommandCenter({data,loading,onRefresh,onOpenSetup,onOpenMigration}:Props){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState<Filter>("all");
 const [chosen,setChosen]=useState("");
 const [adding,setAdding]=useState(false);
 const [projectName,setProjectName]=useState("");
 const [projectRepo,setProjectRepo]=useState("");
 const [projectError,setProjectError]=useState("");
 const [localProjects,setLocalProjects]=useState<LocalProject[]>([]);
 const [localReady,setLocalReady]=useState(false);
 useEffect(()=>{
  try{
   const raw=window.localStorage.getItem("markarian-cloud-projects-v1");
   if(raw){
    const parsed:unknown=JSON.parse(raw);
    if(Array.isArray(parsed)){
     setLocalProjects(parsed.filter((p):p is LocalProject=>Boolean(
      p&&typeof p==="object"&&typeof p.id==="string"&&typeof p.name==="string"&&
      typeof p.repository==="string"&&githubRepository(p.repository)
     )).slice(0,50).map(p=>({id:p.id.slice(0,80),name:p.name.slice(0,80),repository:p.repository.slice(0,180)})));
    }
   }
  }catch{setProjectError("Local project registry could not be read.");}
  setLocalReady(true);
 },[]);
 const portfolio=useMemo(()=>buildPortfolio(data,localProjects),[data,localProjects]);
 function addProject(){
  const repo=githubRepository(projectRepo);
  const name=projectName.trim();
  if(!localReady)return;
  if(!repo||name.length<2||name.length>80){
   setProjectError("Enter a 2–80 character project name and valid GitHub owner/repository.");
   return;
  }
  if(portfolio.some(item=>item.repository&&githubRepository(item.repository)===repo)){
   setProjectError("This GitHub repository is already present in the portfolio.");
   return;
  }
  if(localProjects.length>=50){setProjectError("Local registry is limited to 50 additional projects.");return;}
  const next=[...localProjects,{id:crypto.randomUUID(),name,repository:repo}];
  try{
   window.localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));
  }catch{setProjectError("Storage is unavailable. Your project was not saved.");return;}
  setLocalProjects(next);setProjectName("");setProjectRepo("");setProjectError("");setAdding(false);
 }
 function removeLocal(item:LocalProject){
  const next=localProjects.filter(p=>p.id!==item.id);
  try{
   window.localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));
   setLocalProjects(next);setChosen("");
  }catch{setProjectError("Could not update local storage.");}
 }
 const visible=useMemo(()=>portfolio.filter(item=>{
  if(filter==="connected"&&!item.linked)return false;
  if(filter==="planned"&&item.linked)return false;
  if(filter==="attention"&&item.health!=="attention")return false;
  return (item.name+" "+(item.repository||"")+" "+item.type).toLowerCase().includes(query.trim().toLowerCase());
 }),[portfolio,filter,query]);
 const active=portfolio.find(item=>item.key===chosen)||null;
 const serverKnown=data.sources?.servers===true;
 const appsKnown=data.sources?.applications===true;
 const deploymentsKnown=data.sources?.deployments===true;
 const issues=portfolio.filter(item=>item.health==="attention");
 const linkedCount=portfolio.filter(item=>item.linked).length;
 return <div className={styles.root}>
  <header className={styles.hero}>
   <div className={styles.heroText}>
    <span className={styles.kicker}>MARGARYAN LABS / PRIVATE OPERATIONS</span>
    <h1>Command <em>Center.</em></h1>
    <p>Every project. Every server. One clear place to understand what is connected, what needs attention and what is still being prepared.</p>
    <div className={styles.heroButtons}>
     <button type="button" className={styles.primary} onClick={onOpenSetup}>Connect infrastructure <span>↗</span></button>
     <button type="button" className={styles.outline} onClick={onOpenMigration}>Migration Lab <span>→</span></button>
    </div>
   </div>
   <div className={styles.heroVisual} aria-hidden="true"><span className={styles.ringA}/><span className={styles.ringB}/><span className={styles.ringC}/><div className={styles.core}>M<span>✦</span></div><span className={styles.particleOne}/><span className={styles.particleTwo}/><span className={styles.particleThree}/></div>
  </header>
  <div className={styles.statusBar} role="status">
   <span className={data.mode==="connected"?styles.liveDot:data.mode==="degraded"?styles.warnDot:styles.idleDot}/>
   <span><strong>{data.mode==="connected"?"Coolify inventory connected":data.mode==="degraded"?"Partial provider connection":"Private cloud awaiting setup"}</strong>
    <small>{infrastructureNotice(data)}</small></span>
   <span className={styles.statusRight}>Last checked {dt(data.updatedAt)}</span>
   <button type="button" className={styles.refresh} onClick={onRefresh} disabled={loading}>{loading?"Checking…":"↻ Refresh"}</button>
  </div>
  {data.errors.length>0&&<div className={styles.error} role="alert"><strong>Connection notice</strong><span>{data.errors.join(" · ")}</span></div>}
  <div className={styles.metrics} aria-label="Live infrastructure statistics">
   <article><small>PORTFOLIO</small><strong>{portfolio.length}</strong><span>Known and discovered projects</span></article>
   <article><small>LINKED TO COOLIFY</small><strong>{appsKnown?linkedCount:"—"}</strong><span>{appsKnown?"Matched real application records":"Provider not connected"}</span></article>
   <article><small>MANAGED SERVERS</small><strong>{serverKnown?data.servers.length:"—"}</strong><span>{serverKnown?"Returned by Coolify":"Provider not connected"}</span></article>
   <article><small>NEEDS ATTENTION</small><strong>{appsKnown?issues.length:"—"}</strong><span>{appsKnown?"Based on reported statuses":"No live health signals"}</span></article>
  </div>
  <ProviderConsole compact coolifyMode={data.mode}/>
  <div className={styles.mainGrid}>
   <section className={styles.projects}>
    <div className={styles.panelHead}><div><span className={styles.kicker}>PROJECT OPERATIONS</span><h2>All projects</h2></div><button type="button" className={styles.addProject} onClick={()=>{setAdding(!adding);setProjectError("");}} aria-expanded={adding}>{adding?"Cancel":"＋ Add project"}</button></div>
    {adding&&<form className={styles.addForm} onSubmit={event=>{event.preventDefault();addProject();}}>
     <strong>Register a project for migration</strong>
     <p>This saves a name and GitHub path on this device only. It will not deploy or change your repository.</p>
     <label>Project name<input required maxLength={80} value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="My new project"/></label>
     <label>GitHub repository<input required value={projectRepo} onChange={e=>setProjectRepo(e.target.value)} placeholder="owner/repository"/></label>
     {projectError&&<p role="alert" className={styles.formError}>{projectError}</p>}
     <button type="submit" disabled={!localReady}>Save project locally</button>
    </form>}
    <div className={styles.toolbar}>
     <label className={styles.searchLabel}><span aria-hidden="true">⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find project or repository…" aria-label="Search projects"/></label>
     <div className={styles.filters} role="group" aria-label="Filter projects">
      {([["all","All"],["connected","Connected"],["planned","To migrate"],["attention","Needs attention"]] as const).map(([key,label])=>
       <button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)} className={filter===key?styles.filterActive:styles.filter}>{label}</button>)}
     </div>
    </div>
    {visible.length===0?<div className={styles.empty}>No projects match your filters. Try another search or connect Coolify to discover services.</div>:
     <div className={styles.projectRows}>{visible.map((item,index)=><button key={item.key} type="button" className={active?.key===item.key?styles.projectSelected:styles.projectRow} aria-pressed={active?.key===item.key} onClick={()=>setChosen(active?.key===item.key?"":item.key)}>
      <span className={styles.projectSymbol}>{item.name.slice(0,1).toUpperCase()}</span>
      <span className={styles.projectIdentity}><strong>{item.name}</strong><small>{item.repository||item.type}</small></span>
      <span className={styles.projectState}><i className={item.linked?mood(item.health):styles.plannedDot}/><span>{item.linked?item.health==="running"?"Running":item.health==="attention"?"Check status":"Status unknown":"Not migrated"}</span></span>
      <span className={styles.rowArrow}>⌄</span>
     </button>)}</div>}
    {active&&<div className={styles.detail} aria-label={"Details for "+active.name}>
     <div className={styles.detailTitle}><div><span className={styles.kicker}>SELECTED PROJECT</span><h3>{active.name}</h3></div><button type="button" onClick={()=>setChosen("")} aria-label="Close project details">✕</button></div>
     <p className={styles.detailDesc}>{active.linked?"Linked through an exact GitHub repository match or discovered from Coolify.":"Listed for migration planning. No Coolify deployment has been confirmed."}</p>
     <div className={styles.detailGrid}>
      <div><small>SOURCE</small>{active.repository?<a href={"https://github.com/"+active.repository} target="_blank" rel="noopener noreferrer">{active.repository} ↗</a>:<strong>Repository not verified</strong>}</div>
      <div><small>ENVIRONMENT</small><strong>{active.linked?"Coolify connected":"Migration pending"}</strong></div>
      <div><small>APPLICATIONS</small><strong>{active.linked?active.liveApplications.length:"No live records"}</strong></div>
      <div><small>RISK LEVEL</small><strong>{active.risk||"Unassessed"}</strong></div>
     </div>
     {active.liveApplications.length>0&&<div className={styles.apps}><strong>Coolify application records</strong>
      {active.liveApplications.map((app,index)=><div className={styles.application} key={app.uuid||String(index)}><div><b>{app.name}</b><small>{app.gitBranch||"Unknown branch"} · {app.domain||"Domain not reported"}</small></div><span className={chip(appHealth(app.status))}>{words(app.status)}</span></div>)}
     </div>}
     {active.category==="local"&&<button className={styles.removeLocal} type="button" onClick={()=>{
      const local=localProjects.find(p=>active.key==="local:"+p.id);
      if(local)removeLocal(local);
     }}>Remove local planning entry</button>}
     <button type="button" className={styles.detailAction} onClick={active.linked?onOpenSetup:onOpenMigration}>{active.linked?"Open infrastructure setup →":"Prepare migration →"}</button>
    </div>}
   </section>
   <aside className={styles.right}>
    <section className={styles.sidePanel}><div className={styles.panelHead}><div><span className={styles.kicker}>INFRASTRUCTURE</span><h2>Server fleet</h2></div><span className={styles.panelMeta}>{serverKnown?data.servers.length:"—"}</span></div>
     {!serverKnown?<p className={styles.emptySmall}>Connect Coolify to see actual servers and their reported reachability.</p>:
      data.servers.length===0?<p className={styles.emptySmall}>Coolify reports no servers.</p>:
      data.servers.slice(0,8).map((s,index)=><div key={s.uuid||String(index)} className={styles.serverLine}><span className={styles.serverIcon}>▤</span><div><strong>{s.name||"Unnamed server"}</strong><small>{s.ip||"IP not reported"}</small></div><i className={mood(appHealth(s.status))} title={s.status}/></div>)}
    </section>
    <section className={styles.sidePanel}><div className={styles.panelHead}><div><span className={styles.kicker}>DEPLOYMENTS</span><h2>Activity</h2></div><span className={styles.panelMeta}>{deploymentsKnown?data.deployments.length:"—"}</span></div>
     {!deploymentsKnown?<p className={styles.emptySmall}>Connect Coolify to see deployment records.</p>:
      data.deployments.length===0?<p className={styles.emptySmall}>No deployment records were returned.</p>:
      data.deployments.slice(0,6).map((d,index)=><div key={d.uuid||String(index)} className={styles.deployment}><div><strong>{d.applicationName||"Unnamed deploy"}</strong><small>{d.createdAt?dt(d.createdAt):"Time unavailable"}</small></div><span className={chip(appHealth(d.status))}>{words(d.status)}</span></div>)}
    </section>
    <section className={styles.security}><div className={styles.securityTop}><span>♧</span><strong>Security boundary</strong></div><p>Read-only control. Tokens stay on the server. Destructive actions and database operations are not exposed by this console.</p><small>Production controls require dedicated operator identity, audit logs and explicit confirmation.</small></section>
   </aside>
  </div>
  <footer className={styles.foot}>MARKARIAN CLOUD / COMMAND CENTER V1.1 <span>Coolify is the only live inventory source. Railway, Vercel and Supabase are not connected to this dashboard yet.</span></footer>
 </div>;
}
