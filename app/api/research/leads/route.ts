import { NextResponse } from "next/server";
import { researchBusinessLeads } from "@/lib/agent/research";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import type { Language } from "@/lib/types";

export async function POST(req: Request) {
  try {
    if(!storageRuntime().durable)return NextResponse.json({error:"Durable CRM is required before live lead research",runtime:storageRuntime()},{status:503});
    const body = await req.json() as { missionId?: string; limit?: number };
    if (!body.missionId) return NextResponse.json({ error: "missionId is required" }, { status: 400 });

    const {result,persistence}=await withDurableState(async()=>{
      const mission = distributionStore.getMission(body.missionId!);
      if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
      const limit = Math.max(1, Math.min(10, Number(body.limit || 8)));
      const product = mission.input.productId ? distributionStore.getProduct(mission.input.productId) : undefined;
      const candidates = await researchBusinessLeads(mission, limit, product);
      const leads = distributionStore.addLeads(candidates.map((candidate) => ({ ...candidate, missionId: mission.id, language: mission.input.language as Language, stage: "researched" as const })));
      return NextResponse.json({ leads, researched: candidates.length, added: leads.length });
    });

    result.headers.set("x-distribution-storage",storageRuntime().storage);
    result.headers.set("x-distribution-persisted",String(Boolean(persistence.saved)));
    return result;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lead research failed", runtime:storageRuntime() }, { status: 500 });
  }
}
