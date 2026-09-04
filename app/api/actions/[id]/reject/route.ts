import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const action = distributionStore.getAction(id);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  const updated = distributionStore.updateAction(id, { status: "rejected", rejectedAt: new Date().toISOString() });
  return NextResponse.json({ action: updated });
}
