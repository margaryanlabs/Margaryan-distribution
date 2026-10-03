import { NextResponse } from "next/server";
import { pollKnownLeadGmail } from "@/lib/agent/inbox-poller";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(){
  try{
    const {result,persistence}=await withDurableState(()=>pollKnownLeadGmail(25));
    return NextResponse.json({ok:true,...result,runtime:storageRuntime(),persistence});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Gmail poll failed",runtime:storageRuntime()},{status:500});
  }
}
