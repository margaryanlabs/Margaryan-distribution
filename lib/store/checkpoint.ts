import { Pool } from "pg";
import { memoryStore, type MemoryState } from "@/lib/store/memory";

type CheckpointRow={id:string;payload:MemoryState;version:number;updated_at:string};

declare global {
  var __margaryanDistributionCheckpointVersion:number|undefined;
  var __margaryanDistributionCheckpointHydratedAt:string|undefined;
  var __margaryanDistributionPgPool:Pool|undefined;
  var __margaryanDistributionPgSchemaReady:boolean|undefined;
}

function config(){
  const databaseUrl=(process.env.DISTRIBUTION_DATABASE_URL||"").trim();
  const supabaseUrl=process.env.DISTRIBUTION_SUPABASE_URL?.replace(/\/+$/ ,"");
  const supabaseKey=process.env.DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY;
  const id=(process.env.DISTRIBUTION_STATE_ID||"primary").trim()||"primary";
  const backend=databaseUrl?"postgres":supabaseUrl&&supabaseKey?"supabase":"memory";
  return{databaseUrl,supabaseUrl,supabaseKey,id,backend,configured:backend!=="memory"};
}

function pool(){
  const current=config();
  if(!current.databaseUrl)throw new Error("DISTRIBUTION_DATABASE_URL is not configured");
  if(!globalThis.__margaryanDistributionPgPool){
    globalThis.__margaryanDistributionPgPool=new Pool({
      connectionString:current.databaseUrl,
      max:2,
      idleTimeoutMillis:30_000,
      connectionTimeoutMillis:10_000,
      allowExitOnIdle:true
    });
  }
  return globalThis.__margaryanDistributionPgPool;
}

async function ensurePgSchema(){
  if(globalThis.__margaryanDistributionPgSchemaReady)return;
  await pool().query(`
    create table if not exists distribution_runtime_state (
      id text primary key,
      payload jsonb not null,
      version bigint not null default 1,
      updated_at timestamptz not null default now()
    )
  `);
  globalThis.__margaryanDistributionPgSchemaReady=true;
}

function headers(key:string,write=false){
  return{
    apikey:key,
    Authorization:`Bearer ${key}`,
    Accept:"application/json",
    "Content-Type":"application/json",
    ...(write?{Prefer:"return=representation"}:{})
  };
}

async function parseError(response:Response){
  const text=await response.text();
  return text||`${response.status} ${response.statusText}`;
}

export function isDurableStateConfigured(){return config().configured;}

export function storageRuntime(){
  const current=config();
  return{
    storage:current.backend==="postgres"?"postgres-checkpoint":current.backend==="supabase"?"supabase-checkpoint":"memory",
    durable:current.configured,
    persistence:current.backend==="postgres"?"Postgres versioned checkpoint":current.backend==="supabase"?"Supabase versioned checkpoint":"process-lifetime only",
    stateId:current.id,
    hydratedAt:globalThis.__margaryanDistributionCheckpointHydratedAt||null,
    requiredWhenDisabled:["DISTRIBUTION_DATABASE_URL"],
    alternateDurableBackend:["DISTRIBUTION_SUPABASE_URL","DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY"]
  };
}

async function hydratePostgres(id:string){
  await ensurePgSchema();
  const result=await pool().query<{id:string;payload:MemoryState;version:string|number;updated_at:Date|string}>(
    "select id,payload,version,updated_at from distribution_runtime_state where id=$1 limit 1",
    [id]
  );
  if(!result.rows.length){
    globalThis.__margaryanDistributionCheckpointVersion=undefined;
    globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
    return{configured:true,loaded:false,version:null,backend:"postgres" as const};
  }
  const row=result.rows[0];
  memoryStore.replaceState(row.payload);
  const version=Number(row.version);
  globalThis.__margaryanDistributionCheckpointVersion=version;
  globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
  return{configured:true,loaded:true,version,updatedAt:new Date(row.updated_at).toISOString(),backend:"postgres" as const};
}

