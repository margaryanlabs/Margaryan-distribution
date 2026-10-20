"use client";
import {useMemo,useState} from "react";
import {cloudCatalog} from "@/lib/cloud/catalog";
import {createDeployPlan,validateDeployInput,type DeployInput,type DeployEnvironment,type DeployKind} from "@/lib/cloud/deploy-plan";
import styles from "./deploy-engine.module.css";

const DEFAULT:DeployInput={name:"das-preview",repository:"margaryan-labs/das-speak-armenia",
 branch:"main",environment:"staging",kind:"node",cpu:2,memoryMB:1024,replicas:1,port:3000,
 healthPath:"/api/health",domain:""};
const kinds:{value:DeployKind;label:string}[]=[
 {value:"node",label:"Node / SSR"},{value:"nextjs",label:"Next.js"},
 {value:"static",label:"Static frontend"},{value:"worker",label:"Background worker"}];
export default function DeployEngine({onOpenSetup}:{onOpenSetup:()=>void}){
 const [input,setInput]=useState<DeployInput>(DEFAULT);
 const [feedback,setFeedback]=useState("");
 const [showJson,setShowJson]=useState(false);
 const [confirmed,setConfirmed]=useState(false);
 function update<K extends keyof DeployInput>(key:K,value:DeployInput[K]){
  setInput(p=>({...p,[key]:value}));setFeedback("");setConfirmed(false);
 }
 const errors=useMemo(()=>validateDeployInput(input),[input]);
 const plan=useMemo(()=>errors.length===0?createDeployPlan(input):null,[input,errors]);
 function fromCatalog(repo:string){
  const product=cloudCatalog.find(x=>x.repository===repo);
  if(!product)return;
  update("repository",repo);
  setInput(p=>({...p,repository:repo,name:(product.id+"-preview").slice(0,48),
    kind:product.workload==="media"||product.workload==="data"?"worker":"node",
    domain:"",environment:"staging"}));
 }
 async function copyPlan(){
  if(!plan||!confirmed)return;
  try{await navigator.clipboard.writeText(JSON.stringify(plan,null,2));setFeedback("Release manifest copied for operator review.");}
  catch{setFeedback("Clipboard unavailable; use the read-only manifest preview.");}
 }
 return <section className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.kicker}>MARKARIAN CLOUD OS / DEPLOYMENT WORKSPACE</span>
    <h1>Deploy with <em>control.</em></h1>
    <p>Create a reproducible release manifest, set resource limits and review every production gate. Nothing is deployed without a secured VPS and an approved execution service.</p></div>
   <span className={styles.lock}>PREVIEW · NO LIVE WRITES</span>
  </header>
  <div className={styles.grid}>
   <section className={styles.config}>
    <div className={styles.sectionTitle}><span className={styles.kicker}>01 / RELEASE CONFIGURATION</span><h2>New application</h2></div>
    <div className={styles.catalog}><span>START FROM OUR PORTFOLIO</span><div>{cloudCatalog.filter(x=>x.repositoryVerified&&x.repository).map(x=>
     <button key={x.id} type="button" onClick={()=>fromCatalog(x.repository!)}>{x.name}</button>)}</div></div>
    <div className={styles.form}>
     <label>Application slug<input value={input.name} onChange={e=>update("name",e.target.value)} placeholder="my-app-preview"/></label>
     <label>GitHub owner/repository<input value={input.repository} onChange={e=>update("repository",e.target.value)} placeholder="owner/repository"/></label>
     <label>Git branch<input value={input.branch} onChange={e=>update("branch",e.target.value)} placeholder="main"/></label>
     <label>Environment<select value={input.environment} onChange={e=>update("environment",e.target.value as DeployEnvironment)}>
      <option value="staging">Staging — recommended</option><option value="production">Production — approval required</option>
     </select></label>
     <label>Application type<select value={input.kind} onChange={e=>update("kind",e.target.value as DeployKind)}>
      {kinds.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select></label>
     <label>Internal port<input type="number" min={1} max={65535} value={input.port} onChange={e=>update("port",Number(e.target.value))}/></label>
     <label>CPU limit<input type="number" min={1} max={16} value={input.cpu} onChange={e=>update("cpu",Number(e.target.value))}/></label>
     <label>RAM (MB)<input type="number" min={256} max={32768} step={256} value={input.memoryMB} onChange={e=>update("memoryMB",Number(e.target.value))}/></label>
     <label>Replicas<input type="number" min={1} max={5} value={input.replicas} onChange={e=>update("replicas",Number(e.target.value))}/></label>
     <label>Healthcheck path<input value={input.healthPath} onChange={e=>update("healthPath",e.target.value)}/></label>
     <label className={styles.wide}>Custom hostname (optional)<input value={input.domain} onChange={e=>update("domain",e.target.value)} placeholder="preview.your-domain.com"/></label>
    </div>
   </section>
   <aside className={styles.review}>
    <div className={styles.sectionTitle}><span className={styles.kicker}>02 / REVIEW BEFORE EXECUTION</span><h2>Release manifest</h2></div>
    <div className={styles.status}><span>◈</span><div><strong>{errors.length?"Configuration needs changes":"Review-only release is valid"}</strong><small>No deployment, production change or secret collection</small></div></div>
    {errors.length>0?<div role="alert" className={styles.errors}>{errors.map(e=><p key={e}>{e}</p>)}</div>:
     <><div className={styles.summary}>
      <div><small>APPLICATION</small><strong>{input.name}</strong></div>
      <div><small>ENVIRONMENT</small><strong>{input.environment.toUpperCase()}</strong></div>
      <div><small>COMPUTE</small><strong>{input.cpu} CPU / {input.memoryMB} MB</strong></div>
      <div><small>REPLICAS</small><strong>{input.replicas}</strong></div>
      <div className={styles.span}><small>REPOSITORY</small><strong>{input.repository} · {input.branch}</strong></div>
     </div>
     <h3>Release safety gates</h3><ol>{plan?.releaseGates.map(g=><li key={g}>{g}</li>)}</ol></>}
    <div className={styles.buttons}>
     <button className={styles.secondary} type="button" onClick={()=>setShowJson(x=>!x)}>{showJson?"Hide":"View"} manifest</button>
     <button className={styles.primary} type="button" disabled={!plan||!confirmed} onClick={()=>void copyPlan()}>Copy review manifest ↗</button>
    </div>
    {showJson&&<pre className={styles.json}>{plan?JSON.stringify(plan,null,2):"Fix validation errors to preview a manifest."}</pre>}
    <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
     <span>I understand this is a **manual-review-only** plan, not a deployed application.</span></label>
    <p role="status" className={styles.feedback}>{feedback}</p>
    <button type="button" className={styles.setup} onClick={onOpenSetup}>Configure our own VPS →</button>
   </aside>
  </div>
  <footer className={styles.footer}>STAGING FIRST · NO DATABASE WRITES · PRIVATE SECRETS · OFFSITE BACKUPS · OPERATOR APPROVAL. This tool does not run Coolify deployments yet.</footer>
 </section>;
}
