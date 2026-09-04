import type { ContentDraft, DashboardSnapshot, DistributionActionRecord, DistributionPlan, Lead, MissionInput, MissionRecord, ProductRecord } from "@/lib/types";

type MemoryState = {
  missions: MissionRecord[];
  actions: DistributionActionRecord[];
  content: ContentDraft[];
  leads: Lead[];
  products: ProductRecord[];
};

declare global {
  var __margaryanDistributionMemory: MemoryState | undefined;
}

function state(): MemoryState {
  if (!globalThis.__margaryanDistributionMemory) {
    globalThis.__margaryanDistributionMemory = { missions: [], actions: [], content: [], leads: [], products: [] };
  }
  return globalThis.__margaryanDistributionMemory;
}

function now() {
  return new Date().toISOString();
}

export const memoryStore = {
  createMission(input: MissionInput, plan: DistributionPlan) {
    const createdAt = now();
    const mission: MissionRecord = { id: crypto.randomUUID(), input, plan, status: "active", createdAt, updatedAt: createdAt };
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
  getMission(id: string) { return state().missions.find((mission) => mission.id === id); },
  listMissions() { return [...state().missions]; },
  listActions() { return [...state().actions].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)); },
  getAction(recordId: string) { return state().actions.find((action) => action.recordId === recordId); },
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
  listContent() { return [...state().content]; },
  addLeads(leads: Omit<Lead, "id">[]) {
    const existing = new Set(state().leads.map((lead) => `${lead.company.toLowerCase()}|${(lead.website || "").toLowerCase()}`));
    const created: Lead[] = [];
    for (const lead of leads) {
      const key = `${lead.company.toLowerCase()}|${(lead.website || "").toLowerCase()}`;
      if (existing.has(key)) continue;
      const item: Lead = { ...lead, id: crypto.randomUUID() };
      state().leads.unshift(item);
      existing.add(key);
      created.push(item);
    }
    return created;
  },
  listLeads() { return [...state().leads].sort((a, b) => (b.score || 0) - (a.score || 0)); },
  addProduct(product: Omit<ProductRecord, "id" | "createdAt" | "updatedAt">) {
    const createdAt = now();
    const item: ProductRecord = { ...product, id: crypto.randomUUID(), createdAt, updatedAt: createdAt };
    state().products.unshift(item);
    return item;
  },
  listProducts() { return [...state().products]; },
  getProduct(id: string) { return state().products.find((product) => product.id === id); },
  snapshot(): DashboardSnapshot {
    const missions = this.listMissions();
    const actions = this.listActions();
    const content = this.listContent();
    const leads = this.listLeads();
    const products = this.listProducts();
    return {
      missions, actions, content, leads, products,
      stats: {
        activeMissions: missions.filter((mission) => mission.status === "active").length,
        queuedActions: actions.filter((action) => action.status === "queued" || action.status === "approved").length,
        approvalsNeeded: actions.filter((action) => action.mode === "APPROVE" && action.status === "queued").length,
        completedActions: actions.filter((action) => action.status === "succeeded").length,
        researchedLeads: leads.length,
        products: products.length
      }
    };
  }
};
