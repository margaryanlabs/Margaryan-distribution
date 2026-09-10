import { NextResponse } from "next/server";
import { buildDistributionPlan } from "@/lib/agent/planner";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import type { MissionInput } from "@/lib/types";

export async function GET(){try{const{result,hydration}=await withDurableState(()=>({missions:distributionStore.listMissions()}),{writeBack:false});return NextResponse.json({...result,runtime:storageRuntime(),hydration});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Mission read failed",runtime:storageRuntime()},{status:500});}}
export async function POST(request:Request){try{const body=await request.json() as MissionInput;if(!body.goal?.trim())return NextResponse.json({error:"goal is required"},{status:400});const input:MissionInput={goal:body.goal.trim(),market:body.market?.trim()||"Global",language:body.language==="ru"?"ru":"en",autonomy:body.autonomy==="auto"||body.autonomy==="draft"?body.autonomy:"approve",productId:body.productId||undefined};const{result,persistence}=await withDurableState(async()=>{const product=input.productId?distributionStore.getProduct(input.productId):undefined;const plan=await buildDistributionPlan(input,product);return distributionStore.createMission(input,plan);});return NextResponse.json({...result,runtime:storageRuntime(),persistence},{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Mission creation failed",runtime:storageRuntime()},{status:500});}}
