import {NextResponse} from "next/server";
import {buildResourceAllocationReport} from "@/lib/agent/resource-allocator";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(req:Request){
  try{
    const url=new URL(req.url);
    const missionId=url.searchParams.get("missionId")?.trim()||"";
    const units=Math.max(20,Math.min(500,Number(url.searchParams.get("units")||100)));
    if(!missionId)return NextResponse.json({error:"missionId is required"},{status:400});

    const{result,hydration}=await withDurableState(()=>{
      const state=distributionStore.snapshot();
      return buildResourceAllocationReport(state,missionId,units);
    },{writeBack:false});

    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    const message=error instanceof Error?error.message:"Resource allocator failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:500});
  }
}
