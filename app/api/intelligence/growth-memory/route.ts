import {NextResponse} from "next/server";
import {buildGrowthMemory} from "@/lib/agent/growth-memory";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(req:Request){
  try{
    const missionId=new URL(req.url).searchParams.get("missionId")?.trim()||"";
    if(!missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const{result,hydration}=await withDurableState(()=>{
      const state=distributionStore.snapshot();
      if(!state.missions.some(item=>item.id===missionId))throw new Error("Mission not found");
      return buildGrowthMemory(state,missionId);
    },{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    const message=error instanceof Error?error.message:"Growth Memory failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:500});
  }
}
