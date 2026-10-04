import { NextResponse } from "next/server";
import { prepareSmmCampaign } from "@/lib/agent/smm-queue";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;days?:number};
    if(!body.missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const{result,persistence}=await withDurableState(async()=>{
      const mission=distributionStore.getMission(body.missionId!);
      if(!mission)return NextResponse.json({error:"Mission not found"},{status:404});
      return NextResponse.json({ok:true,...await prepareSmmCampaign(mission,body.days||7)});
    });
    result.headers.set("x-distribution-storage",storageRuntime().storage);
    result.headers.set("x-distribution-persisted",String(Boolean(persistence.saved)));
    return result;
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"SMM campaign generation failed",runtime:storageRuntime()},{status:500});
  }
}
