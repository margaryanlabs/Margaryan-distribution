import { NextResponse } from "next/server";
import { researchBusinessLeads } from "@/lib/agent/research";
import { distributionStore } from "@/lib/store";
import type { Language } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json() as { missionId?: string; limit?: number };
    if (!body.missionId) return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    const mission = distributionStore.getMission(body.missionId);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    const limit = Math.max(1, Math.min(10, Number(body.limit || 8)));
    const candidates = await researchBusinessLeads(mission, limit);
    const leads = distributionStore.addLeads(candidates.map((candidate) => ({
      ...candidate,
      missionId: mission.id,
      language: mission.input.language as Language,
      stage: "researched" as const
    })));
    return NextResponse.json({ leads, researched: candidates.length, added: leads.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lead research failed" }, { status: 500 });
  }
}
