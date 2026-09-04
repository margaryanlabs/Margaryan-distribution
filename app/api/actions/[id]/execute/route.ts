import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { evaluateExecution } from "@/lib/compliance";
import { executeProviderAction } from "@/lib/integrations";
import type { ExecuteRequest } from "@/lib/types";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const action = distributionStore.getAction(id);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  if (!["approved", "queued", "failed"].includes(action.status)) return NextResponse.json({ error: `Cannot execute action in ${action.status} state` }, { status: 409 });

  const request: ExecuteRequest = {
    channel: action.channel,
    kind: action.kind,
    mode: action.mode,
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
    distributionStore.updateAction(id, { status: action.mode === "APPROVE" ? "queued" : "blocked", error: gate.reason });
    return NextResponse.json({ error: gate.reason }, { status: 409 });
  }

  distributionStore.updateAction(id, { status: "running", error: undefined });
  try {
    const result = await executeProviderAction(request);
    const updated = distributionStore.updateAction(id, { status: "succeeded", result, executedAt: new Date().toISOString() });
    return NextResponse.json({ action: updated, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    distributionStore.updateAction(id, { status: "failed", error: message, retryCount: action.retryCount + 1 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
