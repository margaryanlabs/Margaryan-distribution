import { evaluateExecution } from "@/lib/compliance";
import { executeProviderAction } from "@/lib/integrations";
import { distributionStore } from "@/lib/store";
import type { ExecuteRequest } from "@/lib/types";

export async function runDueAutoActions(limit=10){
  const now=new Date().toISOString();
  const due=distributionStore.listActions().filter(action=>(action.status==="queued"||action.status==="approved")&&action.mode==="AUTO"&&action.scheduledAt<=now).slice(0,Math.max(1,Math.min(50,limit)));
  const results:Array<Record<string,unknown>>=[];
  for(const action of due){
    const claimed=distributionStore.updateAction(action.recordId,{status:"running"});if(!claimed)continue;
    const leadId=typeof action.payload.leadId==="string"?action.payload.leadId:undefined;const lead=leadId?distributionStore.getLead(leadId):undefined;
    const payload:Record<string,unknown>={...action.payload,missionId:action.missionId,actionId:action.recordId,leadLanguage:lead?.language};
    const request:ExecuteRequest={channel:action.channel,kind:action.kind,mode:"AUTO",payload,policyContext:{optedOut:Boolean(lead?.optedOut||payload.optedOut===true),doNotCall:Boolean(lead?.doNotCall||payload.doNotCall===true),jurisdictionVerified:payload.jurisdictionVerified===true,withinAllowedHours:payload.withinAllowedHours===true}};
    const gate=evaluateExecution(request);
    if(!gate.allowed){distributionStore.updateAction(action.recordId,{status:"blocked",error:gate.reason});results.push({id:action.recordId,status:"blocked",reason:gate.reason});continue;}
    try{
      const result=await executeProviderAction(request);const simulated=typeof result==="object"&&result!==null&&"simulated" in result&&Boolean((result as {simulated?:boolean}).simulated);
      distributionStore.updateAction(action.recordId,{status:"succeeded",result,executedAt:new Date().toISOString(),error:undefined});
      if(!simulated&&action.kind==="publish_post"&&typeof payload.contentId==="string")distributionStore.updateContent(payload.contentId,{status:"published"});
      if(!simulated&&action.channel==="email"&&action.kind==="send_email"&&leadId&&lead&&!["replied","qualified","meeting","won","lost","do_not_contact"].includes(lead.stage))distributionStore.updateLead(leadId,{stage:"contacted"});
      if(!simulated&&action.channel==="voice"&&action.kind==="call"&&typeof result==="object"&&result!==null&&"sid" in result&&typeof (result as {sid?:unknown}).sid==="string"){
        const provider=result as {sid:string;status?:string};
        distributionStore.upsertCall({callSid:provider.sid,missionId:action.missionId,leadId,actionId:action.recordId,objective:typeof payload.objective==="string"?payload.objective:action.objective,status:"initiated",providerStatus:provider.status||"queued",transcript:[],startedAt:new Date().toISOString()});
      }
      results.push({id:action.recordId,status:"succeeded",channel:action.channel,simulated});
    }catch(error){
      const message=error instanceof Error?error.message:"unknown error";distributionStore.updateAction(action.recordId,{status:"failed",error:message,retryCount:action.retryCount+1});
      if(action.kind==="publish_post"&&typeof payload.contentId==="string")distributionStore.updateContent(payload.contentId,{status:"failed"});
      results.push({id:action.recordId,status:"failed",error:message});
    }
  }
  return{processed:results.length,results};
}
