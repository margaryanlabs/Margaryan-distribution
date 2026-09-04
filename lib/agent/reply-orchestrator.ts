import { classifyInboundReply } from "@/lib/agent/replies";
import { distributionStore } from "@/lib/store";
import type { InboundReply, Lead, PlannedAction } from "@/lib/types";

export function extractEmailAddress(value:string){const angle=value.match(/<([^>]+)>/);const candidate=(angle?.[1]||value).trim();const plain=candidate.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);return plain?.[0]?.toLowerCase()||"";}

export async function ingestInboundReply(input:{externalId:string;threadId?:string;messageId?:string;from:string;subject:string;text:string;receivedAt?:string;lead?:Lead;isSimulation?:boolean}){
  if(distributionStore.hasReplyExternalId(input.externalId))return{duplicate:true,reply:distributionStore.listReplies().find(item=>item.externalId===input.externalId),queued:[]};
  const email=extractEmailAddress(input.from);const lead=input.lead||distributionStore.findLeadByEmail(email);if(!lead)throw new Error("Inbound sender is not a known lead");
  const mission=lead.missionId?distributionStore.getMission(lead.missionId):undefined;const product=mission?.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
  const decision=await classifyInboundReply({from:input.from,subject:input.subject,text:input.text,language:lead.language,lead,mission,product});
  const now=new Date();const receivedAt=input.receivedAt||now.toISOString();
  distributionStore.stopPendingLeadActions(lead.id,`Stopped after inbound reply (${decision.intent})`);
  const nextActionAt=decision.nextActionDelayHours>0?new Date(now.getTime()+decision.nextActionDelayHours*3600000).toISOString():undefined;
  const patch:Partial<Lead>={lastReplyAt:receivedAt,nextAction:decision.recommendedAction,nextActionAt};
  if(decision.intent==="unsubscribe"){patch.stage="do_not_contact";patch.optedOut=true;patch.doNotCall=true;}
  else if(decision.intent==="negative"){patch.stage="lost";}
  else if(decision.intent==="positive"||decision.intent==="question"){patch.stage="replied";}
  distributionStore.updateLead(lead.id,patch);

  const planned:PlannedAction[]=[];
  const missionId=lead.missionId||mission?.id;
  if(missionId&&(decision.intent==="positive"||decision.intent==="question")&&decision.draftReply&&lead.email){planned.push({id:`reply-${input.externalId}`,channel:"email",kind:"reply",objective:`Reply to ${lead.company}`,rationale:`Inbound ${decision.intent} reply requires a context-aware response`,mode:"APPROVE",scheduledOffsetHours:0,payload:{leadId:lead.id,to:lead.email,subject:/^re:/i.test(input.subject)?input.subject:`Re: ${input.subject}`,body:decision.draftReply,replyToMessageId:input.messageId||"",references:input.messageId||""}});}
  if(missionId&&decision.recommendedAction==="call"&&lead.phone){planned.push({id:`reply-call-${input.externalId}`,channel:"voice",kind:"call",objective:`Call ${lead.company} after inbound interest`,rationale:"Call only after explicit interest and compliance verification",mode:"BLOCKED",scheduledOffsetHours:0,payload:{leadId:lead.id,to:lead.phone,leadName:lead.company,objective:decision.summary}});}
  if(missionId&&decision.intent==="ooo"&&lead.email){const sequence=distributionStore.listOutreach().find(item=>item.leadId===lead.id);if(sequence){planned.push({id:`ooo-followup-${input.externalId}`,channel:"email",kind:"send_email",objective:`Resume follow-up — ${lead.company}`,rationale:"Out-of-office response: wait before resuming the sequence",mode:"APPROVE",scheduledOffsetHours:Math.max(24,decision.nextActionDelayHours||120),payload:{leadId:lead.id,to:lead.email,subject:sequence.emailFollowup.subject,body:sequence.emailFollowup.body}});}}
  const queued=missionId&&planned.length?distributionStore.enqueueActions(missionId,planned):[];
  const status:InboundReply["status"]=decision.recommendedAction==="stop"?"stopped":queued.length?"actioned":"reviewed";
  const reply=distributionStore.addReply({externalId:input.externalId,threadId:input.threadId,messageId:input.messageId,missionId,leadId:lead.id,channel:"email",from:input.from,subject:input.subject,text:input.text,receivedAt,decision,status});
  if(missionId&&!input.isSimulation){distributionStore.addPerformance({missionId,channel:"email",source:"system",metrics:{replies:1,positiveReplies:decision.intent==="positive"?1:0},occurredAt:receivedAt,note:`Verified inbound email reply classified as ${decision.intent}`});}
  return{duplicate:false,reply,queued,lead:distributionStore.getLead(lead.id)};
}
