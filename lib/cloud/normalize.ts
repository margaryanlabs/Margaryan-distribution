/**
 * Coolify REST response normalizers. Keep this the ONLY surface where
 * third-party records are translated to browser-visible data.
 *
 * No upstream raw object or environment variables may be forwarded.
 */
type Raw=Record<string,unknown>;
const str=(v:unknown)=>typeof v==="string"?v:"";
const text=(v:unknown)=>str(v).slice(0,250);
const urlText=(v:unknown)=>str(v).slice(0,500);
export function safeList(input:unknown):Raw[]{
 if(!Array.isArray(input))throw new Error("Unexpected Coolify response: expected a list");
 return input.filter((x):x is Raw=>x!==null&&typeof x==="object"&&!Array.isArray(x)).slice(0,500);
}
export function appView(a:Raw){
 return {
  uuid:text(a.uuid),name:text(a.name),status:text(a.status),
  domain:urlText(a.fqdn),gitRepository:text(a.git_repository),gitBranch:text(a.git_branch),
  updatedAt:text(a.updated_at)
 };
}
export function serverView(s:Raw){
 const settings=s.settings&&typeof s.settings==="object"&&!Array.isArray(s.settings)
  ?s.settings as Raw:{};
 const reachable=settings.is_reachable;
 const usable=settings.is_usable;
 const status=reachable===false?"unreachable":usable===false?"not ready":
  reachable===true&&usable===true?"healthy":text(s.status)||"unknown";
 return {uuid:text(s.uuid),name:text(s.name),ip:text(s.ip),status,
  description:text(s.description)};
}
export function deploymentView(d:Raw){
 return {uuid:text(d.deployment_uuid),applicationName:text(d.application_name),
  status:text(d.status),commit:text(d.commit),serverName:text(d.server_name),
  createdAt:text(d.created_at)};
}
export function projectView(p:Raw){
 return {uuid:text(p.uuid),name:text(p.name),description:text(p.description)};
}
export function isValidCoolifyOrigin(value:string){
 try{
  const u=new URL(value);
  if(!((u.protocol==="https:")||(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname))))return false;
  if(u.username||u.password||u.search||u.hash)return false;
  if(u.pathname!=="/")return false;
  // Disallow inline escape fragments/authority trickery and accidental base-path aliases.
  if(/[\s\\]/.test(value))return false;
  return true;
 }catch{return false;}
}

/** One bounded, GET-only read from our explicitly configured Coolify instance. */
export async function readCoolifyList(base:string,token:string,path:string,fetcher:typeof fetch=fetch):Promise<Raw[]>{
 const allowed=["applications","servers","deployments","projects"];
 if(!allowed.includes(path))throw new Error("Unsupported Coolify inventory path");
 if(!isValidCoolifyOrigin(base))throw new Error("Invalid Coolify base URL");
 const response=await fetcher(new URL("/api/v1/"+path,base),{
  method:"GET",headers:{Authorization:"Bearer "+token,Accept:"application/json"},
  cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)
 });
 if(!response.ok)throw new Error("Coolify "+path+" returned HTTP "+response.status);
 return safeList(await response.json());
}
