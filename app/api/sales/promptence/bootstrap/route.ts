import { NextResponse } from "next/server";
import { buildDistributionPlan } from "@/lib/agent/planner";
import { ensurePortfolioProducts } from "@/lib/portfolio/catalog";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import type { MissionInput } from "@/lib/types";

const DEFAULT_GOAL="Win 10 paid Promptence customers by building an evidence-led pipeline: research high-fit agencies and B2B SaaS accounts, identify concrete AI-visibility buying signals, prepare personalized outreach, convert interest into paid Diagnostics or the next appropriate offer, and learn from verified replies, meetings and revenue.";
const DEFAULT_MARKET="United States, United Kingdom, UAE";

export async function POST(){
  try{
    const {result,hydration,persistence}=await withDurableState(async()=>{
      ensurePortfolioProducts();
      const product=distributionStore.listProducts().find(item=>item.name.trim().toLowerCase()==="promptence");
      if(!product)throw new Error("Promptence Product Brain could not be initialized");
      const existing=distributionStore.listMissions().find(item=>item.status==="active"&&item.input.productId===product.id);
      if(existing)return{created:false,product,mission:existing,actions:distributionStore.listActions().filter(action=>action.missionId===existing.id)};
      const input:MissionInput={goal:DEFAULT_GOAL,market:DEFAULT_MARKET,language:"en",autonomy:"approve",productId:product.id};
      const plan=await buildDistributionPlan(input,product);
      const created=distributionStore.createMission(input,plan);
      return{created:true,product,...created};
    });
    return NextResponse.json({...result,runtime:storageRuntime(),hydration,persistence},{status:result.created?201:200});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Promptence sales bootstrap failed",runtime:storageRuntime()},{status:500});
  }
}
