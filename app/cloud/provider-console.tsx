"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import styles from "./provider-console.module.css";

type Item={id:string;name:string;kind:string;status:string;detail:string};
type Provider={id:"vercel"|"railway"|"supabase";name:string;state:"not_configured"|"connected"|"error";total:number;limited:boolean;notice:string;resources:Item[]};
type Snapshot={updatedAt:string;providers:Provider[]};
const ids=["vercel","railway","supabase"] as const;
const defaults:Snapshot={updatedAt:"",providers:ids.map(id=>({
 id,name:id==="supabase"?"Supabase Cloud":id==="railway"?"Railway":"Vercel",
 state:"not_configured",total:0,limited:false,notice:"Not connected.",resources:[]
}))};
const envNames:Record<Provider["id"],string>={
 vercel:"CLOUD_VERCEL_TOKEN",railway:"CLOUD_RAILWAY_TOKEN",supabase:"CLOUD_SUPABASE_PAT"
};
export default function ProviderConsole({compact=false,coolifyMode}:{compact?:boolean;coolifyMode?:"setup"|"connected"|"degraded"}){
 const [data,setData]=useState<Snapshot>(defaults);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 const [selected,setSelected]=useState<Provider["id"]>("vercel");
 const [query,setQuery]=useState("");
 const refresh=useCallback(async()=>{
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/cloud/providers",{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)throw Error("Provider inventory is not accessible.");
   const value=await response.json() as Snapshot;
   if(!Array.isArray(value.providers)||value.providers.length!==3)throw Error("Unexpected provider response.");
   setData(value);
  }catch(e){setData(defaults);setError(e instanceof Error?e.message:"Provider inventory unavailable.");}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 const current=data.providers.find(p=>p.id===selected)||data.providers[0];
 const results=useMemo(()=>current.resources.filter(x=>
  (x.name+" "+x.kind+" "+x.status+" "+x.detail).toLowerCase().includes(query.toLowerCase().trim())
 ),[current,query]);
 const status=(state:Provider["state"])=>state==="connected"?"CONNECTED":state==="error"?"ATTENTION":"NOT CONFIGURED";
 if(compact)return <section className={styles.mini} aria-label="Connected legacy providers">
  <div className={styles.miniHead}><span>PLATFORM CONNECTIONS</span><small>{busy?"Checking…":error?"Source unavailable":"Provider inventories only"}</small></div>
  <div className={styles.miniGrid}>
   <div className={styles.miniCard}><strong>Coolify</strong><small>{coolifyMode==="connected"?"Connected":coolifyMode==="degraded"?"Degraded":"Awaiting VPS"}</small><i className={coolifyMode==="connected"?styles.dotGood:coolifyMode==="degraded"?styles.dotWarn:styles.dotOff}/></div>
   {data.providers.map(p=><div key={p.id} className={styles.miniCard}><strong>{p.name}</strong><small>{busy?"Checking…":p.state==="connected"?p.total+" projects":status(p.state)}</small><i className={p.state==="connected"?styles.dotGood:p.state==="error"?styles.dotWarn:styles.dotOff}/></div>)}
  </div>
  {error&&<p className={styles.notice}>{error}</p>}
 </section>;
 return <section className={styles.root}>
  <header className={styles.hero}>
   <div><span className={styles.kicker}>LEGACY PLATFORM BRIDGE · READ ONLY</span><h1>One view.<em> Every provider.</em></h1>
   <p>See current Vercel, Railway and managed Supabase project inventories here while migrating to our own infrastructure. Credentials are stored on the server, never entered in this browser.</p></div>
   <button type="button" className={styles.refresh} onClick={()=>void refresh()} disabled={busy}>{busy?"Checking…":"↻ Refresh providers"}</button>
  </header>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <div className={styles.grid}>
   {data.providers.map(p=><button type="button" key={p.id} onClick={()=>{setSelected(p.id);setQuery("");}} aria-pressed={p.id===selected}
    className={p.id===selected?styles.selected:styles.provider}>
    <div className={styles.providerTop}><strong>{p.name}</strong><i className={p.state==="connected"?styles.dotGood:p.state==="error"?styles.dotWarn:styles.dotOff}/></div>
    <span>{status(p.state)}</span><b>{busy?"—":p.state==="connected"?p.total:"—"}</b><small>discovered project records</small>
   </button>)}
  </div>
  <div className={styles.details}>
   <div className={styles.detailsHead}><div><span className={styles.kicker}>PROVIDER INVENTORY</span><h2>{current.name}</h2></div><span className={current.state==="connected"?styles.connected:styles.offline}>{status(current.state)}</span></div>
   <p className={styles.desc}>{current.notice}</p>
   {current.state!=="connected"?<div className={styles.setup}>
    <strong>{current.state==="error"?"Connection needs attention":"Connect through secure server variables"}</strong>
    <p>Set <code>{envNames[current.id]}</code> on the private Distribution deployment. Tokens are never accepted in this page. For Vercel team resources, also set <code>CLOUD_VERCEL_TEAM_ID</code>.</p>
    <p>See <code>docs/cloud/PROVIDER_BRIDGE.md</code>. Provider Bridge does not deploy code, touch databases or manage subscription payments.</p>
   </div>:<>
    <label className={styles.search}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search provider projects…" aria-label="Search provider projects"/></label>
    {current.limited&&<p className={styles.notice}>First 100 projects shown. More may exist on this provider.</p>}
    {results.length===0?<div className={styles.empty}>No project records match this search.</div>:<div className={styles.list}>{results.map((item,index)=><div className={styles.row} key={item.id||String(index)}>
     <span className={styles.index}>{String(index+1).padStart(2,"0")}</span><div><strong>{item.name}</strong><small>{item.kind} · {item.detail}</small></div><span className={styles.status}>{item.status}</span>
    </div>)}</div>}
   </>}
  </div>
  <p className={styles.footer}>Only Coolify manages our future private VPS inventory. These three providers are external migration sources, not self-hosted substitutes. Project counts are limited to retrieved results.</p>
 </section>;
}
