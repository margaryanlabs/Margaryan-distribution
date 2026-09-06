import { evaluateExecution } from "@/lib/compliance";
import { executeDistributionAction } from "@/lib/agent/executor";
import { checkDailyExecutionLimit } from "@/lib/limits";
import { classifyExecutionError,nextRetry } from "@/lib/retry";
import { distributionStore } from "@/lib/store";
import type { ExecuteRequest } from "@/lib/types";

function syncMeetingBooking(payload:Record<string,unknown>,result:unknown){
  if(typeof payload.meetingId!=="string"||!result||typeof result!=="object")return;
  const data=result as{id?:unknown;htmlLink?:unknown;hangoutLink?:unknown;conferenceData?:{entryPoints?:Array<{entryPointType?:string;uri?:string}>}};
  const meetLink=typeof data.hangoutLink==="string"?data.hangoutLink:data.conferenceData?.entryPoints?.find(x=>x.entryPointType==="video")?.uri;
  distributionStore.updateMeeting(payload.meetingId,{status:"booked",calendarEventId:typeof data.id==="string"?data.id:undefined,calendarHtmlLink:typeof data.htmlLink==="string"?data.htmlLink:undefined,meetLink,error:undefined});
}

export async function runDueAutoActions(limit=10){
  const now=new Date().toISOString();
  const due=distributionStore.listActions().filter(action=>(action.status==="queued"||action.status==="approved")&&action.mode==="AUTO"&&action.scheduledAt<=now).slice(0,Math.max(1,Math.min(50,limit)));
  const results:Array<Record<string,unknown>>=[];
  for(const action of due){
    const daily=checkDailyExecutionLimit(action.channel,action.kind);if(!daily.allowed){distributionStore.updateAction(action.recordId,{status:"blocked",error:daily.reason});results.push({id:action.recordId,status:"blocked",reason:daily.reason});continue;}
    const claimed=distributionStore.updateAction(action.recordId,{status:"running"});if(!claimed)continue;
    const leadId=typeof action.payload.leadId==="string"?action.payload.leadId:undefined;const lead=leadId?distributionStore.getLead(leadId):undefined;
    const payload:Record<string,unknown>={...action.payload,missionId:action.missionId,actionId:action.recordId,leadLanguage:lead?.language};
    const request:ExecuteRequest={channel:action.channel,kind:action.kind,mode:"AUTO",payload,policyContext:{optedOut:Boolean(lead?.optedOut||payload.optedOut===true),doNotCall:Boolean(lead?.doNotCall||payload.doNotCall===true),jurisdictionVerified:payload.jurisdictionVerified===true,withinAllowedHours:payload.withinAllowedHours===true}};
    const gate=evaluateExecution(request);
    if(!gate.allowed){distributionStore.updateAction(action.recordId,{status:"blocked",error:gate.reason});results.push({id:action.recordId,status:"blocked",reason:gate.reason});continue;}
    try{
      const result=await executeDistributionAction(request);const simulated=typeof result==="object"&&result!==null&&"simulated" in result&&Boolean((result as {simulated?:boolean}).simulated);
      distributionStore.updateAction(action.recordId,{status:"succeeded",result,executedAt:new Date().toISOString(),error:undefined});
      if(!simulated&&action.kind==="publish_post"&&typeof payload.contentId==="string")distributionStore.updateContent(payload.contentId,{status:"published"});
      if(!simulated&&action.channel==="email"&&action.kind==="send_email"&&leadId&&lead&&!["replied","qualified","meeting","won","lost","do_not_contact"].includes(lead.stage))distributionStore.updateLead(leadId,{stage:"contacted"});
      if(!simulated&&action.channel==="calendar"&&action.kind==="book_meeting")syncMeetingBooking(payload,result);
      if(!simulated&&action.channel==="voice"&&action.kind==="call"&&typeof result==="object"&&result!==null&&"sid" in result&&typeof (result as {sid?:unknown}).sid==="string"){
        const provider=result as {sid:string;status?:string};
        distributionStore.upsertCall({callSid:provider.sid,missionId:action.missionId,leadId,actionId:action.recordId,objective:typeof payload.objective==="string"?payload.objective:action.objective,status:"initiated",providerStatus:provider.status||"queued",transcript:[],startedAt:new Date().toISOString()});
      }
      results.push({id:action.recordId,status:"succeeded",channel:action.channel,kind:action.kind,simulated});
    }catch(error){
      const message=error instanceof Error?error.message:"unknown error";const classification=classifyExecutionError(message);const retry=nextRetry(action.retryCount);
      if(classification.transient&&retry.retry){const scheduledAt=new Date(Date.now()+retry.delayMs).toISOString();distributionStore.updateAction(action.recordId,{status:"queued",error:`Retry scheduled: ${message}`,retryCount:retry.nextCount,scheduledAt});results.push({id:action.recordId,status:"retry_scheduled",retryCount:retry.nextCount,scheduledAt,error:message});continue;}
      distributionStore.updateAction(action.recordId,{status:classification.transient?"dead_letter":"failed",error:message,retryCount:retry.nextCount});
      if(action.kind==="publish_post"&&typeof payload.contentId==="string")distributionStore.updateContent(payload.contentId,{status:"failed"});
      if(action.channel==="calendar"&&typeof payload.meetingId==="string")distributionStore.updateMeeting(payload.meetingId,{status:"failed",error:message});
      results.push({id:action.recordId,status:classification.transient?"dead_letter":"failed",error:message});
    }
  }
  return{processed:results.length,results};
}