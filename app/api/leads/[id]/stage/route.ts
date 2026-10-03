import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";
import type {LeadStage} from "@/lib/types";

const allowed=new Set<LeadStage>(["researched","contacted","replied","qualified","meeting","won","lost","do_not_contact"]);

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const{id}=await context.params;
    const body=await request.json() as {stage?:LeadStage;revenueUsd?:number;note?:string};
    if(!body.stage||!allowed.has(body.stage))return NextResponse.json({error:"Unsupported lead stage"},{status:400});
    const revenueUsd=Number(body.revenueUsd||0);
    if(body.stage==="won"&&(!Number.isFinite(revenueUsd)||revenueUsd<0))return NextResponse.json({error:"revenueUsd must be a non-negative number"},{status:400});
    const{result,persistence}=await withDurableState(()=>{
      const lead=distributionStore.getLead(id);
      if(!lead)throw new Error("Lead not found");
      const patch:Parameters<typeof distributionStore.updateLead>[1]={stage:body.stage};
      if(body.stage==="won"){patch.nextAction="customer handoff";patch.nextActionAt=undefined;distributionStore.stopPendingLeadActions(lead.id,"Sales sequence stopped after lead was marked won");}
      if(body.stage==="lost"){patch.nextAction="stop";patch.nextActionAt=undefined;distributionStore.stopPendingLeadActions(lead.id,"Sales sequence stopped after lead was marked lost");}
      if(body.stage==="do_not_contact"){patch.optedOut=true;patch.doNotCall=true;patch.nextAction="stop";patch.nextActionAt=undefined;distributionStore.stopPendingLeadActions(lead.id,"Sales sequence stopped after do-not-contact");}
      const updated=distributionStore.updateLead(id,patch);
      if(!updated)throw new Error("Lead update failed");
      let revenueEvent;
      if(body.stage==="won"&&lead.missionId){
        revenueEvent=distributionStore.addPerformance({
          missionId:lead.missionId,
          channel:"system",
          source:"manual",
          metrics:{conversions:1,...(revenueUsd>0?{revenueUsd}:{})},
          occurredAt:new Date().toISOString(),
          note:(body.note||`Lead marked won: ${lead.company}`)+(revenueUsd>0?` · verified revenue $${revenueUsd}`:" · revenue amount not recorded")
        });
      }
      return{lead:updated,revenueEvent};
    });
    return NextResponse.json({...result,runtime:storageRuntime(),persistence});
  }catch(error){
    const message=error instanceof Error?error.message:"Lead stage update failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Lead not found"?404:500});
  }
}
