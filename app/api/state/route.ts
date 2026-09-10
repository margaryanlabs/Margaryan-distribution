import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { isLiveExecutionEnabled } from "@/lib/integrations";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
export async function GET(){try{const{result,hydration}=await withDurableState(()=>distributionStore.snapshot(),{writeBack:false});return NextResponse.json({...result,runtime:{...storageRuntime(),execution:isLiveExecutionEnabled()?"live":"dry-run"},hydration});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"State load failed",runtime:{...storageRuntime(),execution:isLiveExecutionEnabled()?"live":"dry-run"}},{status:500});}}
