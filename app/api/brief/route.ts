import {NextResponse} from "next/server";
import {buildExecutiveBrief} from "@/lib/agent/executive-brief";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(req:Request){
  try{
    const hours=Number(new URL(req.url).searchParams.get("hours")||24);
    const{result,hydration}=await withDurableState(()=>buildExecutiveBrief(hours),{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Brief failed",runtime:storageRuntime()},{status:500});
  }
}
