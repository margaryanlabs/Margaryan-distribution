import { NextResponse } from "next/server";
import { bootstrapPromptenceSales, promptenceShadowReport, researchPromptenceBatch } from "@/lib/sales/promptence-ops";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i+=1)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}

export async function POST(req:Request){
  const expected=process.env.WORKER_SECRET||"";
  const supplied=req.headers.get("x-worker-secret")||"";
  if(!expected||!supplied||!safeEqual(supplied,expected))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  if(!storageRuntime().durable)return NextResponse.json({ok:false,error:"Durable CRM is required",runtime:storageRuntime()},{status:503});
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({ok:false,error:"OPENAI_API_KEY is required for shadow research",runtime:storageRuntime()},{status:503});

  try{
    let body:{limit?:number;operation?:"research"|"report"}={};
    try{body=await req.json() as typeof body;}catch{}
    const operation=body.operation==="report"?"report":"research";
    const requested=Math.max(1,Math.min(3,Number(body.limit||1)));

    const {result,hydration,persistence}=await withDurableState(async()=>{
      const bootstrap=await bootstrapPromptenceSales();
      const before=promptenceShadowReport(bootstrap.mission.id);
      const targetAccounts=Math.max(1,Number(process.env.PROMPTENCE_SHADOW_TARGET||10));
      const remaining=Math.max(0,targetAccounts-before.totals.accounts);
      const limit=Math.min(requested,remaining);
      const research=operation==="research"&&limit>0?await researchPromptenceBatch(bootstrap.mission.id,limit):null;
      const report=promptenceShadowReport(bootstrap.mission.id);
      return{
        operation,
        missionCreated:bootstrap.created,
        targetAccounts:Math.max(1,Number(process.env.PROMPTENCE_SHADOW_TARGET||10)),
        researched:research?.researched||0,
        added:research?.added||0,
        report
      };
    });

    return NextResponse.json({ok:true,...result,runtime:storageRuntime(),hydration,persistence});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Promptence shadow run failed",runtime:storageRuntime()},{status:500});
  }
}
