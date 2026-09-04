import { buildSmmCampaign } from "@/lib/agent/smm";
import { assessDistributionCopy } from "@/lib/agent/quality-gate";
import { distributionStore } from "@/lib/store";
import type { MissionRecord, PlannedAction } from "@/lib/types";

function splitThread(body:string){
  const numbered=body.split(/\r?\n/).map(line=>line.trim()).filter(line=>/^\d+\s*[/.)-]/.test(line));
  if(numbered.length>=2)return numbered.slice(0,12);
  const paragraphs=body.split(/\n\s*\n|\r?\n/).map(part=>part.trim()).filter(Boolean);
  return paragraphs.length>=2?paragraphs.slice(0,12):[body.trim()];
}

function adaptiveSchedule(missionId:string,items:Awaited<ReturnType<typeof buildSmmCampaign>>){
  const learning=distributionStore.listLearnings().find(report=>report.missionId===missionId&&report.evidenceEventIds.length>0);
  if(!learning)return items;
  const topChannel=learning.channelRankings[0]?.key;const topPillar=learning.pillarRankings[0]?.key?.toLowerCase();
  const slots=items.map(item=>item.scheduledOffsetHours).sort((a,b)=>a-b);
  return[...items].sort((a,b)=>{
    const priority=(item:typeof a)=>Number(item.channel===topChannel)*2+Number(Boolean(topPillar&&item.pillar.toLowerCase().includes(topPillar)))*3;
    return priority(b)-priority(a)||a.scheduledOffsetHours-b.scheduledOffsetHours;
  }).map((item,index)=>({...item,scheduledOffsetHours:slots[index]??item.scheduledOffsetHours}));
}

export async function prepareSmmCampaign(mission:MissionRecord,days=7){
  const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
  const items=adaptiveSchedule(mission.id,await buildSmmCampaign(mission,product,days));const groupId=crypto.randomUUID();
  const assessments=items.map(item=>assessDistributionCopy({text:item.body,channel:item.channel,product}));
  const drafts=distributionStore.addContent(items.map((item,index)=>({missionId:mission.id,channel:item.channel,language:mission.input.language,title:item.title,body:item.body,callToAction:item.callToAction,status:"draft" as const,scheduledAt:new Date(Date.now()+item.scheduledOffsetHours*3600000).toISOString(),format:item.format,pillar:item.pillar,contentGroupId:groupId,requiresMedia:item.requiresMedia,qualityScore:assessments[index].score,qualityIssues:assessments[index].issues})));
  const actions:PlannedAction[]=items.map((item,index)=>{
    const draft=drafts[index],quality=assessments[index];let mode:PlannedAction["mode"]="APPROVE";let rationale="Public brand action requires approval before scheduled execution";
    if(!quality.pass){mode="BLOCKED";rationale=`Quality gate failed (${quality.score}/100): ${quality.issues.join("; ")}`;}
    if(mission.input.autonomy==="draft"){mode="BLOCKED";rationale="Mission is draft-only";}
    if(item.channel==="instagram"&&item.requiresMedia){mode="BLOCKED";rationale=`${quality.pass?"Quality passed. ":""}Instagram creative asset required before publishing`;}
    const basePayload={contentId:draft.id,qualityScore:quality.score,qualityIssues:quality.issues};
    const payload=item.channel==="x"?(item.format==="thread"?{...basePayload,threadPosts:splitThread(item.body)}:{...basePayload,text:item.body}):item.channel==="linkedin"?{...basePayload,commentary:item.body}:{...basePayload,caption:item.body,mediaUrl:""};
    return{id:`smm-${groupId}-${index}`,channel:item.channel,kind:"publish_post",objective:`Publish ${item.title}`,rationale,mode,scheduledOffsetHours:item.scheduledOffsetHours,payload};
  });
  const queued=distributionStore.enqueueActions(mission.id,actions);return{groupId,drafts,queued,quality:{passed:assessments.filter(x=>x.pass).length,blocked:assessments.filter(x=>!x.pass).length},learningApplied:Boolean(distributionStore.listLearnings().find(report=>report.missionId===mission.id&&report.evidenceEventIds.length>0))};
}
