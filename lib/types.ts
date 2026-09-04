export type Language = "en" | "ru";
export type Channel = "email" | "voice" | "linkedin" | "instagram" | "x" | "system";
export type ExecutionMode = "AUTO" | "APPROVE" | "BLOCKED";
export type ActionKind = "send_email" | "publish_post" | "reply" | "call" | "research" | "analyze";
export type LeadStage = "new" | "researched" | "contacted" | "replied" | "qualified" | "meeting" | "won" | "lost" | "do_not_contact";
export type ActionStatus = "queued" | "approved" | "running" | "succeeded" | "failed" | "blocked" | "rejected";
export type MissionStatus = "active" | "paused" | "completed" | "failed";

export interface ProductBrief {
  name: string;
  oneLiner: string;
  targetCustomer: string;
  pains: string[];
  proof: string[];
  pricingNotes?: string;
  forbiddenClaims?: string[];
}

export interface MissionInput {
  goal: string;
  market: string;
  language: Language;
  autonomy: "auto" | "approve" | "draft";
}

export interface PlannedAction {
  id: string;
  channel: Exclude<Channel, "system">;
  kind: ActionKind;
  objective: string;
  rationale: string;
  mode: ExecutionMode;
  scheduledOffsetHours: number;
  payload: Record<string, unknown>;
}

export interface DistributionPlan {
  missionName: string;
  thesis: string;
  audience: string[];
  contentPillars: string[];
  actions: PlannedAction[];
  successMetrics: string[];
  stopConditions: string[];
}

export interface ExecuteRequest {
  channel: Exclude<Channel, "system">;
  kind: ActionKind;
  mode: ExecutionMode;
  payload: Record<string, unknown>;
  policyContext?: {
    optedOut?: boolean;
    doNotCall?: boolean;
    jurisdictionVerified?: boolean;
    withinAllowedHours?: boolean;
  };
}

export interface MissionRecord {
  id: string;
  input: MissionInput;
  plan: DistributionPlan;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DistributionActionRecord extends PlannedAction {
  recordId: string;
  missionId: string;
  status: ActionStatus;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  executedAt?: string;
  error?: string;
  result?: unknown;
  retryCount: number;
}

export interface ContentDraft {
  id: string;
  missionId?: string;
  channel: "x" | "linkedin" | "instagram" | "email";
  language: Language;
  title: string;
  body: string;
  callToAction?: string;
  status: "draft" | "approved" | "published";
  createdAt: string;
}

export interface Lead {
  id: string;
  company: string;
  contactName?: string;
  role?: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  language: Language;
  stage: LeadStage;
  research?: string;
}

export interface CallSummary {
  language: Language;
  outcome: "no_answer" | "not_interested" | "follow_up" | "qualified" | "meeting" | "do_not_contact";
  summary: string;
  needs: string[];
  objections: string[];
  commitments: string[];
  nextAction: string;
  nextActionAt?: string;
  decisionMaker?: string;
  budgetSignal?: string;
  urgency?: "low" | "medium" | "high";
}

export interface DashboardSnapshot {
  missions: MissionRecord[];
  actions: DistributionActionRecord[];
  content: ContentDraft[];
  stats: {
    activeMissions: number;
    queuedActions: number;
    approvalsNeeded: number;
    completedActions: number;
  };
}
