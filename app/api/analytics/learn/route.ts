import { NextResponse } from "next/server";
import { generateLearningReport } from "@/lib/agent/learning";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string};
    if(!body.missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const{result,persistence}=await withDurableState(()=>generateLearningReport(body.missionId!));
    return NextResponse.json({report:result,runtime:storageRuntime(),persistence});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Learning pass failed",runtime:storageRuntime()},{status:500});
  }
}
