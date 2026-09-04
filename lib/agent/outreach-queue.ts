import { composeOutreachSequence } from "@/lib/agent/outreach";
import { distributionStore } from "@/lib/store";
import type { Lead, MissionRecord, PlannedAction, ProductRecord } from "@/lib/types";

export async function prepareLeadOutreach(mission:MissionRecord,lead:Lead,product?:ProductRecord){
  const existing=distributionStore.listOutreach().find(item=>item.missionId===mission.id&&item.leadId===lead.id);
  if(existing)return{sequence:existing,queued:[],existing:true};
  if(lead.optedOut||lead.stage==="do_not_contact")return{sequence:undefined,queued:[],existing:false,skipped:"Lead is opted out"};
  const draft=await composeOutreachSequence(mission,lead,product);
  const sequence=distributionStore.addOutreach({...draft,missionId:mission.id,leadId:lead.id,language:mission.input.language});
  const emailMode:PlannedAction["mode"]=lead.email?"APPROVE":"BLOCKED";
  const actions:PlannedAction[]=[
    {id:`email-initial-${lead.id}`,channel:"email",kind:"send_email",objective:`First touch — ${lead.company}`,rationale:"Personalized one-to-one outreach from verified product and lead context",mode:emailMode,scheduledOffsetHours:0,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailInitial.subject,body:draft.emailInitial.body}},
    {id:`email-followup-${lead.id}`,channel:"email",kind:"send_email",objective:`Follow-up — ${lead.company}`,rationale:"One measured follow-up to close the loop without repeated pressure",mode:emailMode,scheduledOffsetHours:72,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailFollowup.subject,body:draft.emailFollowup.body}},
    {id:`voice-${lead.id}`,channel:"voice",kind:"call",objective:`Qualify ${lead.company}`,rationale:"Voice stays blocked until jurisdiction, DNC and permitted calling hours are verified",mode:"BLOCKED",scheduledOffsetHours:24,payload:{leadId:lead.id,to:lead.phone||"",leadName:lead.company,objective:draft.callOpening,jurisdictionVerified:false,withinAllowedHours:false}}
  ];
  const queued=distributionStore.enqueueActions(mission.id,actions);
  return{sequence,queued,existing:false};
}
