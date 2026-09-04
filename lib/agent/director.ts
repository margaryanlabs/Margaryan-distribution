import { runDueAutoActions } from "@/lib/agent/action-runner";
import { pollKnownLeadGmail } from "@/lib/agent/inbox-poller";
import { generateLearningReport } from "@/lib/agent/learning";
import { prepareLeadOutreach } from "@/lib/agent/outreach-queue";
import { researchBusinessLeads } from "@/lib/agent/research";
import { prepareSmmCampaign } from "@/lib/agent/smm-queue";
import { distributionStore } from "@/lib/store";
import type { Language } from "@/lib/types";

export interface AutopilotOptions{missionId?:string;leadTarget?:number;researchPerTick?:number;outreachPerTick?:number;smmDays?:number;pollInbox?:boolean;runActions?:boolean;}

export async function runAutopilot(options:AutopilotOptions={}){
  const leadTarget=Math.max(1,Math.min(50,Math.round(options.leadTarget||8)));const researchPerTick=Math.max(1,Math.min(10,Math.round(options.researchPerTick||5)));const outreachPerTick=Math.max(1,Math.min(10,Math.round(options.outreachPerTick||3)));const smmDays=Math.max(3,Math.min(14,Math.round(options.smmDays||7)));const startedAt=new Date().toISOString();
  const report:{startedAt:string;inbox?:unknown;missions:Array<Record<string,unknown>>;execution?:unknown;finishedAt?:string}={startedAt,missions:[]};
  if(options.pollInbox!==false){try{report.inbox=await pollKnownLeadGmail(25);}catch(error){report.inbox={error:error instanceof Error?error.message:"Inbox polling failed"};}}
  const missions=distributionStore.listMissions().filter(mission=>mission.status==="active"&&(!options.missionId||mission.id===options.missionId)).slice(0,5);
  for(const mission of missions){
    const missionReport:Record<string,unknown>={missionId:mission.id,name:mission.plan.missionName,steps:[] as Array<Record<string,unknown>>};const steps=missionReport.steps as Array<Record<string,unknown>>;const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
    let leads=distributionStore.listLeads().filter(lead=>lead.missionId===mission.id);
    if(leads.length<leadTarget){if(process.env.OPENAI_API_KEY){try{const requested=Math.min(researchPerTick,leadTarget-leads.length);const candidates=await researchBusinessLeads(mission,requested,product);const added=distributionStore.addLeads(candidates.map(candidate=>({...candidate,missionId:mission.id,language:mission.input.language as Language,stage:"researched" as const})));steps.push({stage:"research",requested,researched:candidates.length,added:added.length});leads=distributionStore.listLeads().filter(lead=>lead.missionId===mission.id);}catch(error){steps.push({stage:"research",error:error instanceof Error?error.message:"Lead research failed"});}}else steps.push({stage:"research",skipped:"OPENAI_API_KEY is not configured"});}else steps.push({stage:"research",skipped:"Lead target already reached",count:leads.length});
    const existingSequences=new Set(distributionStore.listOutreach().filter(item=>item.missionId===mission.id).map(item=>item.leadId));const outreachCandidates=leads.filter(lead=>!existingSequences.has(lead.id)&&!lead.optedOut&&lead.stage!=="do_not_contact"&&(lead.score||0)>=55).sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,outreachPerTick);let prepared=0;
    for(const lead of outreachCandidates){try{const result=await prepareLeadOutreach(mission,lead,product);if(result.sequence)prepared++;}catch(error){steps.push({stage:"outreach",leadId:lead.id,company:lead.company,error:error instanceof Error?error.message:"Outreach preparation failed"});}}steps.push({stage:"outreach",eligible:outreachCandidates.length,prepared});
    const evidence=distributionStore.listPerformance().filter(event=>event.missionId===mission.id);const latestLearning=distributionStore.listLearnings().find(item=>item.missionId===mission.id);
    if(evidence.length&&(!latestLearning||latestLearning.evidenceEventIds.length<evidence.length)){try{const learning=await generateLearningReport(mission.id);steps.push({stage:"learning",events:evidence.length,reportId:learning.id,topChannel:learning.channelRankings[0]?.key,topPillar:learning.pillarRankings[0]?.key});}catch(error){steps.push({stage:"learning",error:error instanceof Error?error.message:"Learning pass failed"});}}else steps.push({stage:"learning",skipped:evidence.length?"No new evidence since latest learning pass":"No factual performance evidence yet"});
    const nowIso=new Date().toISOString();const campaignActions=distributionStore.listActions().filter(action=>action.missionId===mission.id&&action.kind==="publish_post");const hasPendingCampaign=campaignActions.some(action=>["queued","approved","running"].includes(action.status)||(action.status==="blocked"&&action.scheduledAt>nowIso));
    if(!hasPendingCampaign){try{const campaign=await prepareSmmCampaign(mission,smmDays);steps.push({stage:"smm",created:campaign.drafts.length,queued:campaign.queued.length,groupId:campaign.groupId,learningApplied:campaign.learningApplied});}catch(error){steps.push({stage:"smm",error:error instanceof Error?error.message:"SMM campaign failed"});}}else steps.push({stage:"smm",skipped:"Current campaign still has pending work",pending:campaignActions.filter(action=>["queued","approved","running"].includes(action.status)).length});
    missionReport.leads=leads.length;missionReport.outreachPrepared=distributionStore.listOutreach().filter(item=>item.missionId===mission.id).length;missionReport.contentAssets=distributionStore.listContent().filter(item=>item.missionId===mission.id).length;report.missions.push(missionReport);
  }
  if(options.runActions!==false){try{report.execution=await runDueAutoActions(20);}catch(error){report.execution={error:error instanceof Error?error.message:"Action runner failed"};}}
  report.finishedAt=new Date().toISOString();return report;
}
