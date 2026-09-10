import { NextResponse } from "next/server";
import { buildProductBrain } from "@/lib/agent/product-brain";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import type { Language } from "@/lib/types";

export async function GET(){try{const{result,hydration}=await withDurableState(()=>({products:distributionStore.listProducts()}),{writeBack:false});return NextResponse.json({...result,runtime:storageRuntime(),hydration});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Product read failed",runtime:storageRuntime()},{status:500});}}
export async function POST(req:Request){try{const body=await req.json() as{name?:string;sourceUrl?:string;notes?:string;language?:Language};if(!body.name?.trim())return NextResponse.json({error:"name is required"},{status:400});const{result,persistence}=await withDurableState(async()=>{const brain=await buildProductBrain({name:body.name!.trim(),sourceUrl:body.sourceUrl?.trim()||undefined,notes:body.notes?.trim()||undefined,language:body.language==="ru"?"ru":"en"});return distributionStore.addProduct(brain);});return NextResponse.json({product:result,runtime:storageRuntime(),persistence},{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Product brain failed",runtime:storageRuntime()},{status:500});}}
