import { ingestInboundReply, extractEmailAddress } from "@/lib/agent/reply-orchestrator";
import { listUnreadGmail, markGmailRead } from "@/lib/integrations/gmail";
import { distributionStore } from "@/lib/store";

export function gmailInboxConfigured(){
  return Boolean(process.env.GMAIL_ACCESS_TOKEN||(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REFRESH_TOKEN));
}

export async function pollKnownLeadGmail(maxResults=25){
  if(!gmailInboxConfigured())return{configured:false,scanned:0,processed:0,skippedUnknown:0,duplicates:0,errors:[] as Array<{id:string;error:string}>,results:[]};
  const messages=await listUnreadGmail(Math.max(1,Math.min(50,maxResults)));const processed=[];const errors:Array<{id:string;error:string}>=[];let skippedUnknown=0,duplicates=0;
  for(const message of messages){
    const sender=extractEmailAddress(message.from);const lead=sender?distributionStore.findLeadByEmail(sender):undefined;
    if(!lead){skippedUnknown++;continue;}
    if(distributionStore.hasReplyExternalId(message.id)){duplicates++;try{await markGmailRead(message.id);}catch{}continue;}
    try{const result=await ingestInboundReply({externalId:message.id,threadId:message.threadId,messageId:message.messageId,from:message.from,subject:message.subject,text:message.text,receivedAt:message.receivedAt,lead});processed.push(result);await markGmailRead(message.id);}
    catch(error){errors.push({id:message.id,error:error instanceof Error?error.message:"Reply processing failed"});}
  }
  return{configured:true,scanned:messages.length,processed:processed.length,skippedUnknown,duplicates,errors,results:processed};
}
