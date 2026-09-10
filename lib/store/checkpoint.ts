import { memoryStore, type MemoryState } from "@/lib/store/memory";

type CheckpointRow={id:string;payload:MemoryState;version:number;updated_at:string};

declare global {
  var __margaryanDistributionCheckpointVersion:number|undefined;
  var __margaryanDistributionCheckpointHydratedAt:string|undefined;
}

function config(){
  const url=process.env.DISTRIBUTION_SUPABASE_URL?.replace(/\/+$/ ,"");
  const key=process.env.DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY;
  const id=(process.env.DISTRIBUTION_STATE_ID||"primary").trim()||"primary";
  return{url,key,id,configured:Boolean(url&&key)};
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
    storage:current.configured?"supabase-checkpoint":"memory",
    durable:current.configured,
    persistence:current.configured?"Supabase versioned checkpoint":"process-lifetime only",
    stateId:current.id,
    hydratedAt:globalThis.__margaryanDistributionCheckpointHydratedAt||null,
    requiredWhenDisabled:["DISTRIBUTION_SUPABASE_URL","DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY"]
  };
}

export async function hydrateDistributionState(){
  const current=config();
  if(!current.configured||!current.url||!current.key)return{configured:false,loaded:false,version:null};
  const query=new URL(`${current.url}/rest/v1/distribution_runtime_state`);
  query.searchParams.set("id",`eq.${current.id}`);
  query.searchParams.set("select","id,payload,version,updated_at");
  query.searchParams.set("limit","1");
  const response=await fetch(query,{headers:headers(current.key),cache:"no-store"});
  if(!response.ok)throw new Error(`Durable state load failed: ${await parseError(response)}`);
  const rows=await response.json() as CheckpointRow[];
  if(!rows.length){
    globalThis.__margaryanDistributionCheckpointVersion=undefined;
    globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
    return{configured:true,loaded:false,version:null};
  }
  const row=rows[0];
  memoryStore.replaceState(row.payload);
  globalThis.__margaryanDistributionCheckpointVersion=row.version;
  globalThis.__margaryanDistributionCheckpointHydratedAt=new Date().toISOString();
  return{configured:true,loaded:true,version:row.version,updatedAt:row.updated_at};
}

export async function persistDistributionState(){
  const current=config();
  if(!current.configured||!current.url||!current.key)return{configured:false,saved:false,version:null};
  const payload=memoryStore.exportState();
  const updated_at=new Date().toISOString();
  const knownVersion=globalThis.__margaryanDistributionCheckpointVersion;

  if(typeof knownVersion!=="number"){
    const response=await fetch(`${current.url}/rest/v1/distribution_runtime_state`,{
      method:"POST",
      headers:headers(current.key,true),
      body:JSON.stringify({id:current.id,payload,version:1,updated_at})
    });
    if(!response.ok){
      if(response.status===409)throw new Error("Durable state conflict while creating checkpoint; reload before retrying");
      throw new Error(`Durable state save failed: ${await parseError(response)}`);
    }
    const rows=await response.json() as CheckpointRow[];
    const version=rows[0]?.version??1;
    globalThis.__margaryanDistributionCheckpointVersion=version;
    return{configured:true,saved:true,version};
  }

  const nextVersion=knownVersion+1;
  const query=new URL(`${current.url}/rest/v1/distribution_runtime_state`);
  query.searchParams.set("id",`eq.${current.id}`);
  query.searchParams.set("version",`eq.${knownVersion}`);
  const response=await fetch(query,{
    method:"PATCH",
    headers:headers(current.key,true),
    body:JSON.stringify({payload,version:nextVersion,updated_at})
  });
  if(!response.ok)throw new Error(`Durable state save failed: ${await parseError(response)}`);
  const rows=await response.json() as CheckpointRow[];
  if(!rows.length)throw new Error("Durable state conflict: checkpoint changed during this run; reload before retrying");
  globalThis.__margaryanDistributionCheckpointVersion=nextVersion;
  return{configured:true,saved:true,version:nextVersion};
}

export async function withDurableState<T>(work:()=>Promise<T>|T,options:{writeBack?:boolean}={}){
  const writeBack=options.writeBack!==false;
  const hydration=await hydrateDistributionState();
  const result=await work();
  const persistence=writeBack?await persistDistributionState():{configured:hydration.configured,saved:false,version:globalThis.__margaryanDistributionCheckpointVersion??null};
  return{result,hydration,persistence};
}
