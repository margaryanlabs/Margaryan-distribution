import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { isLiveExecutionEnabled } from "@/lib/integrations";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import { ensurePortfolioProducts } from "@/lib/portfolio/catalog";
function runtimeReadiness(){
 const storage=storageRuntime();
 return{
  ...storage,
  execution:isLiveExecutionEnabled()?"live":"dry-run",
  security:{operatorAuthConfigured:Boolean(process.env.DISTRIBUTION_BASIC_USER&&process.env.DISTRIBUTION_BASIC_PASSWORD)},
  automation:{portfolioCronConfigured:Boolean(process.env.CRON_SECRET),workerConfigured:Boolean(process.env.WORKER_SECRET||process.env.AUTOPILOT_SECRET)},
  adapters:{
   openai:Boolean(process.env.OPENAI_API_KEY),
   gmail:Boolean(process.env.GOOGLE_REFRESH_TOKEN||process.env.GMAIL_ACCESS_TOKEN||process.env.GOOGLE_ACCESS_TOKEN),
   calendar:Boolean((process.env.GOOGLE_REFRESH_TOKEN||process.env.GOOGLE_ACCESS_TOKEN)&&process.env.GOOGLE_CALENDAR_ID),
   linkedin:Boolean(process.env.LINKEDIN_ACCESS_TOKEN&&process.env.LINKEDIN_AUTHOR_URN),
   instagram:Boolean(process.env.META_ACCESS_TOKEN&&process.env.INSTAGRAM_USER_ID),
   x:Boolean(process.env.X_USER_ACCESS_TOKEN),
   voice:Boolean(process.env.OPENAI_API_KEY&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER&&process.env.VOICE_GATEWAY_WSS_URL)
  }
 };
}
export async function GET(){
 try{
  const{result,hydration}=await withDurableState(()=>{ensurePortfolioProducts();return distributionStore.snapshot();},{writeBack:false});
  return NextResponse.json({...result,runtime:runtimeReadiness(),hydration});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"State load failed",runtime:runtimeReadiness()},{status:500});
 }
}
