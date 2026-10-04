import {NextResponse} from "next/server";
import {proposeMeeting} from "@/lib/agent/meeting-orchestrator";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(){
  try{
    const{result,hydration}=await withDurableState(()=>({meetings:distributionStore.listMeetings()}),{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Meeting read failed",runtime:storageRuntime()},{status:500});
  }
}

export async function POST(req:Request){
  try{
    const body=await req.json() as{missionId?:string;leadId?:string;start?:string;end?:string;timezone?:string;sourceCallSid?:string;title?:string;notes?:string};
    if(!body.leadId||!body.start)return NextResponse.json({error:"leadId and start are required"},{status:400});
    const{result,persistence}=await withDurableState(()=>{
      const lead=distributionStore.getLead(body.leadId!);
      if(!lead)return NextResponse.json({error:"Lead not found"},{status:404});
      const missionId=body.missionId||lead.missionId;
      if(!missionId)return NextResponse.json({error:"Lead has no mission"},{status:409});
      const meeting=proposeMeeting({missionId,leadId:body.leadId!,start:body.start!,end:body.end,timezone:body.timezone,sourceCallSid:body.sourceCallSid,title:body.title,notes:body.notes});
      return NextResponse.json({meeting});
    });
    result.headers.set("x-distribution-storage",storageRuntime().storage);
    result.headers.set("x-distribution-persisted",String(Boolean(persistence.saved)));
    return result;
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Meeting proposal failed",runtime:storageRuntime()},{status:400});
  }
}
