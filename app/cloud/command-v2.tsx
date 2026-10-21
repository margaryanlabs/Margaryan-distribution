"use client";
import {useEffect,useMemo,useState} from "react";
import {buildPortfolio,githubRepository,appHealth,type CloudSnapshot,type LocalProject} from "@/lib/cloud/command-center";
import styles from "./command-v2.module.css";

type Props={data:CloudSnapshot;loading:boolean;onRefresh:()=>void;
 onOpenSetup:()=>void;onOpenOwned:()=>void;onOpenDeploy:()=>void;onOpenCapacity:()=>void;onOpenRecovery:()=>void};
type Filter="all"|"linked"|"planned";
const initial:LocalProject[]=[];
function stateLabel(status:"running"|"attention"|"unknown",linked:boolean){
 if(!linked)return "To migrate";
 if(status==="running")return "Running";
 if(status==="attention")return "Needs attention";
 return "Unverified";
}
export default function CommandV2({data,loading,onRefresh,onOpenSetup,onOpenOwned,onOpenDeploy,onOpenCapacity,onOpenRecovery}:Props){
 const [filter,setFilter]=useState<Filter>("all");
 const [search,setSearch]=useState("");
 const [local,setLocal]=useState<LocalProject[]>(initial);
 const [loaded,setLoaded]=useState(false);
 const [adding,setAdding]=useState(false);
 const [newName,setNewName]=useState("");
 const [newRepo,setNewRepo]=useState("");
 const [error,setError]=useState("");
 const [selected,setSelected]=useState("");
 useEffect(()=>{
  try{
   const saved=JSON.parse(localStorage.getItem("markarian-cloud-projects-v1")||"[]") as unknown;
   if(Array.isArray(saved))setLocal(saved.filter((x):x is LocalProject=>Boolean(x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.name==="string"&&
    typeof x.repository==="string"&&githubRepository(x.repository))).slice(0,50));
  }catch{setError("Local project list could not be loaded.");}
  setLoaded(true);
 },[]);
 const projects=useMemo(()=>buildPortfolio(data,local),[data,local]);
 const list=useMemo(()=>projects.filter(p=>
  (filter==="all"||filter==="linked"&&p.linked||filter==="planned"&&!p.linked)&&
  (p.name+" "+(p.repository||"")+" "+p.type).toLowerCase().includes(search.trim().toLowerCase())
 ),[projects,filter,search]);
 const active=projects.find(x=>x.key===selected)||null;
 const appsObserved=data.sources?.applications===true;
 const serversObserved=data.sources?.servers===true;
 const connectedCount=projects.filter(x=>x.linked).length;
 const healthyServers=serversObserved?data.servers.filter(s=>s.status==="healthy").length:null;
 function saveLocal(){
  const repo=githubRepository(newRepo),name=newName.trim();
  if(!loaded)return;
  if(!repo||name.length<2||name.length>80){setError("Enter a project name and GitHub owner/repository.");return;}
  if(projects.some(p=>p.repository&&githubRepository(p.repository)===repo)){setError("This repository is already listed.");return;}
  if(local.length>=50){setError("Local registry is limited to 50 projects.");return;}
  const next=[...local,{id:crypto.randomUUID(),name,repository:repo}];
  try{localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));setLocal(next);setAdding(false);setNewName("");setNewRepo("");setError("");}
  catch{setError("Could not save to this browser.");}
 }
 function removeLocal(){
  if(!active||active.category!=="local")return;
  const next=local.filter(x=>"local:"+x.id!==active.key);
  try{localStorage.setItem("markarian-cloud-projects-v1",JSON.stringify(next));setLocal(next);setSelected("");}catch{setError("Could not update local storage.");}
 }
 const connected=data.mode==="connected";
 return <div className={styles.root}>
  <div className={styles.eyeline}><span>YOUR PRIVATE INFRASTRUCTURE</span><span>CONTROL ROOM <b> / </b> 01</span></div>
  <section className={styles.hero}>
   <div className={styles.heroContent}>
    <div className={styles.systemFlag}><span className={styles.statusDot}/> {connected?"COOLIFY INVENTORY CONNECTED":"SELF-HOSTED · PREPARATION"}</div>
    <h1>One command.<br/><em>Every system.</em></h1>
    <p>A private place to run everything Margaryan Labs builds. Your servers, your deployments, your data — one operational picture.</p>
    <div className={styles.heroActions}>
     <button type="button" className={styles.mainCta} onClick={onOpenOwned}>Explore our infrastructure <span>↗</span></button>
     <button type="button" className={styles.quietCta} onClick={onOpenDeploy}>Plan deployment <span>↗</span></button>
    </div>
   </div>
   <div className={styles.network} aria-hidden="true">
    <div className={styles.networkGrid}/>
    <span className={styles.netLabelA}>COMPUTE / 01</span>
    <span className={styles.netLabelB}>DATA / 02</span>
    <span className={styles.netLabelC}>OBSERVE / 03</span>
    <div className={styles.nodeMain}><span>MC</span><small>PRIVATE CORE</small></div>
    <i className={styles.nodeOne}/><i className={styles.nodeTwo}/><i className={styles.nodeThree}/>
    <svg className={styles.netLines} viewBox="0 0 400 290" fill="none" aria-hidden="true"><path d="M199 148L85 66M199 148L325 63M199 148L340 242M199 148L73 243" stroke="currentColor" strokeWidth="1"/><circle cx="85" cy="66" r="5" fill="currentColor"/><circle cx="325" cy="63" r="5" fill="currentColor"/><circle cx="340" cy="242" r="5" fill="currentColor"/><circle cx="73" cy="243" r="5" fill="currentColor"/></svg>
   </div>
  </section>
  <section className={styles.vitals} aria-label="Observed infrastructure status">
   <div><span>PORTFOLIO</span><strong>{projects.length.toString().padStart(2,"0")}</strong><small>Known projects</small></div>
   <div><span>HOSTED APPS</span><strong>{appsObserved?connectedCount.toString().padStart(2,"0"):"—"}</strong><small>{appsObserved?"Matched to Coolify":"Not connected"}</small></div>
   <div><span>SERVER HEALTH</span><strong>{healthyServers===null?"—":healthyServers+"/"+data.servers.length}</strong><small>{serversObserved?"Reported reachability":"Awaiting our VPS"}</small></div>
   <div><span>RESTORE PROOF</span><strong>—</strong><small>Not verified yet</small></div>
  </section>
  {data.errors.length>0&&<div className={styles.error} role="alert"><strong>Connection notice</strong>{data.errors.join(" · ")}</div>}
  <section className={styles.areas}>
   <button onClick={onOpenDeploy} type="button"><span className={styles.areaNumber}>01 / DEPLOY</span><strong>Ship applications</strong><small>GitHub · Docker · Releases</small><span className={styles.areaArrow}>↗</span></button>
   <button onClick={onOpenCapacity} type="button"><span className={styles.areaNumber}>02 / PLAN</span><strong>Infrastructure sizing</strong><small>Servers · CPU · Memory</small><span className={styles.areaArrow}>↗</span></button>
   <button onClick={onOpenRecovery} type="button"><span className={styles.areaNumber}>03 / PROTECT</span><strong>Recovery system</strong><small>Encrypted backups · Restore</small><span className={styles.areaArrow}>↗</span></button>
  </section>
  <div className={styles.workspace}>
   <section className={styles.projectPanel}>
    <header className={styles.sectionHeader}><div><span className={styles.sectionEyebrow}>PORTFOLIO OVERVIEW</span><h2>All your projects<span className={styles.roundCount}>{projects.length}</span></h2></div>
     <button type="button" onClick={()=>{setAdding(x=>!x);setError("");}} className={styles.addButton}>{adding?"Cancel":"+ Add project"}</button>
    </header>
    {adding&&<form className={styles.projectForm} onSubmit={e=>{e.preventDefault();saveLocal();}}>
     <span>Local migration registry — this does not deploy code.</span>
     <div><input aria-label="Project name" required placeholder="Project name" value={newName} onChange={e=>setNewName(e.target.value)} maxLength={80}/>
      <input aria-label="GitHub repository" required placeholder="owner/repository" value={newRepo} onChange={e=>setNewRepo(e.target.value)}/></div>
     <button disabled={!loaded} type="submit">Add to portfolio →</button>
    </form>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <div className={styles.projectControls}>
     <label className={styles.search}><span>⌕</span><input aria-label="Search projects" placeholder="Search projects or repositories" value={search} onChange={e=>setSearch(e.target.value)}/></label>
     <div className={styles.filter}>{([["all","All"],["linked","Hosted"],["planned","Planned"]] as const).map(([key,label])=>
      <button type="button" aria-pressed={filter===key} key={key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
    </div>
    <div className={styles.tableHead}><span>PROJECT</span><span>PLATFORM</span><span>STATUS</span></div>
    {list.length===0?<div className={styles.empty}>Nothing matches this view. Adjust filters or register another project.</div>:
     <div className={styles.table}>{list.map((p,index)=><div key={p.key}>
      <button type="button" className={selected===p.key?styles.projectActive:styles.projectRow} aria-expanded={selected===p.key} onClick={()=>setSelected(selected===p.key?"":p.key)}>
       <span className={styles.projectIdentity}><span className={styles.projectAvatar}>{p.name.slice(0,2).toUpperCase()}</span><span><strong>{p.name}</strong><small>{p.repository||p.type}</small></span></span>
       <span className={styles.platform}>{p.linked?"Coolify":"Migration queue"}</span>
       <span className={styles.projectStatus}><i className={p.linked&&p.health==="running"?styles.statusGood:p.health==="attention"?styles.statusWarn:styles.statusIdle}/>{stateLabel(p.health,p.linked)} <b>↗</b></span>
      </button>
      {selected===p.key&&<div className={styles.expanded}>
       <p>{p.linked?"Matched to a real Coolify inventory record. Status reflects the provider, not verified customer health.":"Planning only: no hosting on our private servers has been confirmed."}</p>
       <div><span>REPO <strong>{p.repository||"Unverified"}</strong></span><span>APPLICATIONS <strong>{p.liveApplications.length}</strong></span>
        <span>WORKLOAD RISK <strong>{p.risk||"Not assessed"}</strong></span></div>
       <div className={styles.expandedActions}><button type="button" onClick={onOpenDeploy}>Plan this deployment ↗</button>{p.category==="local"&&<button type="button" onClick={removeLocal}>Remove local entry</button>}</div>
      </div>}
     </div>)}</div>}
    <footer className={styles.projectFooter}>Source: {appsObserved?"Connected Coolify + local portfolio":"Migration catalog + local registry. No live hosting assumed."}</footer>
   </section>
   <aside className={styles.right}>
    <section className={styles.nextStep}><span className={styles.sectionEyebrow}>NEXT MILESTONE</span><h3>From code to <em>our cloud.</em></h3>
     <p>First we prove a safe private deployment and a recoverable database. Then we switch live projects — one by one.</p>
     <div className={styles.timeline}>
      <div><i/> <span><strong>Control plane</strong><small>Source in GitHub · build pending</small></span><b>01</b></div>
      <div><i/> <span><strong>Secure VPS + Coolify</strong><small>Waiting for purchased server</small></span><b>02</b></div>
      <div><i/> <span><strong>Staging + recovery test</strong><small>No verified cutover yet</small></span><b>03</b></div>
     </div>
     <button type="button" onClick={onOpenSetup}>See deployment prerequisites <span>↗</span></button>
    </section>
    <section className={styles.statusPanel}><div><span className={styles.sectionEyebrow}>INFRASTRUCTURE SIGNAL</span><span className={connected?styles.signalOn:styles.signalOff}/></div>
     <strong>{connected?"Coolify connected":data.mode==="degraded"?"Partial connection":"Awaiting first node"}</strong>
     <p>{connected?"Live server/app inventory is available. Check each status before migration.":"No VPS has been provisioned. Existing Vercel/Railway/Supabase services remain untouched."}</p>
     <button type="button" onClick={onRefresh} disabled={loading}>{loading?"Checking…":"Refresh status ↻"}</button>
    </section>
   </aside>
  </div>
  <footer className={styles.bottom}><span>MARKARIAN CLOUD / OWNER EDITION</span><span>PRIVATE INFRASTRUCTURE · BUILD IN PROGRESS</span></footer>
 </div>;
}
