import { NextResponse } from "next/server";
import { runPortfolioDirector } from "@/lib/agent/portfolio-director";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

function safeEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i+=1)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

export async function POST(req:Request){
  const secret=process.env.WORKER_SECRET;
  if(!secret)return NextResponse.json({ok:false,error:"WORKER_SECRET is required"},{status:503});
  const supplied=req.headers.get("x-worker-secret")||"";
  if(!safeEqual(supplied,secret))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});

  const runtime=storageRuntime();
  if(!runtime.durable){
    return NextResponse.json({
      ok:false,
      error:"Durable CRM is required for autonomous sales-loop execution",
      runtime
    },{status:503});
  }

  const liveActionsEnabled=process.env.EXECUTION_ENABLED==="true"&&process.env.WORKER_LIVE_EXECUTION==="true";

  try{
    const{result,hydration,persistence}=await withDurableState(()=>runPortfolioDirector({
      bootstrap:true,
      maxMissions:1,
      leadTarget:25,
      researchPerTick:1,
      outreachPerTick:5,
      smmDays:7,
      pollInbox:true,
      runActions:liveActionsEnabled
    }));

    return NextResponse.json({
      ok:true,
      mode:liveActionsEnabled?"full-loop-live-actions":"full-loop-preparation-only",
      runtime:storageRuntime(),
      safeguards:{
        durableRequired:true,
        liveExecutionConfigured:process.env.EXECUTION_ENABLED==="true",
        workerLiveExecutionConfigured:process.env.WORKER_LIVE_EXECUTION==="true",
        externalActionsExecuted:liveActionsEnabled
      },
      hydration,
      persistence,
      report:result
    });
  }catch(error){
    return NextResponse.json({
      ok:false,
      error:error instanceof Error?error.message:"Worker failed",
      runtime:storageRuntime()
    },{status:500});
  }
}
