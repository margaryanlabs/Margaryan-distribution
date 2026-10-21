import type {CloudSnapshot} from "./command-center";
function appHealth(status:string):"running"|"attention"|"unknown"{
 const value=status.trim().toLowerCase();
 if(/failed|error|stopped|exited|unhealthy|unreachable|not ready|degraded/.test(value))return "attention";
 if(/running|healthy|finished|success/.test(value))return "running";
 return "unknown";
}
export type Signal={id:string;severity:"critical"|"warning"|"info";area:"compute"|"deploy"|"connection"|"data";title:string;detail:string;source:string};
export type ObservedHealth={online:number;attention:number;unknown:number;observed:number|null;signals:Signal[]};
export function healthSignals(snapshot:CloudSnapshot,nowMs:number=Date.now()):ObservedHealth{
 const signals:Signal[]=[];
 const observed=snapshot.sources?.applications===true?snapshot.applications.length:null;
 let online=0,attention=0,unknown=0;
 if(snapshot.sources?.applications){
  for(const app of snapshot.applications){
   const s=appHealth(app.status);
   if(s==="running")online++;else if(s==="attention"){
    attention++;
    signals.push({id:"app:"+app.uuid,severity:"critical",area:"deploy",title:app.name||"Application requires attention",
     detail:"Coolify reported application status: "+(app.status||"unknown"),source:"Coolify application"});
   }else unknown++;
  }
 }
 if(snapshot.sources?.servers){
  for(const server of snapshot.servers){
   const state=appHealth(server.status);
   if(state==="attention")signals.push({id:"server:"+server.uuid,severity:"critical",area:"compute",
    title:server.name||"Server needs attention",detail:"Coolify reported server status: "+server.status,source:"Coolify server"});
   if(state==="unknown")signals.push({id:"server-unknown:"+server.uuid,severity:"warning",area:"compute",
    title:(server.name||"Server")+" is unverified",detail:"No reliable health signal from Coolify.",source:"Coolify server"});
  }
 }
 if(snapshot.sources?.deployments){
  for(const deployment of snapshot.deployments.slice(0,60)){
   const created=Date.parse(deployment.createdAt);
   const ageMs=nowMs-created;
   // Historical failures are not current outages: require a valid timestamp within 24h.
   if(Number.isFinite(created)&&ageMs>=0&&ageMs<=86_400_000&&appHealth(deployment.status)==="attention")signals.push({id:"deploy:"+deployment.uuid,
    severity:"warning",area:"deploy",title:deployment.applicationName||"Deployment failure",
    detail:"Deployment status: "+deployment.status,source:"Coolify deployment"});
  }
 }
 if(snapshot.mode==="degraded"){
  signals.push({id:"source:partial",severity:"warning",area:"connection",title:"Inventory partially unavailable",
   detail:snapshot.errors.length?snapshot.errors.join("; ").slice(0,240):"One or more Coolify sources failed.",source:"Coolify API"});
 }
 if(snapshot.mode==="setup"){
  signals.push({id:"source:setup",severity:"info",area:"connection",title:"Own hosting not connected",
   detail:"Configure Coolify on our VPS to enable live infrastructure monitoring.",source:"Cloud configuration"});
 }
 return {online,attention,unknown,observed,signals:signals.slice(0,40)};
}
export function domainRecords(snapshot:CloudSnapshot){
 if(!snapshot.sources?.applications)return [] as {id:string;app:string;host:string;configured:boolean}[];
 const rows:{id:string;app:string;host:string;configured:boolean}[]=[];
 for(const app of snapshot.applications){
  for(const input of app.domain.split(",").slice(0,10)){
   const text=input.trim();if(!text)continue;
   try{
    const u=new URL(text.startsWith("http")?text:"https://"+text);
    if((u.protocol!=="https:"&&u.protocol!=="http:")||!u.hostname||u.username||u.password)continue;
    rows.push({id:app.uuid+":"+u.hostname,app:app.name,host:u.hostname,configured:true});
   }catch{continue;}
  }
 }
 return rows.slice(0,100);
}
