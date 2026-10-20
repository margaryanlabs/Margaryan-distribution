import {NextResponse} from "next/server";
import {safeList,appView,serverView,deploymentView,projectView,isValidCoolifyOrigin} from "@/lib/cloud/normalize";

export const dynamic="force-dynamic";
export const runtime="nodejs";

type Raw=Record<string,unknown>;
const safeError=(error:unknown)=>error instanceof Error?error.message.slice(0,180):"Upstream unavailable";

async function coolifyFetch(base:string,token:string,path:string):Promise<Raw[]>{
 const response=await fetch(base+"/api/v1/"+path,{
  method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
  cache:"no-store",signal:AbortSignal.timeout(8000),redirect:"error"
 });
 if(!response.ok)throw new Error("Coolify "+path+" returned HTTP "+response.status);
 return safeList(await response.json());
}
export async function GET(){
 const headers={"Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff"};
 const address=process.env.CLOUD_COOLIFY_URL?.trim();
 const token=process.env.CLOUD_COOLIFY_TOKEN?.trim();
 const now=new Date().toISOString();
 const blank={applications:[],servers:[],deployments:[],projects:[]};
 if(!address||!token)return NextResponse.json({mode:"setup",updatedAt:now,...blank,errors:[],
  message:"Set CLOUD_COOLIFY_URL and CLOUD_COOLIFY_TOKEN after purchasing a server."},{headers});
 if(!isValidCoolifyOrigin(address)){
  return NextResponse.json({mode:"degraded",updatedAt:now,...blank,errors:["Invalid CLOUD_COOLIFY_URL. Configure a trusted HTTPS origin only."]},{status:502,headers});
 }
 const base=new URL(address).origin;
 const endpoints=["applications","servers","deployments","projects"] as const;
 const results=await Promise.allSettled(endpoints.map(path=>coolifyFetch(base,token,path)));
 const errors:string[]=[];
 const records=results.map((result,index)=>{
  if(result.status==="fulfilled")return result.value;
  errors.push(endpoints[index]+": "+safeError(result.reason));
  return [] as Raw[];
 });
 return NextResponse.json({mode:errors.length?"degraded":"connected",updatedAt:now,
  applications:records[0].map(appView),servers:records[1].map(serverView),
  deployments:records[2].map(deploymentView),projects:records[3].map(projectView),
  errors},{headers});
}
