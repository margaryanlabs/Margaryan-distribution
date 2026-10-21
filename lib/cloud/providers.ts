/**
 * Legacy provider inventory adapters. READ ONLY. Credentials are NEVER exported
 * to the browser, and no arbitrary URLs or caller-provided GraphQL are accepted.
 */
export type ProviderId="vercel"|"railway"|"supabase";
export type ProviderState="not_configured"|"connected"|"error";
export type Resource={id:string;name:string;kind:string;status:string;detail:string};
export type ProviderView={
 id:ProviderId;name:string;state:ProviderState;resources:Resource[];
 total:number;limited:boolean;notice:string;
};
type Json=Record<string,unknown>;
const NAME:Record<ProviderId,string>={vercel:"Vercel",railway:"Railway",supabase:"Supabase Cloud"};
const RAILWAY_QUERY="query MarkarianProjects { projects(first:100) { edges { node { id name } } pageInfo { hasNextPage } } }";
const object=(v:unknown):Json|null=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Json:null;
const arr=(v:unknown)=>Array.isArray(v)?v:[];
const str=(v:unknown)=>typeof v==="string"?v.slice(0,160):"";
const clean=(id:ProviderId, state:ProviderState, resources:Resource[]=[],limited=false,notice=""):ProviderView=>({
 id,name:NAME[id],state,resources,total:resources.length,limited,notice
});
async function readJson(url:string,token:string,options:{method:"GET"|"POST";body?:string},fetcher:typeof fetch){
 const response=await fetcher(url,{
  method:options.method,headers:{Authorization:"Bearer "+token,Accept:"application/json",
   ...(options.method==="POST"?{"Content-Type":"application/json"}:{})},
  ...(options.body?{body:options.body}:{}),cache:"no-store",
  redirect:"error",signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw Error("HTTP "+response.status);
 return response.json() as Promise<unknown>;
}
function validateTeamId(teamId:string){
 return !teamId||/^team_[A-Za-z0-9]{8,64}$/.test(teamId);
}
export async function readProvider(
 id:ProviderId,credentials:{token?:string;teamId?:string},fetcher:typeof fetch=fetch
):Promise<ProviderView>{
 const token=credentials.token?.trim()||"";
 if(!token)return clean(id,"not_configured",[],false,"Configure a private server-side access token.");
 try{
  if(id==="vercel"){
   const teamId=(credentials.teamId||"").trim();
   if(!validateTeamId(teamId))throw Error("Invalid team configuration");
   const url="https://api.vercel.com/v9/projects?limit=100"+
     (teamId?"&teamId="+encodeURIComponent(teamId):"");
   const root=object(await readJson(url,token,{method:"GET"},fetcher));
   if(!root||!Array.isArray(root.projects))throw Error("Invalid provider response");
   const list=arr(root.projects).slice(0,100).map(x=>object(x)).filter((x):x is Json=>!!x);
   const resources=list.map((p,index):Resource=>({
    id:str(p.id)||String(index),name:str(p.name)||"Unnamed project",
    kind:"Web project",status:"inventory only",detail:str(p.framework)||"Framework unreported"
   }));
   return clean(id,"connected",resources,
    arr(root.projects).length>100||Boolean(object(root.pagination)?.next),
    "Projects retrieved. An inventory record is not proof of a healthy deployment.");
  }
  if(id==="railway"){
   const raw=object(await readJson("https://backboard.railway.com/graphql/v2",token,{
    method:"POST",body:JSON.stringify({query:RAILWAY_QUERY})
   },fetcher));
   if(!raw||arr(raw.errors).length)throw Error("GraphQL error");
   const projects=object(object(raw.data)?.projects);
   if(!projects||!Array.isArray(projects.edges))throw Error("Invalid provider response");
   const resources=arr(projects.edges).slice(0,100).map(x=>object(object(x)?.node))
    .filter((p):p is Json=>!!p).map((p,index):Resource=>({
      id:str(p.id)||String(index),name:str(p.name)||"Unnamed project",
      kind:"Runtime project",status:"inventory only",detail:"Service health not queried"
    }));
   return clean(id,"connected",resources,
    Boolean(object(projects.pageInfo)?.hasNextPage),"Projects retrieved using a fixed, read-only GraphQL query.");
  }
  const root=await readJson("https://api.supabase.com/v1/projects",token,{method:"GET"},fetcher);
  if(!Array.isArray(root))throw Error("Invalid provider response");
  const resources=arr(root).slice(0,100).map(x=>object(x)).filter((p):p is Json=>!!p)
   .map((p,index):Resource=>({
    id:str(p.ref)||str(p.id)||String(index),name:str(p.name)||"Unnamed project",
    kind:"Managed data project",status:str(p.status)||"unknown",detail:str(p.region)||"Region not reported"
   }));
  return clean(id,"connected",resources,root.length>100,
   "Cloud projects retrieved. This is NOT the self-hosted Supabase database status.");
 }catch(error){
  // Deliberately suppress upstream body, URLs, request headers and token values.
  const code=error instanceof Error&&/^HTTP (401|403|429|5[0-9]{2})$/.test(error.message)
   ?error.message:"Provider request unsuccessful";
  return clean(id,"error",[],false,code+". Check credential scope, provider limits or connectivity.");
 }
}
export async function getProviderOverview(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch){
 const configs=[
  ["vercel",{token:env.CLOUD_VERCEL_TOKEN,teamId:env.CLOUD_VERCEL_TEAM_ID}],
  ["railway",{token:env.CLOUD_RAILWAY_TOKEN}],
  ["supabase",{token:env.CLOUD_SUPABASE_PAT}]
 ] as const;
 const outcomes=await Promise.all(configs.map(([id,credential])=>readProvider(id,credential,fetcher)));
 return {updatedAt:new Date().toISOString(),providers:outcomes};
}
