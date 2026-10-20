/** Read-only self-hosted ClickHouse diagnostics: no arbitrary SQL inputs. */
export type ClickHouseStatus={state:"setup"|"connected"|"error";version:string|null;uptimeSeconds:number|null;notice:string;checkedAt:string};
const empty=(state:ClickHouseStatus["state"],notice:string):ClickHouseStatus=>({state,version:null,uptimeSeconds:null,notice,checkedAt:new Date().toISOString()});
export function allowedClickHouseOrigin(raw:string):string|null{
 try{
  if(!raw||/[\s\\]/.test(raw))return null;
  const url=new URL(raw);
  if(!(url.protocol==="https:"||(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname))))return null;
  if(url.username||url.password||url.search||url.hash||url.pathname!=="/")return null;
  return url.origin;
 }catch{return null;}
}
export async function readClickHouseStatus(env:Record<string,string|undefined>,fetcher:typeof fetch=fetch):Promise<ClickHouseStatus>{
 const raw=env.CLOUD_CLICKHOUSE_URL?.trim();
 if(!raw)return empty("setup","Self-hosted ClickHouse is not connected.");
 const origin=allowedClickHouseOrigin(raw);
 const user=env.CLOUD_CLICKHOUSE_USER?.trim(),password=env.CLOUD_CLICKHOUSE_PASSWORD?.trim();
 if(!origin||!user||!password)return empty("error","ClickHouse address or server-only credentials are invalid.");
 try{
  const endpoint=new URL("/",origin);
  endpoint.searchParams.set("readonly","1");
  endpoint.searchParams.set("max_execution_time","5");
  const response=await fetcher(endpoint,{method:"POST",headers:{
   "X-ClickHouse-User":user,"X-ClickHouse-Key":password,"Content-Type":"text/plain","Accept":"application/json"},
   body:"SELECT version() AS version, uptime() AS uptime_seconds FORMAT JSON",
   cache:"no-store",redirect:"error",signal:AbortSignal.timeout(7000)});
  if(!response.ok)return empty("error","ClickHouse request failed (HTTP "+response.status+").");
  const payload=await response.json() as unknown;
  if(!payload||typeof payload!=="object"||!Array.isArray((payload as {data?:unknown}).data))return empty("error","Unexpected ClickHouse response.");
  const rows=(payload as {data:unknown[]}).data;
  if(rows.length!==1||!rows[0]||typeof rows[0]!=="object")return empty("error","No valid ClickHouse metrics returned.");
  const row=rows[0] as Record<string,unknown>;
  if(typeof row.version!=="string"||!/^v?[\d.]{2,30}/.test(row.version))return empty("error","ClickHouse version not available.");
  const uptime=typeof row.uptime_seconds==="number"?row.uptime_seconds:NaN;
  if(!Number.isFinite(uptime)||uptime<0)return empty("error","ClickHouse uptime unavailable.");
  return {state:"connected",version:row.version.slice(0,32),uptimeSeconds:uptime,
   notice:"Read-only ClickHouse instance responded. Database ingestion and query health are not yet measured.",
   checkedAt:new Date().toISOString()};
 }catch{return empty("error","ClickHouse could not be reached. Verify private access, TLS and credentials.");}
}
