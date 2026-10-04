import { NextResponse } from "next/server";
import { prepareLeadOutreach } from "@/lib/agent/outreach-queue";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;leadId?:string};
    if(!body.missionId||!body.leadId)return NextResponse.json({error:"missionId and leadId are required"},{status:400});
    const{result,persistence}=await withDurableState(async()=>{
      const mission=distributionStore.getMission(body.missionId!);
      const lead=distributionStore.getLead(body.leadId!);
      if(!mission||!lead)return NextResponse.json({error:"Mission or lead not found"},{status:404});
      const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
      const prepared=await prepareLeadOutreach(mission,lead,product);
      return NextResponse.json(prepared);
    });
    result.headers.set("x-distribution-storage",storageRuntime().storage);
    result.headers.set("x-distribution-persisted",String(Boolean(persistence.saved)));
    return result;
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Outreach preparation failed",runtime:storageRuntime()},{status:500});
  }
}
