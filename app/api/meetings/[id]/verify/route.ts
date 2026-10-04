import {NextResponse} from "next/server";
import {verifyAndQueueMeeting} from "@/lib/agent/meeting-orchestrator";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
  try{
    const{id}=await context.params;
    const{result,persistence}=await withDurableState(()=>verifyAndQueueMeeting(id));
    return NextResponse.json({...result,runtime:storageRuntime(),persistence});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Meeting availability check failed",runtime:storageRuntime()},{status:409});
  }
}
