import { NextResponse } from "next/server";
import { ingestInboundReply, extractEmailAddress } from "@/lib/agent/reply-orchestrator";
import { listUnreadGmail, markGmailRead } from "@/lib/integrations/gmail";
import { distributionStore } from "@/lib/store";

export async function POST(){
  try{
    const messages=await listUnreadGmail(25);const processed=[];const errors=[];let skippedUnknown=0,duplicates=0;
    for(const message of messages){
      const sender=extractEmailAddress(message.from);const lead=sender?distributionStore.findLeadByEmail(sender):undefined;
      if(!lead){skippedUnknown++;continue;}
      if(distributionStore.hasReplyExternalId(message.id)){duplicates++;try{await markGmailRead(message.id);}catch{}continue;}
      try{
        const result=await ingestInboundReply({externalId:message.id,threadId:message.threadId,messageId:message.messageId,from:message.from,subject:message.subject,text:message.text,receivedAt:message.receivedAt,lead});
        processed.push(result);await markGmailRead(message.id);
      }catch(error){errors.push({id:message.id,error:error instanceof Error?error.message:"Reply processing failed"});}
    }
    return NextResponse.json({ok:true,scanned:messages.length,processed:processed.length,skippedUnknown,duplicates,errors,results:processed});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Gmail poll failed"},{status:500});}
}
