import { NextResponse } from "next/server";
import { isLiveExecutionEnabled } from "@/lib/integrations";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "margaryan-distribution",
    time: new Date().toISOString(),
    storage: "memory",
    execution: isLiveExecutionEnabled() ? "live" : "dry-run",
    adapters: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gmail: Boolean(process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_ACCESS_TOKEN),
      x: Boolean(process.env.X_USER_ACCESS_TOKEN),
      linkedin: Boolean(process.env.LINKEDIN_ACCESS_TOKEN),
      instagram: Boolean(process.env.META_ACCESS_TOKEN),
      voice: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.VOICE_GATEWAY_WSS_URL)
    }
  });
}
