import { NextResponse } from "next/server";
import { buildSmmCampaign } from "@/lib/agent/smm";
import { distributionStore } from "@/lib/store";
import type { PlannedAction } from "@/lib/types";

function splitThread(body:string){
  const numbered=body.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^\d+\s*[/.)-]/.test(line));
  if(numbered.length>=2)return numbered.slice(0,12);
  const paragraphs=body.split(/\n\s*\n|\r?\n/).map(part=>part.trim()).filter(Boolean);
  if(paragraphs.length>=2)return paragraphs.slice(0,12);
  return[body.trim()];
}

export async function POST(req:Request){
  try{
    const body=await req.json() as {missionId?:string;days?:number};if(!body.missionId)return NextResponse.json({error:"missionId is required"},{status:400});
    const mission=distributionStore.getMission(body.missionId);if(!mission)return NextResponse.json({error:"Mission not found"},{status:404});
    const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;const items=await buildSmmCampaign(mission,product,body.days||7);const groupId=crypto.randomUUID();
    const drafts=distributionStore.addContent(items.map(item=>({missionId:mission.id,channel:item.channel,language:mission.input.language,title:item.title,body:item.body,callToAction:item.callToAction,status:"draft" as const,scheduledAt:new Date(Date.now()+item.scheduledOffsetHours*3600000).toISOString(),format:item.format,pillar:item.pillar,contentGroupId:groupId,requiresMedia:item.requiresMedia})));
    const actions:PlannedAction[]=items.map((item,index)=>{const draft=drafts[index];let mode:"APPROVE"|"BLOCKED"="APPROVE";let rationale="Public brand action requires approval before scheduled execution";if(mission.input.autonomy==="draft"){mode="BLOCKED";rationale="Mission is draft-only";}if(item.channel==="instagram"&&item.requiresMedia){mode="BLOCKED";rationale="Instagram creative asset required before publishing";}
      const payload=item.channel==="x"?(item.format==="thread"?{contentId:draft.id,threadPosts:splitThread(item.body)}:{contentId:draft.id,text:item.body}):item.channel==="linkedin"?{contentId:draft.id,commentary:item.body}:{contentId:draft.id,caption:item.body,mediaUrl:""};
      return{id:`smm-${groupId}-${index}`,channel:item.channel,kind:"publish_post",objective:`Publish ${item.title}`,rationale,mode,scheduledOffsetHours:item.scheduledOffsetHours,payload};
    });
    const queued=distributionStore.enqueueActions(mission.id,actions);return NextResponse.json({ok:true,groupId,drafts,queued});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"SMM campaign generation failed"},{status:500});}
}
