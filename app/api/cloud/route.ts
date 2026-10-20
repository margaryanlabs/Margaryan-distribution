import {NextResponse} from "next/server";

export const dynamic="force-dynamic";
export const runtime="nodejs";

type Raw=Record<string,unknown>;
const str=(value:unknown)=>typeof value==="string"?value:"";
const arr=(value:unknown):Raw[]=>Array.isArray(value)?value.filter((x):x is Raw=>!!x&&typeof x==="object"&&!Array.isArray(x)):[];
const txt=(value:unknown)=>str(value).slice(0,250);
const urlText=(value:unknown)=>str(value).slice(0,500);
const safeError=(error:unknown)=>error instanceof Error?error.message.slice(0,180):"Upstream unavailable";

async function coolifyFetch(base:string,token:string,path:string):Promise<Raw[]>{
 const response=await fetch(base+"/api/v1/"+path,{
  method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
  cache:"no-store",signal:AbortSignal.timeout(8000),redirect:"error"
 });
 if(!response.ok)throw new Error("Coolify "+path+" returned HTTP "+response.status);
 const json:unknown=await response.json();
 if(!Array.isArray(json))throw new Error("Coolify "+path+" returned an unexpected response");
 return arr(json).slice(0,500);
}
export async function GET(){
 const headers={"Cache-Control":"private, no-store, max-age=0"};
 const address=process.env.CLOUD_COOLIFY_URL?.trim();
 const token=process.env.CLOUD_COOLIFY_TOKEN?.trim();
 const now=new Date().toISOString();
 const blank={applications:[],servers:[],deployments:[],projects:[]};
 if(!address||!token)return NextResponse.json({mode:"setup",updatedAt:now,...blank,errors:[],
  message:"Set CLOUD_COOLIFY_URL and CLOUD_COOLIFY_TOKEN after purchasing a server."},{headers});
 let base:string;
 try{
  const parsed=new URL(address);
  if((parsed.protocol!=="https:"&&!(parsed.protocol==="http:"&&["localhost","127.0.0.1"].includes(parsed.hostname)))||
    parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=="/")throw Error();
  base=parsed.origin;
 }catch{
  return NextResponse.json({mode:"degraded",updatedAt:now,...blank,errors:["Invalid server-side CLOUD_COOLIFY_URL. Use HTTPS origin only."]},{status:502,headers});
 }
 const endpoints=["applications","servers","deployments","projects"] as const;
 const results=await Promise.allSettled(endpoints.map(path=>coolifyFetch(base,token,path)));
 const errors:string[]=[];
 const records=results.map((result,index)=>{
  if(result.status==="fulfilled")return result.value;
  errors.push(endpoints[index]+": "+safeError(result.reason));
  return [] as Raw[];
 });
 const applications=records[0].map(a=>({
  uuid:txt(a.uuid),name:txt(a.name),status:txt(a.status),
  domain:urlText(a.fqdn),gitRepository:txt(a.git_repository),gitBranch:txt(a.git_branch),updatedAt:txt(a.updated_at)
 }));
 const servers=records[1].map(s=>({
  uuid:txt(s.uuid),name:txt(s.name),ip:txt(s.ip),status:txt(s.status),
  description:txt(s.description)
 }));
 const deployments=records[2].map(d=>({
  uuid:txt(d.deployment_uuid),applicationName:txt(d.application_name),
  status:txt(d.status),commit:txt(d.commit),serverName:txt(d.server_name),
  createdAt:txt(d.created_at)
 }));
 const projects=records[3].map(p=>({
  uuid:txt(p.uuid),name:txt(p.name),description:txt(p.description)
 }));
 return NextResponse.json({mode:errors.length?"degraded":"connected",updatedAt:now,
  applications,servers,deployments,projects,errors},{headers});
}
