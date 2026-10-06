import {NextResponse} from "next/server";
import {buildExecutionPlan,stageExecutionPlan} from "@/lib/agent/execution-planner";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

function params(req:Request){
  const url=new URL(req.url);
  return{missionId:url.searchParams.get("missionId")?.trim()||"",directiveId:url.searchParams.get("directiveId")?.trim()||""};
}

export async function GET(req:Request){
  try{
    const{missionId,directiveId}=params(req);
    if(!missionId||!directiveId)return NextResponse.json({error:"missionId and directiveId are required"},{status:400});
    const{result,hydration}=await withDurableState(()=>{
      const state=distributionStore.snapshot();
      if(!state.missions.some(item=>item.id===missionId))throw new Error("Mission not found");
      return buildExecutionPlan(state,missionId,directiveId);
    },{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    const message=error instanceof Error?error.message:"Execution plan preview failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:400});
  }
}

export async function POST(req:Request){
  try{
    if(!storageRuntime().durable)return NextResponse.json({error:"Durable CRM is required before staging execution plans",runtime:storageRuntime()},{status:503});
    const body=await req.json() as {missionId?:string;directiveId?:string};
    const missionId=body.missionId?.trim()||"",directiveId=body.directiveId?.trim()||"";
    if(!missionId||!directiveId)return NextResponse.json({error:"missionId and directiveId are required"},{status:400});

    const{result,persistence}=await withDurableState(async()=>{
      const state=distributionStore.snapshot();
      if(!state.missions.some(item=>item.id===missionId))throw new Error("Mission not found");
      const plan=buildExecutionPlan(state,missionId,directiveId);
      return stageExecutionPlan(plan);
    });

    return NextResponse.json({ok:true,...result,runtime:storageRuntime(),persistence});
  }catch(error){
    const message=error instanceof Error?error.message:"Execution plan staging failed";
    return NextResponse.json({ok:false,error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:500});
  }
}
