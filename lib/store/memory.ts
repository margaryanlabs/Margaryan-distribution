import type { ContentDraft, DashboardSnapshot, DistributionActionRecord, DistributionPlan, MissionInput, MissionRecord } from "@/lib/types";

type MemoryState = {
  missions: MissionRecord[];
  actions: DistributionActionRecord[];
  content: ContentDraft[];
};

declare global {
  var __margaryanDistributionMemory: MemoryState | undefined;
}

function state(): MemoryState {
  if (!globalThis.__margaryanDistributionMemory) {
    globalThis.__margaryanDistributionMemory = { missions: [], actions: [], content: [] };
  }
  return globalThis.__margaryanDistributionMemory;
}

function now() {
  return new Date().toISOString();
}

export const memoryStore = {
  createMission(input: MissionInput, plan: DistributionPlan) {
    const createdAt = now();
    const mission: MissionRecord = {
      id: crypto.randomUUID(),
      input,
      plan,
      status: "active",
      createdAt,
      updatedAt: createdAt
    };
    state().missions.unshift(mission);

    const actions: DistributionActionRecord[] = plan.actions.map((action) => ({
      ...action,
      recordId: crypto.randomUUID(),
      missionId: mission.id,
      status: action.mode === "BLOCKED" ? "blocked" : "queued",
      scheduledAt: new Date(Date.now() + action.scheduledOffsetHours * 60 * 60 * 1000).toISOString(),
      createdAt,
      updatedAt: createdAt,
      retryCount: 0
    }));
    state().actions.push(...actions);
    return { mission, actions };
  },

  getMission(id: string) {
    return state().missions.find((mission) => mission.id === id);
  },

  listMissions() {
    return [...state().missions];
  },

  listActions() {
    return [...state().actions].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },

  getAction(recordId: string) {
    return state().actions.find((action) => action.recordId === recordId);
  },

  updateAction(recordId: string, patch: Partial<DistributionActionRecord>) {
    const action = state().actions.find((item) => item.recordId === recordId);
    if (!action) return undefined;
    Object.assign(action, patch, { updatedAt: now() });
    return action;
  },

  addContent(drafts: Omit<ContentDraft, "id" | "createdAt">[]) {
    const created = drafts.map((draft) => ({ ...draft, id: crypto.randomUUID(), createdAt: now() }));
    state().content.unshift(...created);
    return created;
  },

  listContent() {
    return [...state().content];
  },

  snapshot(): DashboardSnapshot {
    const missions = this.listMissions();
    const actions = this.listActions();
    const content = this.listContent();
    return {
      missions,
      actions,
      content,
      stats: {
        activeMissions: missions.filter((mission) => mission.status === "active").length,
        queuedActions: actions.filter((action) => action.status === "queued" || action.status === "approved").length,
        approvalsNeeded: actions.filter((action) => action.mode === "APPROVE" && action.status === "queued").length,
        completedActions: actions.filter((action) => action.status === "succeeded").length
      }
    };
  }
};
