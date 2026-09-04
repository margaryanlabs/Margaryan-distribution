import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { evaluateExecution } from "@/lib/compliance";
import { executeProviderAction } from "@/lib/integrations";
import { checkDailyExecutionLimit } from "@/lib/limits";
import type { ExecuteRequest } from "@/lib/types";

function syncMeetingBooking(payload:Record<string,unknown>,result:unknown){
  if(typeof payload.meetingId!=="string"||!result||typeof result!=="object")return;
  const data=result as{id?:unknown;htmlLink?:unknown;hangoutLink?:unknown;conferenceData?:{entryPoints?:Array<{entryPointType?:string;uri?:string}>}};
  const meetLink=typeof data.hangoutLink==="string"?data.hangoutLink:data.conferenceData?.entryPoints?.find(x=>x.entryPointType==="video")?.uri;
  distributionStore.updateMeeting(payload.meetingId,{status:"booked",calendarEventId:typeof data.id==="string"?data.id:undefined,calendarHtmlLink:typeof data.htmlLink==="string"?data.htmlLink:undefined,meetLink,error:undefined});
}

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
  const{id}=await context.params;const action=distributionStore.getAction(id);if(!action)return NextResponse.json({error:"Action not found"},{status:404});
  if(!["approved","queued","failed"].includes(action.status))return NextResponse.json({error:`Cannot execute action in ${action.status} state`},{status:409});
  const daily=checkDailyExecutionLimit(action.channel,action.kind);if(!daily.allowed){distributionStore.updateAction(id,{status:"blocked",error:daily.reason});return NextResponse.json({error:daily.reason},{status:429});}
  const leadId=typeof action.payload.leadId==="string"?action.payload.leadId:undefined;const lead=leadId?distributionStore.getLead(leadId):undefined;
  const payload:Record<string,unknown>={...action.payload,missionId:action.missionId,actionId:action.recordId,leadLanguage:lead?.language};
  const request:ExecuteRequest={channel:action.channel,kind:action.kind,mode:action.mode,payload,policyContext:{optedOut:Boolean(lead?.optedOut||payload.optedOut===true),doNotCall:Boolean(lead?.doNotCall||payload.doNotCall===true),jurisdictionVerified:payload.jurisdictionVerified===true,withinAllowedHours:payload.withinAllowedHours===true}};
  const gate=evaluateExecution(request);if(!gate.allowed){distributionStore.updateAction(id,{status:action.mode==="APPROVE"?"queued":"blocked",error:gate.reason});return NextResponse.json({error:gate.reason},{status:409});}
  distributionStore.updateAction(id,{status:"running",error:undefined});
  try{
    const result=await executeProviderAction(request);const simulated=typeof result==="object"&&result!==null&&"simulated" in result&&Boolean((result as{simulated?:boolean}).simulated);const updated=distributionStore.updateAction(id,{status:"succeeded",result,executedAt:new Date().toISOString(),error:undefined});
    if(!simulated&&action.kind==="publish_post"&&typeof payload.contentId==="string")distributionStore.updateContent(payload.contentId,{status:"published"});
    if(!simulated&&action.channel==="email"&&action.kind==="send_email"&&leadId&&lead&&!["replied","qualified","meeting","won","lost","do_not_contact"].includes(lead.stage))distributionStore.updateLead(leadId,{stage:"contacted"});
    if(!simulated&&action.channel==="calendar"&&action.kind==="book_meeting")syncMeetingBooking(payload,result);
    if(!simulated&&action.channel==="voice"&&action.kind==="call"&&typeof result==="object"&&result!==null&&"sid" in result&&typeof(result as{sid?:unknown}).sid==="string"){
      const provider=result as{sid:string;status?:string};distributionStore.upsertCall({callSid:provider.sid,missionId:action.missionId,leadId,actionId:action.recordId,objective:typeof payload.objective==="string"?payload.objective:action.objective,status:"initiated",providerStatus:provider.status||"queued",transcript:[],startedAt:new Date().toISOString()});
    }
    return NextResponse.json({action:updated,result});
  }catch(error){const message=error instanceof Error?error.message:"Execution failed";distributionStore.updateAction(id,{status:"failed",error:message,retryCount:action.retryCount+1});if(action.channel==="calendar"&&typeof payload.meetingId==="string")distributionStore.updateMeeting(payload.meetingId,{status:"failed",error:message});return NextResponse.json({error:message},{status:500});}
}