async function persistPostgres(id:string){
  await ensurePgSchema();
  const payload=memoryStore.exportState();
  const knownVersion=globalThis.__margaryanDistributionCheckpointVersion;

  if(typeof knownVersion!=="number"){
    const result=await pool().query<{version:string|number}>(
      "insert into distribution_runtime_state(id,payload,version,updated_at) values($1,$2::jsonb,1,now()) on conflict(id) do nothing returning version",
      [id,JSON.stringify(payload)]
    );
    if(!result.rows.length)throw new Error("Durable state conflict while creating Postgres checkpoint; reload before retrying");
    globalThis.__margaryanDistributionCheckpointVersion=1;
    return{configured:true,saved:true,version:1,backend:"postgres" as const};
  }

  const nextVersion=knownVersion+1;
  const result=await pool().query<{version:string|number}>(
    "update distribution_runtime_state set payload=$1::jsonb,version=$2,updated_at=now() where id=$3 and version=$4 returning version",
    [JSON.stringify(payload),nextVersion,id,knownVersion]
  );
  if(!result.rows.length)throw new Error("Durable state conflict: Postgres checkpoint changed during this run; reload before retrying");
  globalThis.__margaryanDistributionCheckpointVersion=nextVersion;
  return{configured:true,saved:true,version:nextVersion,backend:"postgres" as const};
}

async function hydrateSupabase(url:string,key:string,id:string){
  const query=new URL(`${url}/rest/v1/distribution_runtime_state`);
  query.searchParams.set("id",`eq.${id}`);
  query.searchParams.set("select","id,payload,version,updated_at");
  query.searchParams.set("limit","1");
  const response=await fetch(query,{headers:headers(key),cache:"no-store"});
  if(!response.ok)throw new Error(`Durable state load failed: ${await parseError(response)}`);
  const rows=await response.json() as CheckpointRow[];
  if(!rows.length){
    globalThis.__margaryanDistributionCheckpointVersion=undefined;
    globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
    return{configured:true,loaded:false,version:null,backend:"supabase" as const};
  }
  const row=rows[0];
  memoryStore.replaceState(row.payload);
  globalThis.__margaryanDistributionCheckpointVersion=row.version;
  globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
  return{configured:true,loaded:true,version:row.version,updatedAt:row.updated_at,backend:"supabase" as const};
}

async function persistSupabase(url:string,key:string,id:string){
  const payload=memoryStore.exportState();
  const updated_at=new Date().toISOString();
  const knownVersion=globalThis.__margaryanDistributionCheckpointVersion;

  if(typeof knownVersion!=="number"){
    const response=await fetch(`${url}/rest/v1/distribution_runtime_state`,{
      method:"POST",
      headers:headers(key,true),
      body:JSON.stringify({id,payload,version:1,updated_at})
    });
    if(!response.ok){
      if(response.status===409)throw new Error("Durable state conflict while creating Supabase checkpoint; reload before retrying");
      throw new Error(`Durable state save failed: ${await parseError(response)}`);
    }
    const rows=await response.json() as CheckpointRow[];
    const version=rows[0]?.version??1;
    globalThis.__margaryanDistributionCheckpointVersion=version;
    return{configured:true,saved:true,version,backend:"supabase" as const};
  }

  const nextVersion=knownVersion+1;
  const query=new URL(`${url}/rest/v1/distribution_runtime_state`);
  query.searchParams.set("id",`eq.${id}`);
  query.searchParams.set("version",`eq.${knownVersion}`);
  const response=await fetch(query,{
    method:"PATCH",
    headers:headers(key,true),
    body:JSON.stringify({payload,version:nextVersion,updated_at})
  });
  if(!response.ok)throw new Error(`Durable state save failed: ${await parseError(response)}`);
  const rows=await response.json() as CheckpointRow[];
  if(!rows.length)throw new Error("Durable state conflict: Supabase checkpoint changed during this run; reload before retrying");
  globalThis.__margaryanDistributionCheckpointVersion=nextVersion;
  return{configured:true,saved:true,version:nextVersion,backend:"supabase" as const};
}

export async function hydrateDistributionState(){
  const current=config();
  if(current.backend==="postgres")return hydratePostgres(current.id);
  if(current.backend==="supabase"&&current.supabaseUrl&&current.supabaseKey)return hydrateSupabase(current.supabaseUrl,current.supabaseKey,current.id);
  return{configured:false,loaded:false,version:null,backend:"memory" as const};
}

export async function persistDistributionState(){
  const current=config();
  if(current.backend==="postgres")return persistPostgres(current.id);
  if(current.backend==="supabase"&&current.supabaseUrl&&current.supabaseKey)return persistSupabase(current.supabaseUrl,current.supabaseKey,current.id);
  return{configured:false,saved:false,version:null,backend:"memory" as const};
}

export async function withDurableState<T>(work:()=>Promise<T>|T,options:{writeBack?:boolean}={}){
  const writeBack=options.writeBack!==false;
  const hydration=await hydrateDistributionState();
  const result=await work();
  const persistence=writeBack?await persistDistributionState():{configured:hydration.configured,saved:false,version:globalThis.__margaryanDistributionCheckpointVersion??null,backend:hydration.backend};
  return{result,hydration,persistence};
}
