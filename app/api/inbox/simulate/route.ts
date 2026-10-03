import { NextResponse } from "next/server";
import { ingestInboundReply } from "@/lib/agent/reply-orchestrator";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(req:Request){
  try{
    const body=await req.json() as {leadId?:string;subject?:string;text?:string};
    if(!body.leadId||!body.text?.trim())return NextResponse.json({error:"leadId and text are required"},{status:400});
    const {result,persistence}=await withDurableState(async()=>{
      const lead=distributionStore.getLead(body.leadId!);
      if(!lead)return NextResponse.json({error:"Lead not found"},{status:404});
      const result=await ingestInboundReply({
        externalId:`sim-${crypto.randomUUID()}`,
        threadId:`sim-thread-${lead.id}`,
        messageId:`<sim-${crypto.randomUUID()}@margaryan.local>`,
        from:lead.email||`${lead.company.replace(/\s+/g,".").toLowerCase()}@simulation.local`,
        subject:body.subject||"Re: distribution outreach",
        text:body.text!.trim(),
        receivedAt:new Date().toISOString(),
        lead,
        isSimulation:true
      });
      return NextResponse.json({ok:true,simulated:true,result});
    });
    result.headers.set("x-distribution-storage",storageRuntime().storage);
    result.headers.set("x-distribution-persisted",String(Boolean(persistence.saved)));
    return result;
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Simulation failed",runtime:storageRuntime()},{status:500});
  }
}
