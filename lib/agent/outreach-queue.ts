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
  const emailMode=(quality:typeof initialQuality):PlannedAction["mode"]=>{
    if(!lead.email||!quality.pass)return"BLOCKED";
    return mission.input.autonomy==="auto"?"AUTO":"APPROVE";
  };
  const qualityPayload=(quality:typeof initialQuality)=>({qualityScore:quality.score,qualityIssues:quality.issues});
  const initialActionId=`email-initial-${lead.id}`;
  const followupActionId=`email-followup-${lead.id}`;
  const voiceDependency=lead.email?{dependsOnActionId:initialActionId}:{};
  const actions:PlannedAction[]=[
    {id:initialActionId,channel:"email",kind:"send_email",objective:`First touch — ${lead.company}`,rationale:initialQuality.pass?"Personalized one-to-one outreach passed quality gate":"Quality gate failed before first-touch execution",mode:emailMode(initialQuality),scheduledOffsetHours:0,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailInitial.subject,body:draft.emailInitial.body,sequenceType:"cold",sequenceStep:1,...qualityPayload(initialQuality)}},
    {id:followupActionId,channel:"email",kind:"send_email",objective:`Follow-up — ${lead.company}`,rationale:followupQuality.pass?"Measured follow-up passed quality gate and waits for a successful first touch":"Quality gate failed before follow-up execution",mode:emailMode(followupQuality),scheduledOffsetHours:72,payload:{leadId:lead.id,to:lead.email||"",subject:draft.emailFollowup.subject,body:draft.emailFollowup.body,sequenceType:"cold",sequenceStep:2,dependsOnActionId:initialActionId,...qualityPayload(followupQuality)}},
    {id:`voice-${lead.id}`,channel:"voice",kind:"call",objective:`Qualify ${lead.company}`,rationale:voiceQuality.pass?(lead.email?"Voice waits for a successful first touch and remains blocked until jurisdiction, DNC and permitted calling hours are verified":"Voice-first fallback remains blocked until jurisdiction, DNC and permitted calling hours are verified"):`Voice copy quality gate failed (${voiceQuality.score}/100)`,mode:"BLOCKED",scheduledOffsetHours:24,payload:{leadId:lead.id,to:lead.phone||"",leadName:lead.company,objective:draft.callOpening,sequenceType:"cold",sequenceStep:2,...voiceDependency,jurisdictionVerified:false,withinAllowedHours:false,...qualityPayload(voiceQuality)}}
  ];
  const queued=distributionStore.enqueueActions(mission.id,actions);
  const linkedInManual=lead.linkedinUrl&&linkedInQuality.pass?{channel:"linkedin" as const,url:lead.linkedinUrl,draft:draft.linkedinDraft,qualityScore:linkedInQuality.score,note:"Prepared for operator-assisted outreach because the connected LinkedIn executor supports publishing, not arbitrary cold DMs."}:undefined;
  if(linkedInManual&&!lead.nextAction)distributionStore.updateLead(lead.id,{nextAction:"Review LinkedIn draft"});
  return{sequence,queued,existing:false,linkedInManual,quality:{emailInitial:initialQuality,emailFollowup:followupQuality,linkedin:linkedInQuality,voice:voiceQuality}};
}
