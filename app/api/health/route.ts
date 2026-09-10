import { NextResponse } from "next/server";
import { isLiveExecutionEnabled } from "@/lib/integrations";
import { storageRuntime } from "@/lib/store/checkpoint";

export function GET() {
  const runtime = storageRuntime();
  return NextResponse.json({
    ok: true,
    service: "margaryan-distribution",
    version: "0.6",
    time: new Date().toISOString(),
    storage: runtime.storage,
    durable: runtime.durable,
    persistence: runtime.persistence,
    execution: isLiveExecutionEnabled() ? "live" : "dry-run",
    automation: {
      portfolioCronConfigured: Boolean(process.env.CRON_SECRET),
      workerConfigured: Boolean(process.env.WORKER_SECRET || process.env.AUTOPILOT_SECRET),
    },
    adapters: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gmail: Boolean(process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN),
      calendar: Boolean((process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_ACCESS_TOKEN) && process.env.GOOGLE_CALENDAR_ID),
      x: Boolean(process.env.X_USER_ACCESS_TOKEN),
      linkedin: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN),
      instagram: Boolean(process.env.META_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID),
      voice: Boolean(process.env.OPENAI_API_KEY && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && process.env.VOICE_GATEWAY_WSS_URL),
    },
  });
}
