import { summarizeSalesConversation } from "@/lib/agent/summarize";
import { proposeMeeting } from "@/lib/agent/meeting-orchestrator";
import { distributionStore } from "@/lib/store";
import type { CallSummary, Lead, PlannedAction, VoiceTranscriptTurn } from "@/lib/types";

function transcriptText(turns:VoiceTranscriptTurn[]){return turns.filter(turn=>turn.text.trim()).map(turn=>`${turn.speaker.toUpperCase()}: ${turn.text.trim()}`).join("\n");}
function hoursUntil(value?:string){if(!value)return 0;const time=Date.parse(value);if(!Number.isFinite(time))return 0;return Math.max(0,(time-Date.now())/3600000);}
function noAnswerSummary(language:"en"|"ru"):CallSummary{return{language,outcome:"no_answer",summary:language==="ru"?"Содержательная речь клиента не была зафиксирована.":"No meaningful prospect speech was captured.",needs:[],objections:[],commitments:[],nextAction:language==="ru"?"Проверить доставку звонка перед повторной попыткой.":"Review call delivery before retrying.",urgency:"low"};}
function followUpBody(lead:Lead,summary:CallSummary){const ru=lead.language==="ru";const next=summary.nextAction.trim();return ru?`Здравствуйте. Спасибо за разговор. Зафиксировал следующий шаг: ${next||"продолжить обсуждение в согласованном формате"}. Если я что-то понял неверно, пожалуйста, поправьте.`:`Hi — thanks for the conversation. I noted the next step as: ${next||"continue the discussion in the agreed format"}. If I captured anything incorrectly, please correct me.`;}

export async function ingestCompletedVoiceCall(input:{callSid:string;streamSid?:string;missionId?:string;leadId?:string;actionId?:string;objective?:string;transcript:VoiceTranscriptTurn[];startedAt?:string;completedAt?:string}){
  if(!input.callSid)throw new Error("callSid is required");
  const existing=distributionStore.getCallBySid(input.callSid);if(existing?.summary)return{duplicate:true,call:existing,queued:[]};
  const lead=input.leadId?distributionStore.getLead(input.leadId):undefined;const missionId=input.missionId||lead?.missionId;
  const completedAt=input.completedAt||new Date().toISOString();
  distributionStore.upsertCall({callSid:input.callSid,streamSid:input.streamSid||existing?.streamSid,missionId,leadId:input.leadId||lead?.id,actionId:input.actionId,objective:input.objective,status:"completed",providerStatus:"completed",transcript:input.transcript||[],startedAt:input.startedAt||existing?.startedAt,answeredAt:existing?.answeredAt,completedAt,durationSeconds:existing?.durationSeconds});
  const prospectText=(input.transcript||[]).filter(turn=>turn.speaker==="prospect").map(turn=>turn.text.trim()).filter(Boolean).join(" ");
  try{
    const summary=prospectText?await summarizeSalesConversation(transcriptText(input.transcript||[])):noAnswerSummary(lead?.language||"en");
    const call=distributionStore.updateCallBySid(input.callSid,{status:"summarized",summary,error:undefined});
    const queued:ReturnType<typeof distributionStore.enqueueActions>=[];
    let meetingProposal;
    if(lead){
      const patch:Partial<Lead>={nextAction:summary.nextAction,nextActionAt:summary.nextActionAt};
      if(summary.outcome==="do_not_contact"){patch.stage="do_not_contact";patch.optedOut=true;patch.doNotCall=true;distributionStore.stopPendingLeadActions(lead.id,"Stopped after explicit do-not-contact request on voice call");}
      else if(summary.outcome==="not_interested"){patch.stage="lost";distributionStore.stopPendingLeadActions(lead.id,"Stopped after prospect rejected the offer on voice call");}
      else if(summary.outcome==="meeting"){patch.stage="meeting";distributionStore.stopPendingLeadActions(lead.id,"Cold sequence stopped after meeting agreement");}
      else if(summary.outcome==="qualified"){patch.stage="qualified";distributionStore.stopPendingLeadActions(lead.id,"Cold sequence stopped after qualification");}
      else if(summary.outcome==="follow_up"){patch.stage="replied";distributionStore.stopPendingLeadActions(lead.id,"Cold sequence stopped after live conversation");}
      else if(summary.outcome==="no_answer"){patch.nextAction=summary.nextAction||"retry_call";patch.nextActionAt=summary.nextActionAt||new Date(Date.now()+24*3600000).toISOString();}
      distributionStore.updateLead(lead.id,patch);
      if(missionId&&summary.outcome==="meeting"&&summary.nextActionAt&&Number.isFinite(Date.parse(summary.nextActionAt))&&lead.email){
        meetingProposal=proposeMeeting({missionId,leadId:lead.id,start:summary.nextActionAt,timezone:lead.timezone,sourceCallSid:input.callSid,title:`Demo / conversation — ${lead.company}`,notes:`Explicit meeting agreement from voice call ${input.callSid}. ${summary.summary}`});
      }
      if(missionId&&["follow_up","qualified","meeting"].includes(summary.outcome)&&lead.email){
        const action:PlannedAction={id:`voice-followup-${input.callSid}`,channel:"email",kind:"send_email",objective:`Post-call follow-up — ${lead.company}`,rationale:"Follow-up is grounded in a completed live conversation and still requires approval",mode:"APPROVE",scheduledOffsetHours:hoursUntil(summary.nextActionAt),payload:{leadId:lead.id,to:lead.email,subject:lead.language==="ru"?`После разговора — ${lead.company}`:`Follow-up — ${lead.company}`,body:followUpBody(lead,summary),sourceCallSid:input.callSid}};
        queued.push(...distributionStore.enqueueActions(missionId,[action]));
      }
      if(missionId&&summary.outcome==="meeting")distributionStore.addPerformance({missionId,actionId:input.actionId,channel:"voice",source:"system",metrics:{meetings:1},occurredAt:completedAt,note:`Meeting explicitly agreed in voice call ${input.callSid}`});
    }
    return{duplicate:false,call,summary,meetingProposal,lead:lead?distributionStore.getLead(lead.id):undefined,queued};
  }catch(error){const message=error instanceof Error?error.message:"Voice call summarization failed";const call=distributionStore.updateCallBySid(input.callSid,{status:"failed",error:message});return{duplicate:false,call,queued:[],error:message};}
}
