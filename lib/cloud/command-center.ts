import {cloudCatalog} from "./catalog";

export type CloudApp={uuid:string;name:string;status:string;domain:string;gitRepository:string;gitBranch:string;updatedAt:string};
export type CloudServer={uuid:string;name:string;ip:string;status:string;description:string};
export type CloudDeployment={uuid:string;applicationName:string;status:string;commit:string;createdAt:string;serverName:string};
export type CloudProject={uuid:string;name:string;description:string};
export type CloudSources={applications:boolean;servers:boolean;deployments:boolean;projects:boolean};
export type CloudSnapshot={
 mode:"setup"|"connected"|"degraded";
 updatedAt:string;applications:CloudApp[];servers:CloudServer[];deployments:CloudDeployment[];
 projects:CloudProject[];errors:string[];sources?:CloudSources;message?:string
};
export const emptyCloudSnapshot:CloudSnapshot={
 mode:"setup",updatedAt:"",applications:[],servers:[],deployments:[],projects:[],
 errors:[],sources:{applications:false,servers:false,deployments:false,projects:false}
};
export type Health="running"|"attention"|"unknown";
export function appHealth(status:string):Health{
 const value=status.trim().toLowerCase();
 if(/failed|error|stopped|exited|unhealthy|unreachable|not ready|degraded/.test(value))return "attention";
 if(/running|healthy|finished|success/.test(value))return "running";
 return "unknown";
}
/** Accept exact GitHub owner/repo path and authenticated GitHub URL forms only. */
export function githubRepository(value:string):string|null{
 const raw=value.trim();
 let match=raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
 if(!match)match=raw.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?\/?$/i);
 if(!match)match=raw.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\.git)?$/i);
 if(!match)return null;
 return (match[1]+"/"+match[2].replace(/\.git$/i,"")).toLowerCase();
}
export type PortfolioItem={
 key:string;name:string;type:string;repository:string|null;
 category:"catalog"|"discovered";linked:boolean;liveApplications:CloudApp[];
 risk:"standard"|"high"|"critical"|null;health:Health;
};
export function buildPortfolio(snapshot:CloudSnapshot):PortfolioItem[]{
 const apps=snapshot.sources?.applications===false?[]:snapshot.applications;
 const seen=new Set<string>();
 const plans=cloudCatalog.map((project):PortfolioItem=>{
  const repo=project.repository?githubRepository(project.repository):null;
  const linked=repo?apps.filter(app=>githubRepository(app.gitRepository)===repo):[];
  linked.forEach(a=>seen.add(a.uuid));
  const health:Health=linked.some(a=>appHealth(a.status)==="attention")?"attention":
   linked.length&&linked.every(a=>appHealth(a.status)==="running")?"running":"unknown";
  return {key:"plan:"+project.id,name:project.name,type:project.type,
   repository:project.repository,category:"catalog",linked:linked.length>0,
   liveApplications:linked,risk:project.level,health};
 });
 const other=apps.filter(app=>!seen.has(app.uuid)).map((app,index):PortfolioItem=>({
  key:"discovered:"+(app.uuid||String(index)),name:app.name||"Unnamed Coolify app",
  type:"Discovered in Coolify",repository:githubRepository(app.gitRepository),
  category:"discovered",linked:true,liveApplications:[app],risk:null,health:appHealth(app.status)
 }));
 return [...plans,...other];
}
export function infrastructureNotice(snapshot:CloudSnapshot){
 if(snapshot.mode==="setup")return "No private VPS or Coolify inventory is configured.";
 if(snapshot.mode==="degraded")return "Some Coolify sources are unavailable. Inventory may be incomplete.";
 return "Live records are sourced from the connected Coolify instance.";
}
