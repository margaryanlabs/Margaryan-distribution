import { NextResponse } from "next/server";
import { runAutopilot } from "@/lib/agent/director";
import { ensurePortfolioProducts } from "@/lib/portfolio/catalog";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(request:Request){
  try{
    let body:{missionId?:string}={};
    try{body=await request.json() as {missionId?:string};}catch{}
    const {result,hydration,persistence}=await withDurableState(async()=>{
      ensurePortfolioProducts();
      const product=distributionStore.listProducts().find(item=>item.name.trim().toLowerCase()==="promptence");
      if(!product)throw new Error("Promptence Product Brain is missing");
      const mission=body.missionId
        ? distributionStore.getMission(body.missionId)
        : distributionStore.listMissions().find(item=>item.status==="active"&&item.input.productId===product.id);
      if(!mission||mission.input.productId!==product.id)throw new Error("No active Promptence sales mission. Bootstrap it first.");
      const report=await runAutopilot({missionId:mission.id,leadTarget:50,researchPerTick:10,outreachPerTick:8,smmDays:7,pollInbox:true,runActions:false});
      return{missionId:mission.id,report};
    });
    return NextResponse.json({ok:true,...result,runtime:storageRuntime(),hydration,persistence});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Promptence sales advance failed",runtime:storageRuntime()},{status:500});
  }
}
