import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const action = distributionStore.getAction(id);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  if (action.status !== "queued") return NextResponse.json({ error: `Cannot approve action in ${action.status} state` }, { status: 409 });
  const updated = distributionStore.updateAction(id, { mode: "AUTO", status: "approved", approvedAt: new Date().toISOString(), error: undefined });
  return NextResponse.json({ action: updated });
}
