"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./cloud.module.css";
import MigrationLab from "./migration-lab";
import CloudFoundation from "./foundation";
import MissionControl from "./mission-control";
import CapacityPanel from "./capacity-panel";
import ProviderConsole from "./provider-console";
import CloudStudio from "./studio";
import OwnedInfrastructure from "./owned-infrastructure";
import TelemetryPanel from "./telemetry-panel";
import RecoveryPanel from "./recovery-panel";
import DeployEngine from "./deploy-engine";
import {cloudCatalog} from "@/lib/cloud/catalog";

type App={uuid:string;name:string;status:string;domain:string;gitRepository:string;gitBranch:string;updatedAt:string};
type Server={uuid:string;name:string;ip:string;status:string;description:string};
type Deployment={uuid:string;applicationName:string;status:string;commit:string;createdAt:string;serverName:string};
type Project={uuid:string;name:string;description:string};
type Snapshot={mode:"setup"|"connected"|"degraded";updatedAt:string;applications:App[];servers:Server[];deployments:Deployment[];projects:Project[];errors:string[];message?:string;sources?:{applications:boolean;servers:boolean;deployments:boolean;projects:boolean}};
type Section="command"|"project-center"|"data-center"|"agent-watch"|"capacity"|"owned"|"deploy-engine"|"recovery"|"telemetry"|"studio"|"overview"|"applications"|"deployments"|"servers"|"migration"|"foundation"|"providers"|"setup";
const empty:Snapshot={mode:"setup",updatedAt:"",applications:[],servers:[],deployments:[],projects:[],errors:[],sources:{applications:false,servers:false,deployments:false,projects:false}};
const sections:{id:Section;label:string;symbol:string}[]=[
 {id:"command",label:"Mission Control",symbol:"✦"},
 {id:"project-center",label:"All Projects",symbol:"▦"},
 {id:"data-center",label:"Data & Domains",symbol:"▤"},
 {id:"agent-watch",label:"Agent Watch",symbol:"✳"},
 {id:"capacity",label:"Capacity Planner",symbol:"▥"},
 {id:"owned",label:"Our Infrastructure",symbol:"▤"},
 {id:"deploy-engine",label:"Deploy Engine",symbol:"⇧"},
 {id:"telemetry",label:"Observability",symbol:"⌁"},
 {id:"recovery",label:"Recovery Center",symbol:"⇣"},
 {id:"studio",label:"Cloud Studio",symbol:"▧"},
 {id:"overview",label:"Overview",symbol:"◫"},
 {id:"applications",label:"Applications",symbol:"▦"},
 {id:"deployments",label:"Deployments",symbol:"↗"},
 {id:"servers",label:"Servers",symbol:"▤"},
 {id:"migration",label:"Migration Lab",symbol:"◇"},
 {id:"foundation",label:"Cloud Foundation",symbol:"✦"},
 {id:"providers",label:"Provider Bridge",symbol:"↔"},
 {id:"setup",label:"Infrastructure setup",symbol:"⚙"}
];
const migration=cloudCatalog.map(project=>({name:project.name,type:project.type,repo:project.repository||"Repository not verified"}));
function stateTone(status:string){
 const value=status.toLowerCase();
 if(/error|failed|stopped|exited|unhealthy|unreachable|not ready/.test(value))return styles.bad;
 if(/running|finished|success|healthy/.test(value))return styles.good;
 return styles.pending;
}
function date(value:string){
 if(!value)return "—";
 const d=new Date(value);
 return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);
}
export default function MarkarianCloud(){
 const [section,setSection]=useState<Section>("command");
 const [showTools,setShowTools]=useState(false);
 const [data,setData]=useState<Snapshot>(empty);
 const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState("");
 const refresh=useCallback(async()=>{
   setLoading(true);
   try{
     const response=await fetch("/api/cloud",{cache:"no-store"});
     const json=await response.json() as Snapshot & {error?:string};
     if(!response.ok)throw new Error(json.error||"Could not read cloud status");
     setData(json);
   }catch(error){
     setData({...empty,errors:[error instanceof Error?error.message:"Connection unavailable"]});
   }finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const query=filter.trim().toLowerCase();
 const apps=useMemo(()=>data.applications.filter(a=>(a.name+" "+a.gitRepository+" "+a.domain).toLowerCase().includes(query)),[data.applications,query]);
 const isLive=data.mode==="connected";
 return <main className={styles.cloud}>
  <aside className={styles.sidebar}>
   <a className={styles.brand} href="/cloud" aria-label="Markarian Cloud home">
    <span className={styles.brandGlyph}>M<span>✦</span></span>
    <span><strong>MARKARIAN</strong><small>CLOUD / PRIVATE PaaS</small></span>
   </a>
   <div className={styles.navLabel}>CONTROL ROOM</div>
   <nav aria-label="Cloud navigation">
    {sections.filter(item=>["command","project-center","data-center","agent-watch","owned","deploy-engine","capacity","recovery","telemetry","studio"].includes(item.id)).map(item=><button key={item.id} type="button" onClick={()=>{setSection(item.id);setFilter("");}} aria-current={section===item.id?"page":undefined} className={section===item.id?styles.navActive:styles.navButton}>
     <span className={styles.navIcon}>{item.symbol}</span>{item.label}
    </button>)}
    <div className={styles.navDivider}/>
    <button className={styles.navSecondaryToggle} type="button" onClick={()=>setShowTools(x=>!x)} aria-expanded={showTools}>
     ALL SERVICES <span>{showTools?"−":"+"}</span>
    </button>
    {showTools&&sections.filter(item=>!["command","project-center","data-center","agent-watch","owned","deploy-engine","capacity","recovery","telemetry","studio"].includes(item.id)).map(item=><button key={item.id} type="button" onClick={()=>{setSection(item.id);setFilter("");}} aria-current={section===item.id?"page":undefined} className={section===item.id?styles.navActive:styles.navButton}>
     <span className={styles.navIcon}>{item.symbol}</span>{item.label}
    </button>)}
   </nav>
   <div className={styles.sideBottom}>
    <div className={styles.connectionMark}><span className={isLive?styles.dotOnline:styles.dotOffline}/>{data.mode==="connected"?"Coolify connected":data.mode==="degraded"?"Partial connection":"Awaiting infrastructure"}</div>
    <p>No dedicated server is required to design and prepare your cloud workspace.</p>
    <a href="/motion">↗ Motion Studio</a>
    <a href="/">↗ Distribution OS</a>
   </div>
  </aside>
  <section className={styles.content}>
   <header className={styles.topbar}>
    <div className={styles.breadcrumb}>MARGARYAN LABS <span>/</span> CLOUD <span>/</span> {section.toUpperCase()}</div>
    <div className={styles.topActions}>
     <span className={styles.environment}>{data.mode==="connected"?"● CONNECTED":"○ PRIVATE CLOUD · PREPARATION"}</span>
     <button type="button" className={styles.refresh} onClick={()=>void refresh()} disabled={loading}>{loading?"Checking…":"↻ Refresh"}</button>
    </div>
   </header>
   <div className={styles.body}>
    {["command","project-center","data-center","agent-watch"].includes(section)&&<MissionControl key={section} startView={section==="project-center"?"projects":section==="data-center"?"data":section==="agent-watch"?"agents":"fleet"} data={data} loading={loading} onRefresh={()=>void refresh()} onOpenSetup={()=>setSection("setup")} onOpenOwned={()=>setSection("owned")} onOpenDeploy={()=>setSection("deploy-engine")} onOpenRecovery={()=>setSection("recovery")} onOpenStudio={()=>setSection("studio")} onOpenTelemetry={()=>setSection("telemetry")}/>}
    {section==="capacity"&&<CapacityPanel onDeploy={()=>setSection("deploy-engine")} onSetup={()=>setSection("setup")}/>}
    {section==="overview"&&<>
     <section className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}>INFRASTRUCTURE COMMAND CENTER · V1</span>
       <h1>One cloud.<br/><em>Every ambition.</em></h1>
       <p>A private deployment control plane for Margaryan Labs. Connect your own server when you are ready. Your portfolio stays independent from hosting vendors.</p>
       <div className={styles.heroActions}><button type="button" onClick={()=>setSection("setup")} className={styles.primary}>Configure infrastructure <span>↗</span></button><button type="button" className={styles.secondary} onClick={()=>setSection("migration")}>Plan migration →</button></div>
      </div>
      <div className={styles.orbit} aria-hidden="true"><div className={styles.orbitOuter}/><div className={styles.orbitMid}/><div className={styles.orbitCore}>M</div><span className={styles.orbitPointA}/><span className={styles.orbitPointB}/><span className={styles.orbitPointC}/></div>
     </section>
     <section className={styles.metrics} aria-label="Current infrastructure metrics">
      {[{label:"LIVE APPLICATIONS",value:isLive?data.applications.length:"—",info:isLive?"Reported by Coolify":"Not connected"},
        {label:"MANAGED SERVERS",value:isLive?data.servers.length:"—",info:isLive?"Coolify inventory":"Awaiting VPS"},
        {label:"DEPLOYMENTS",value:isLive?data.deployments.length:"—",info:isLive?"Currently running":"No deployment data"},
        {label:"ACTIVE PROJECTS",value:isLive?data.projects.length:"—",info:isLive?"Coolify projects":"Planning stage"}
      ].map(m=><article key={m.label} className={styles.metric}><span>{m.label}</span><strong>{m.value}</strong><small>{m.info}</small></article>)}
     </section>
     <div className={styles.twoColumns}>
      <section className={styles.panel}>
       <div className={styles.panelTitle}><div><span className={styles.eyebrow}>PORTFOLIO</span><h2>Migration roadmap</h2></div><span className={styles.hint}>PLANNED · NOT DEPLOYED</span></div>
       <p className={styles.panelDescription}>Suggested migration order. These entries are planning references, not live infrastructure records.</p>
       <div className={styles.projectList}>{migration.slice(0,5).map((item,index)=><div key={item.name} className={styles.projectRow}>
        <span className={styles.projectIndex}>{String(index+1).padStart(2,"0")}</span><span className={styles.projectMain}><strong>{item.name}</strong><small>{item.type}</small></span><span className={styles.planned}>To migrate</span>
       </div>)}</div>
       <button type="button" className={styles.textAction} onClick={()=>setSection("migration")}>Open Migration Lab →</button>
      </section>
      <section className={styles.panel}>
       <div className={styles.panelTitle}><div><span className={styles.eyebrow}>SYSTEM STATUS</span><h2>Infrastructure readiness</h2></div><span className={isLive?styles.connectedBadge:styles.setupBadge}>{isLive?"LIVE":"SETUP"}</span></div>
       <div className={styles.readiness}><span className={styles.readinessTrack}><span style={{width:isLive?"100%":"25%"}}/></span><strong>{isLive?"Connected to Coolify":"Platform source prepared"}</strong><p>{isLive?"Live inventory is loaded directly from Coolify using a server-side, read-only token.":"The management UI is available. Purchase a VPS and install Coolify to enable live server monitoring."}</p></div>
       <div className={styles.checklist}><div><b>01</b><span>Control plane UI</span><strong>READY</strong></div><div><b>02</b><span>VPS / Coolify</span><em>{isLive?"CONFIGURED":"PENDING"}</em></div><div><b>03</b><span>Read-only API link</span><em>{isLive?"CONNECTED":"PENDING"}</em></div><div><b>04</b><span>Production migration</span><em>NOT STARTED</em></div></div>
       <button type="button" className={styles.textAction} onClick={()=>setSection("setup")}>View setup guide →</button>
      </section>
     </div>
    </>}
    {section==="applications"&&<section className={styles.panel}>
      <div className={styles.panelTitle}><div><span className={styles.eyebrow}>GIT TO DEPLOY · PLANNING</span><h1>Applications</h1></div><span className={styles.hint}>{data.applications.length} LIVE RECORDS</span></div>
      <p className={styles.panelDescription}>Live applications come only from the connected Coolify instance. Future migrations are shown separately.</p>
      <input className={styles.search} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search live applications…" aria-label="Search live applications"/>
      {apps.length===0?<div className={styles.empty}>{isLive?"No matching applications were returned by Coolify.":"No connected applications. Configure your VPS to see real deployments."}</div>:<div className={styles.tableWrap}><table><thead><tr><th>Application</th><th>Git source</th><th>Status</th><th>Domain</th></tr></thead><tbody>{apps.map(a=><tr key={a.uuid}><td><strong>{a.name}</strong><small>{a.uuid}</small></td><td>{a.gitRepository||"—"}<small>{a.gitBranch||"—"}</small></td><td><span className={stateTone(a.status)}>{a.status||"unknown"}</span></td><td>{a.domain||"—"}</td></tr>)}</tbody></table></div>}
      <div className={styles.divider}/><div className={styles.panelTitle}><div><span className={styles.eyebrow}>NEXT MIGRATIONS</span><h2>Margaryan Labs portfolio</h2></div><span className={styles.hint}>PLANNING REFERENCES</span></div>
      <div className={styles.projectList}>{migration.map(m=><div key={m.name} className={styles.projectRow}><span className={styles.projectIndex}>◇</span><span className={styles.projectMain}><strong>{m.name}</strong><small>{m.repo}</small></span><span className={styles.planned}>Not migrated</span></div>)}</div>
     </section>}
    {section==="migration"&&<MigrationLab/>}
    {section==="foundation"&&<CloudFoundation/>}
    {section==="providers"&&<ProviderConsole/>}
    {section==="studio"&&<CloudStudio data={data} onOpenSetup={()=>setSection("setup")}/>}
    {section==="telemetry"&&<TelemetryPanel/>}
    {section==="recovery"&&<RecoveryPanel/>}
    {section==="deploy-engine"&&<DeployEngine onOpenSetup={()=>setSection("setup")}/>}
    {section==="owned"&&<OwnedInfrastructure data={data} onOpenSetup={()=>setSection("setup")} onOpenStudio={()=>setSection("studio")} onOpenMigration={()=>setSection("migration")}/>}
    {section==="deployments"&&<section className={styles.panel}>
      <div className={styles.panelTitle}><div><span className={styles.eyebrow}>DEPLOYMENT ACTIVITY</span><h1>Deployments</h1></div><span className={styles.hint}>READ ONLY</span></div>
      <p className={styles.panelDescription}>Current running deployment records provided by Coolify. Build, rollback and trigger controls will be added after server authorization is configured.</p>
      {data.deployments.length===0?<div className={styles.empty}>No live deployment records available.</div>:<div className={styles.tableWrap}><table><thead><tr><th>Application</th><th>Status</th><th>Revision</th><th>Server</th><th>Created</th></tr></thead><tbody>{data.deployments.map(d=><tr key={d.uuid}><td><strong>{d.applicationName||"Unnamed"}</strong><small>{d.uuid}</small></td><td><span className={stateTone(d.status)}>{d.status||"unknown"}</span></td><td>{d.commit.slice(0,8)||"—"}</td><td>{d.serverName||"—"}</td><td>{date(d.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>}
    {section==="servers"&&<section className={styles.panel}>
      <div className={styles.panelTitle}><div><span className={styles.eyebrow}>COMPUTE FLEET</span><h1>Servers</h1></div><span className={styles.hint}>OWNED INFRASTRUCTURE</span></div>
      <p className={styles.panelDescription}>Server status comes from Coolify, never from a generated demonstration.</p>
      {data.servers.length===0?<div className={styles.empty}>No server connected yet. You can add your own VPS after installation.</div>:<div className={styles.serverGrid}>{data.servers.map(s=><article key={s.uuid} className={styles.serverCard}><div className={styles.serverSymbol}>▤</div><h3>{s.name}</h3><p>{s.description||"Self-managed server"}</p><div className={styles.serverDetail}><span>{s.ip||"IP not reported"}</span><span className={stateTone(s.status)}>{s.status||"unknown"}</span></div></article>)}</div>}
    </section>}
    {section==="setup"&&<section className={styles.panel}>
      <div className={styles.panelTitle}><div><span className={styles.eyebrow}>OWNER-OPERATED CLOUD</span><h1>Connect your own server</h1></div><span className={isLive?styles.connectedBadge:styles.setupBadge}>{isLive?"CONNECTED":"NOT CONNECTED"}</span></div>
      <p className={styles.panelDescription}>No VPS is purchased or configured by this application. Follow these steps when you have a server.</p>
      <div className={styles.setupSteps}>
       <article><span>01</span><div><h3>Provision your VPS</h3><p>Choose a Linux server, configure SSH keys, firewall, backups and DNS. Use a separate host or isolated deployment for critical workloads.</p></div></article>
       <article><span>02</span><div><h3>Install Coolify</h3><p>Follow the official installation instructions at <a href="https://coolify.io/docs/get-started/installation" target="_blank" rel="noreferrer">coolify.io/docs ↗</a>. Secure the administrative dashboard with HTTPS.</p></div></article>
       <article><span>03</span><div><h3>Create a read-only API token</h3><p>Enable Coolify API access and create a token scoped for inventory reading. Never expose the token in client-side code or commit it to GitHub.</p></div></article>
       <article><span>04</span><div><h3>Configure the deployment environment</h3><p>Set the following server-side variables on the Distribution instance (not in the browser):</p><code>CLOUD_COOLIFY_URL=https://cloud.your-domain.com</code><code>CLOUD_COOLIFY_TOKEN=YOUR_SERVER_SIDE_TOKEN</code><code>DISTRIBUTION_BASIC_USER=YOUR_OPERATOR_USER</code><code>DISTRIBUTION_BASIC_PASSWORD=STRONG_UNIQUE_PASSWORD</code></div></article>
       <article><span>05</span><div><h3>Deploy a disposable pilot first</h3><p>Use our staging Compose pilot from <b>deploy/cloud/pilot/compose.yaml</b>. In Coolify choose a Git-based Docker Compose application, base directory <b>/deploy/cloud/pilot</b>, Compose location <b>compose.yaml</b>, and configure your test domain to route to internal port 8080. The pilot has no production dependencies or persistent storage.</p></div></article>
       <article><span>06</span><div><h3>Refresh & verify before migrating</h3><p>When Cloud reports a connected status, import one non-critical test application and verify deploy, HTTPS, databases, rollback and backups.</p></div></article>
      </div>
      <div className={styles.securityNote}><strong>Safety boundary</strong><p>Cloud V1 offers inventory monitoring only. No server provisioning, destructive actions, database migration or live deployment is performed from this screen.</p></div>
     </section>}
    {data.errors.length>0&&<div role="status" className={styles.alert}><strong>Connection notice</strong><span>{data.errors.join(" · ")}</span></div>}
    <footer className={styles.footer}><span>MARKARIAN CLOUD / CONTROL PLANE V1</span><span>{data.updatedAt?"Last checked "+date(data.updatedAt):"Awaiting a Coolify connection"} · Owner-managed infrastructure</span></footer>
   </div>
  </section>
 </main>;
}
