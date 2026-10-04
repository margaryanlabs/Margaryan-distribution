import {NextResponse} from "next/server";
import {buildMeetingBrief} from "@/lib/agent/meeting-brief";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
  try{
    const{id}=await context.params;
    const{result,hydration}=await withDurableState(()=>buildMeetingBrief(id),{writeBack:false});
    return NextResponse.json({brief:result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Meeting brief failed",runtime:storageRuntime()},{status:400});
  }
}
