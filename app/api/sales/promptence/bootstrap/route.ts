import { NextResponse } from "next/server";
import { bootstrapPromptenceSales } from "@/lib/sales/promptence-ops";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function POST(){
  try{
    const {result,hydration,persistence}=await withDurableState(()=>bootstrapPromptenceSales());
    return NextResponse.json({...result,runtime:storageRuntime(),hydration,persistence},{status:result.created?201:200});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Promptence sales bootstrap failed",runtime:storageRuntime()},{status:500});
  }
}
