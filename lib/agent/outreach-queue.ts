import { composeOutreachSequence } from "@/lib/agent/outreach";
import { assessDistributionCopy } from "@/lib/agent/quality-gate";
import { distributionStore } from "@/lib/store";
import type { Lead, MissionRecord, PlannedAction, ProductRecord } from "@/lib/types";

export async function prepareLeadOutreach(mission:MissionRecord,lead:Lead,product?:ProductRecord){
  const existing=distributionStore.listOutreach().find(item=>item.missionId===mission.id&&item.leadId===lead.id);
  if(existing)return{sequence:existing,queued:[],existing:true};
  if(lead.optedOut||lead.stage==="do_not_contact")return{sequence:undefined,queued:[],existing:false,skipped:"Lead is opted out"};
  const draft=await composeOutreachSequence(mission,lead,product);
  const sequence=distributionStore.addOutreach({...draft,missionId:mission.id,leadId:lead.id,language:mission.input.language});
  const initialQuality=assessDistributionCopy({text:draft.emailInitial.body,subject:draft.emailInitial.subject,channel:"email",product,lead});
  const followupQuality=assessDistributionCopy({text:draft.emailFollowup.body,subject:draft.emailFollowup.subject,channel:"email",product,lead});
  const linkedInQuality=assessDistributionCopy({text:draft.linkedinDraft,channel:"linkedin",product,lead});
  const voiceQuality=assessDistributionCopy({text:draft.callOpening,channel:"voice",product,lead});
  const emailMode=(quality:typeof initialQuality):PlannedAction["mode"]=>lead.email&&quality.pass?"APPROVE":"BLOCKED";
  const qualityPayload=(quality:typeof initialQuality)=>({qualityScore:quality.score,qualityIssues:quality.issues});
  const actions:PlannedAction[]=[
    {id:`email-initial-${lead.id}`,channel:"email",kind:"send_email",objective:`First touch — ${lead.company}`,rationale:initialQuality.pass?"Personalized one-to-one outreach passed quality gate":"Quality gate failed before first-touch approval",mode:emailMode(initialQuality),scheduledOffsetHours:0,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailInitial.subject,body:draft.emailInitial.body,...qualityPayload(initialQuality)}},
    {id:`email-followup-${lead.id}`,channel:"email",kind:"send_email",objective:`Follow-up — ${lead.company}`,rationale:followupQuality.pass?"Measured follow-up passed quality gate":"Quality gate failed before follow-up approval",mode:emailMode(followupQuality),scheduledOffsetHours:72,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailFollowup.subject,body:draft.emailFollowup.body,...qualityPayload(followupQuality)}},
    {id:`voice-${lead.id}`,channel:"voice",kind:"call",objective:`Qualify ${lead.company}`,rationale:voiceQuality.pass?"Voice stays blocked until jurisdiction, DNC and permitted calling hours are verified":`Voice copy quality gate failed (${voiceQuality.score}/100)`,mode:"BLOCKED",scheduledOffsetHours:24,payload:{leadId:lead.id,to:lead.phone||"",leadName:lead.company,objective:draft.callOpening,jurisdictionVerified:false,withinAllowedHours:false,...qualityPayload(voiceQuality)}}
  ];
  const queued=distributionStore.enqueueActions(mission.id,actions);
  return{sequence,queued,existing:false,quality:{emailInitial:initialQuality,emailFollowup:followupQuality,linkedin:linkedInQuality,voice:voiceQuality}};
}
