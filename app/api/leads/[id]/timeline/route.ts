import {NextResponse} from "next/server";
import {buildLead360} from "@/lib/agent/lead-timeline";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(_:Request,context:{params:Promise<{id:string}>}){
  try{
    const{id}=await context.params;
    const{result,hydration}=await withDurableState(()=>buildLead360(id),{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Lead timeline failed",runtime:storageRuntime()},{status:404});
  }
}
