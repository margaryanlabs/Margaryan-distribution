import type { ExecuteRequest } from "@/lib/types";
import { sendGmailMessage } from "./gmail";
import { publishXPost, publishXThread } from "./x";
import { publishLinkedInPost } from "./linkedin";
import { publishInstagramImage } from "./instagram";
import { startOutboundCall } from "./twilio";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function isLiveExecutionEnabled() {
  return process.env.EXECUTION_ENABLED === "true";
}

export async function executeProviderAction(action: ExecuteRequest) {
  if (!isLiveExecutionEnabled()) {
    return {
      simulated: true,
      channel: action.channel,
      kind: action.kind,
      payloadPreview: action.payload,
      note: "Dry-run only. Set EXECUTION_ENABLED=true after provider credentials are configured."
    };
  }

  if (action.channel === "email" && (action.kind === "send_email" || action.kind === "reply")) {
    return sendGmailMessage({
      to: String(action.payload.to || ""),
      subject: String(action.payload.subject || ""),
      body: String(action.payload.body || ""),
      replyToMessageId: action.kind === "reply" ? String(action.payload.replyToMessageId || "") : undefined,
      references: action.kind === "reply" ? String(action.payload.references || action.payload.replyToMessageId || "") : undefined
    });
  }
  if (action.channel === "x" && action.kind === "publish_post") {
    const threadPosts = Array.isArray(action.payload.threadPosts) ? action.payload.threadPosts.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
    if (threadPosts.length > 1) return publishXThread({ accessToken: required("X_USER_ACCESS_TOKEN"), posts: threadPosts });
    return publishXPost({ accessToken: required("X_USER_ACCESS_TOKEN"), text: String(action.payload.text || threadPosts[0] || "") });
  }
  if (action.channel === "linkedin" && action.kind === "publish_post") return publishLinkedInPost({ accessToken: required("LINKEDIN_ACCESS_TOKEN"), authorUrn: required("LINKEDIN_AUTHOR_URN"), commentary: String(action.payload.commentary || action.payload.text || ""), version: process.env.LINKEDIN_VERSION || "202609" });
  if (action.channel === "instagram" && action.kind === "publish_post") return publishInstagramImage({ accessToken: required("META_ACCESS_TOKEN"), userId: required("INSTAGRAM_USER_ID"), mediaUrl: String(action.payload.mediaUrl || ""), caption: String(action.payload.caption || ""), graphVersion: process.env.META_GRAPH_VERSION || "v23.0" });
  if (action.channel === "voice" && action.kind === "call") {
    const base = required("APP_BASE_URL");
    const context={leadId:String(action.payload.leadId||""),missionId:String(action.payload.missionId||""),actionId:String(action.payload.actionId||""),leadName:String(action.payload.leadName||""),objective:String(action.payload.objective||"qualify interest"),language:String(action.payload.leadLanguage||"en")};
    const twimlUrl=new URL(String(action.payload.twimlUrl||`${base}/api/voice/twiml`));
    for(const [key,value] of Object.entries(context))if(value)twimlUrl.searchParams.set(key,value);
    const statusUrl=new URL(`${base}/api/voice/status`);
    for(const key of ["leadId","missionId","actionId"] as const)if(context[key])statusUrl.searchParams.set(key,context[key]);
    return startOutboundCall({to:String(action.payload.to||""),from:required("TWILIO_FROM_NUMBER"),accountSid:required("TWILIO_ACCOUNT_SID"),authToken:required("TWILIO_AUTH_TOKEN"),twimlUrl:twimlUrl.toString(),statusCallback:statusUrl.toString()});
  }
  throw new Error(`No executor for ${action.channel}/${action.kind}`);
}
