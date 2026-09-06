import { generateLearningReport } from "@/lib/agent/learning";
import { researchBusinessLeads } from "@/lib/agent/research";
import { executeProviderAction } from "@/lib/integrations";
import { distributionStore } from "@/lib/store";
import type { ExecuteRequest, Language } from "@/lib/types";

function missionIdFrom(payload: Record<string, unknown>) {
  return typeof payload.missionId === "string" ? payload.missionId : undefined;
}

export async function executeDistributionAction(request: ExecuteRequest) {
  if (request.kind === "research") {
    const missionId = missionIdFrom(request.payload);
    if (!missionId) throw new Error("Internal research action requires missionId");

    const mission = distributionStore.getMission(missionId);
    if (!mission) throw new Error("Mission not found for research action");

    if (!process.env.OPENAI_API_KEY) {
      return {
        simulated: true,
        internal: true,
        kind: "research",
        researched: 0,
        added: 0,
        note: "OPENAI_API_KEY is not configured; research action was verified without external web research.",
      };
    }

    const requested = Number(request.payload.limit ?? 8);
    const limit = Math.max(1, Math.min(10, Number.isFinite(requested) ? Math.round(requested) : 8));
    const product = mission.input.productId
      ? distributionStore.getProduct(mission.input.productId)
      : undefined;
    const candidates = await researchBusinessLeads(mission, limit, product);
    const created = distributionStore.addLeads(
      candidates.map((candidate) => ({
        ...candidate,
        missionId,
        language: mission.input.language as Language,
        stage: "researched" as const,
      })),
    );

    return {
      internal: true,
      kind: "research",
      researched: candidates.length,
      added: created.length,
      leadIds: created.map((lead) => lead.id),
    };
  }

  if (request.kind === "analyze") {
    const missionId = missionIdFrom(request.payload);
    if (!missionId) throw new Error("Internal analyze action requires missionId");
    const report = await generateLearningReport(missionId);
    return {
      internal: true,
      kind: "analyze",
      reportId: report.id,
      evidenceEvents: report.evidenceEventIds.length,
      summary: report.summary,
    };
  }

  return executeProviderAction(request);
}
