import {NextResponse} from "next/server";
import {buildExperimentLedger,reconcileExperiment} from "@/lib/agent/experiment-ledger";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(req:Request){
  try{
    const url=new URL(req.url);
    const missionId=url.searchParams.get("missionId")?.trim()||"";
    if(!missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const{result,hydration}=await withDurableState(()=>{
      const state=distributionStore.snapshot();
      if(!state.missions.some(item=>item.id===missionId))throw new Error("Mission not found");
      return buildExperimentLedger(state,missionId);
    },{writeBack:false});
    return NextResponse.json({missionId,experiments:result,runtime:storageRuntime(),hydration});
  }catch(error){
    const message=error instanceof Error?error.message:"Experiment ledger failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:500});
  }
}

export async function POST(req:Request){
  try{
    if(!storageRuntime().durable)return NextResponse.json({error:"Durable CRM is required to mutate experiment state",runtime:storageRuntime()},{status:503});
    const body=await req.json() as {experimentId?:string;action?:"refresh"|"complete"|"stop";note?:string};
    const experimentId=body.experimentId?.trim()||"";
    if(!experimentId)return NextResponse.json({error:"experimentId is required"},{status:400});
    const action=body.action||"refresh";
    const{result,persistence}=await withDurableState(()=>{
      const experiment=distributionStore.getExperiment(experimentId);
      if(!experiment)throw new Error("Experiment not found");
      if(action==="refresh")return reconcileExperiment(experimentId,{completeIfWindowClosed:true});
      const notes=[...experiment.notes,...(body.note?.trim()?[body.note.trim()]:[])];
      const updated=distributionStore.updateExperiment(experimentId,{
        status:action==="stop"?"stopped":"completed",
        completedAt:new Date().toISOString(),
        notes
      });
      if(!updated)throw new Error("Experiment not found");
      return reconcileExperiment(experimentId);
    });
    return NextResponse.json({ok:true,analysis:result,runtime:storageRuntime(),persistence});
  }catch(error){
    const message=error instanceof Error?error.message:"Experiment update failed";
    return NextResponse.json({ok:false,error:message,runtime:storageRuntime()},{status:message==="Experiment not found"?404:500});
  }
}
