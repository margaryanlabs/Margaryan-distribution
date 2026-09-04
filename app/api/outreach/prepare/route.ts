import { NextResponse } from "next/server";
import { prepareLeadOutreach } from "@/lib/agent/outreach-queue";
import { distributionStore } from "@/lib/store";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;leadId?:string};
    if(!body.missionId||!body.leadId)return NextResponse.json({error:"missionId and leadId are required"},{status:400});
    const mission=distributionStore.getMission(body.missionId),lead=distributionStore.getLead(body.leadId);
    if(!mission||!lead)return NextResponse.json({error:"Mission or lead not found"},{status:404});
    const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
    const result=await prepareLeadOutreach(mission,lead,product);
    return NextResponse.json(result);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Outreach preparation failed"},{status:500});}
}
