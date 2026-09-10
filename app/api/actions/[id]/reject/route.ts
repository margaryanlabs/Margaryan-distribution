import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
export async function POST(_:Request,context:{params:Promise<{id:string}>}){try{const{id}=await context.params;const{result}=await withDurableState(()=>{const action=distributionStore.getAction(id);if(!action)return NextResponse.json({error:"Action not found"},{status:404});const updated=distributionStore.updateAction(id,{status:"rejected",rejectedAt:new Date().toISOString()});return NextResponse.json({action:updated});});return result;}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Rejection failed",runtime:storageRuntime()},{status:500});}}
