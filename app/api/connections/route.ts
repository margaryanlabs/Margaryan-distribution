import { NextResponse } from "next/server";
import { isLiveExecutionEnabled } from "@/lib/integrations";

export function GET() {
  const googleOAuthReady=Boolean(process.env.GOOGLE_ACCESS_TOKEN||process.env.GMAIL_ACCESS_TOKEN||(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REFRESH_TOKEN));
  const voiceReady=Boolean(process.env.OPENAI_API_KEY&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER&&process.env.VOICE_GATEWAY_WSS_URL&&(process.env.VOICE_CALLBACK_SECRET||process.env.WORKER_SECRET));
  const calendarReady=Boolean(googleOAuthReady&&process.env.GOOGLE_CALENDAR_ID);
  return NextResponse.json({
    executionEnabled: isLiveExecutionEnabled(),
    providers: [
      { id: "openai", name: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY), capability: "planning + content + summaries + realtime voice" },
      { id: "gmail", name: "Gmail", configured: Boolean(process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN), capability: "email outreach + inbox" },
      { id: "calendar", name: "Google Calendar", configured: calendarReady, capability: "free/busy + attendee invites + Google Meet booking" },
      { id: "x", name: "X", configured: Boolean(process.env.X_USER_ACCESS_TOKEN), capability: "publishing + threads" },
      { id: "linkedin", name: "LinkedIn", configured: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN), capability: "approved publishing" },
      { id: "instagram", name: "Instagram", configured: Boolean(process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID), capability: "professional publishing" },
      { id: "twilio", name: "Voice Sales Stack", configured: voiceReady, capability: "Twilio outbound + realtime AI + transcript callback + CRM summary" }
    ]
  });
}
