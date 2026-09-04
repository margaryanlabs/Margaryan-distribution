import type { ExecuteRequest } from "@/lib/types";
import { sendGmailMessage } from "./gmail";
import { publishXPost } from "./x";
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

  if (action.channel === "email" && action.kind === "send_email") {
    return sendGmailMessage({ accessToken: process.env.GMAIL_ACCESS_TOKEN, to: String(action.payload.to || ""), subject: String(action.payload.subject || ""), body: String(action.payload.body || "") });
  }
  if (action.channel === "x" && action.kind === "publish_post") return publishXPost({ accessToken: required("X_USER_ACCESS_TOKEN"), text: String(action.payload.text || "") });
  if (action.channel === "linkedin" && action.kind === "publish_post") return publishLinkedInPost({ accessToken: required("LINKEDIN_ACCESS_TOKEN"), authorUrn: required("LINKEDIN_AUTHOR_URN"), commentary: String(action.payload.commentary || action.payload.text || ""), version: process.env.LINKEDIN_VERSION || "202609" });
  if (action.channel === "instagram" && action.kind === "publish_post") return publishInstagramImage({ accessToken: required("META_ACCESS_TOKEN"), userId: required("INSTAGRAM_USER_ID"), mediaUrl: String(action.payload.mediaUrl || ""), caption: String(action.payload.caption || ""), graphVersion: process.env.META_GRAPH_VERSION || "v23.0" });
  if (action.channel === "voice" && action.kind === "call") {
    const base = required("APP_BASE_URL");
    return startOutboundCall({ to: String(action.payload.to || ""), from: required("TWILIO_FROM_NUMBER"), accountSid: required("TWILIO_ACCOUNT_SID"), authToken: required("TWILIO_AUTH_TOKEN"), twimlUrl: String(action.payload.twimlUrl || `${base}/api/voice/twiml?leadName=${encodeURIComponent(String(action.payload.leadName || ""))}&objective=${encodeURIComponent(String(action.payload.objective || "qualify interest"))}`), statusCallback: `${base}/api/voice/status` });
  }
  throw new Error(`No executor for ${action.channel}/${action.kind}`);
}
