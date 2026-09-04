import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { evaluateExecution } from "@/lib/compliance";
import { executeProviderAction } from "@/lib/integrations";
import type { ExecuteRequest } from "@/lib/types";

export async function POST(req: Request) {
  const secret = process.env.WORKER_SECRET;
  if (secret && req.headers.get("x-worker-secret") !== secret) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date().toISOString();
  const due = distributionStore.listActions()
    .filter((action) => (action.status === "queued" || action.status === "approved") && action.mode === "AUTO" && action.scheduledAt <= now)
    .slice(0, 10);

  const results: Array<Record<string, unknown>> = [];
  for (const action of due) {
    const claimed = distributionStore.updateAction(action.recordId, { status: "running" });
    if (!claimed) continue;
    const request: ExecuteRequest = {
      channel: action.channel,
      kind: action.kind,
      mode: "AUTO",
      payload: action.payload,
      policyContext: {
        optedOut: action.payload.optedOut === true,
        doNotCall: action.payload.doNotCall === true,
        jurisdictionVerified: action.payload.jurisdictionVerified === true,
        withinAllowedHours: action.payload.withinAllowedHours === true
      }
    };
    const gate = evaluateExecution(request);
    if (!gate.allowed) {
      distributionStore.updateAction(action.recordId, { status: "blocked", error: gate.reason });
      results.push({ id: action.recordId, status: "blocked", reason: gate.reason });
      continue;
    }
    try {
      const result = await executeProviderAction(request);
      distributionStore.updateAction(action.recordId, { status: "succeeded", result, executedAt: new Date().toISOString(), error: undefined });
      results.push({ id: action.recordId, status: "succeeded", channel: action.channel });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      distributionStore.updateAction(action.recordId, { status: "failed", error: message, retryCount: action.retryCount + 1 });
      results.push({ id: action.recordId, status: "failed", error: message });
    }
  }
  return NextResponse.json({ ok: true, storage: "memory", processed: results.length, results });
}
