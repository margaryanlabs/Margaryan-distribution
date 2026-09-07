import { distributionStore } from "@/lib/store";
import type { DistributionActionRecord, Lead } from "@/lib/types";

const TERMINAL_DEPENDENCY_STATES = new Set(["failed", "blocked", "rejected", "dead_letter"]);
const ENGAGED_OR_TERMINAL_LEAD_STAGES = new Set(["replied", "qualified", "meeting", "won", "lost", "do_not_contact"]);

export type DependencyDecision = {
  allowed: boolean;
  waiting?: boolean;
  terminal?: boolean;
  reason?: string;
};

function dependencyIds(action: DistributionActionRecord) {
  const raw = action.payload.dependsOnActionIds ?? action.payload.dependsOnActionId;
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return typeof raw === "string" && raw.trim() ? [raw] : [];
}

export function evaluateActionDependencies(action: DistributionActionRecord): DependencyDecision {
  const ids = dependencyIds(action);
  if (!ids.length) return { allowed: true };

  for (const plannedActionId of ids) {
    const dependency = distributionStore
      .listActions()
      .find((candidate) => candidate.missionId === action.missionId && candidate.id === plannedActionId);

    if (!dependency) {
      return {
        allowed: false,
        terminal: true,
        reason: `Required action ${plannedActionId} was not found`,
      };
    }

    if (dependency.status === "succeeded") continue;

    if (TERMINAL_DEPENDENCY_STATES.has(dependency.status)) {
      return {
        allowed: false,
        terminal: true,
        reason: `Required action ${plannedActionId} ended as ${dependency.status}`,
      };
    }

    return {
      allowed: false,
      waiting: true,
      reason: `Waiting for required action ${plannedActionId} (${dependency.status})`,
    };
  }

  return { allowed: true };
}

export function evaluateColdSequenceLeadState(action: DistributionActionRecord, lead?: Lead): DependencyDecision {
  if (action.payload.sequenceType !== "cold" || !lead) return { allowed: true };
  if (lead.optedOut || lead.doNotCall && action.channel === "voice") {
    return { allowed: false, terminal: true, reason: "Lead suppression policy prevents this cold-sequence action" };
  }
  if (ENGAGED_OR_TERMINAL_LEAD_STAGES.has(lead.stage)) {
    return {
      allowed: false,
      terminal: true,
      reason: `Cold sequence stopped because lead stage is ${lead.stage}`,
    };
  }
  return { allowed: true };
}

export function nextDependencyCheckAt(minutes = 15) {
  return new Date(Date.now() + Math.max(5, Math.min(60, minutes)) * 60_000).toISOString();
}
