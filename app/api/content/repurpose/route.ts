import { NextResponse } from "next/server";
import { repurposeSource } from "@/lib/agent/smm";
import { distributionStore } from "@/lib/store";

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;sourceText?:string};if(!body.missionId||!body.sourceText?.trim())return NextResponse.json({error:"missionId and sourceText are required"},{status:400});
    const mission=distributionStore.getMission(body.missionId);if(!mission)return NextResponse.json({error:"Mission not found"},{status:404});
    const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;const items=await repurposeSource({sourceText:body.sourceText,language:mission.input.language,product});const groupId=crypto.randomUUID();
    const drafts=distributionStore.addContent(items.map(item=>({missionId:mission.id,channel:item.channel,language:mission.input.language,title:item.title,body:item.body,callToAction:item.callToAction,status:"draft" as const,format:item.format,pillar:item.pillar,contentGroupId:groupId,requiresMedia:item.requiresMedia})));
    return NextResponse.json({ok:true,groupId,drafts});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Repurposing failed"},{status:500});}
}
