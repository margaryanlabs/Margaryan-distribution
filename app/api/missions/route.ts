import { NextResponse } from "next/server";
import { buildDistributionPlan } from "@/lib/agent/planner";
import { distributionStore } from "@/lib/store";
import type { MissionInput } from "@/lib/types";

export async function GET() { return NextResponse.json({ missions: distributionStore.listMissions() }); }

export async function POST(request: Request) {
  try {
    const body = await request.json() as MissionInput;
    if (!body.goal?.trim()) return NextResponse.json({ error: "goal is required" }, { status: 400 });
    const input: MissionInput = { goal: body.goal.trim(), market: body.market?.trim() || "Global", language: body.language === "ru" ? "ru" : "en", autonomy: body.autonomy === "auto" || body.autonomy === "draft" ? body.autonomy : "approve", productId: body.productId || undefined };
    const product = input.productId ? distributionStore.getProduct(input.productId) : undefined;
    const plan = await buildDistributionPlan(input, product);
    const created = distributionStore.createMission(input, plan);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mission creation failed" }, { status: 500 });
  }
}
