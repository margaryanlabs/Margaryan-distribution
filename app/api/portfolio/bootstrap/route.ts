import { NextResponse } from "next/server";
import { ensurePortfolioProducts, PORTFOLIO_PRODUCTS } from "@/lib/portfolio/catalog";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

export async function GET(){try{const{result,hydration}=await withDurableState(()=>({catalog:PORTFOLIO_PRODUCTS.map(item=>({name:item.name,sourceUrl:item.sourceUrl||null,oneLiner:item.oneLiner})),products:distributionStore.listProducts()}),{writeBack:false});return NextResponse.json({...result,runtime:storageRuntime(),hydration});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Portfolio read failed",runtime:storageRuntime()},{status:500});}}
export async function POST(){try{const{result,hydration,persistence}=await withDurableState(()=>ensurePortfolioProducts());return NextResponse.json({...result,runtime:storageRuntime(),hydration,persistence},{status:201});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Portfolio bootstrap failed",runtime:storageRuntime()},{status:500});}}
