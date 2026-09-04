import { NextResponse } from "next/server";
import { isLiveExecutionEnabled } from "@/lib/integrations";

export function GET() {
  return NextResponse.json({
    executionEnabled: isLiveExecutionEnabled(),
    providers: [
      { id: "openai", name: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY), capability: "planning + content + summaries" },
      { id: "gmail", name: "Gmail", configured: Boolean(process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_ACCESS_TOKEN), capability: "email outreach + inbox" },
      { id: "x", name: "X", configured: Boolean(process.env.X_USER_ACCESS_TOKEN), capability: "publishing" },
      { id: "linkedin", name: "LinkedIn", configured: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN), capability: "approved publishing" },
      { id: "instagram", name: "Instagram", configured: Boolean(process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID), capability: "professional publishing" },
      { id: "twilio", name: "Twilio Voice", configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER), capability: "outbound voice" }
    ]
  });
}
