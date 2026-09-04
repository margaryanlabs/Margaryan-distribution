import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { isLiveExecutionEnabled } from "@/lib/integrations";

export function GET() {
  return NextResponse.json({
    ...distributionStore.snapshot(),
    runtime: {
      storage: "memory",
      persistence: "process-lifetime only",
      execution: isLiveExecutionEnabled() ? "live" : "dry-run"
    }
  });
}
