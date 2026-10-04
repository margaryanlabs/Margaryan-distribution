import {NextResponse} from "next/server";
import {checkDailyExecutionLimit} from "@/lib/limits";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET(){
  try{
    const{result,hydration}=await withDurableState(()=>{
      const actions=distributionStore.listActions();
      const limits={
        email:checkDailyExecutionLimit("email","send_email"),
        voice:checkDailyExecutionLimit("voice","call"),
        social:checkDailyExecutionLimit("x","publish_post"),
        calendar:checkDailyExecutionLimit("calendar","book_meeting")
      };
      return{limits,retries:actions.filter(x=>x.status==="queued"&&x.retryCount>0),blocked:actions.filter(x=>x.status==="blocked"),deadLetters:actions.filter(x=>x.status==="dead_letter"),failed:actions.filter(x=>x.status==="failed")};
    },{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Operations read failed",runtime:storageRuntime()},{status:500});
  }
}
