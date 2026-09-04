import { NextResponse } from "next/server";
import { prepareSmmCampaign } from "@/lib/agent/smm-queue";
import { distributionStore } from "@/lib/store";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;days?:number};
    if(!body.missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const mission=distributionStore.getMission(body.missionId);
    if(!mission)return NextResponse.json({error:"Mission not found"},{status:404});
    return NextResponse.json({ok:true,...await prepareSmmCampaign(mission,body.days||7)});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"SMM campaign generation failed"},{status:500});}
}
