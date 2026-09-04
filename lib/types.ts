export type Language = "en" | "ru";
export type Channel = "email" | "voice" | "linkedin" | "instagram" | "x" | "system";
export type ExecutionMode = "AUTO" | "APPROVE" | "BLOCKED";
export type ActionKind = "send_email" | "publish_post" | "reply" | "call" | "research" | "analyze";
export type LeadStage = "new" | "researched" | "contacted" | "replied" | "qualified" | "meeting" | "won" | "lost" | "do_not_contact";

export interface ProductBrief { name:string; oneLiner:string; targetCustomer:string; pains:string[]; proof:string[]; pricingNotes?:string; forbiddenClaims?:string[]; }
export interface MissionInput { goal:string; market:string; language:Language; autonomy:"auto"|"approve"|"draft"; }
export interface PlannedAction { id:string; channel:Exclude<Channel,"system">; kind:ActionKind; objective:string; rationale:string; mode:ExecutionMode; scheduledOffsetHours:number; payload:Record<string,unknown>; }
export interface DistributionPlan { missionName:string; thesis:string; audience:string[]; contentPillars:string[]; actions:PlannedAction[]; successMetrics:string[]; stopConditions:string[]; }
export interface ExecuteRequest { channel:Exclude<Channel,"system">; kind:ActionKind; mode:ExecutionMode; payload:Record<string,unknown>; policyContext?:{ optedOut?:boolean; doNotCall?:boolean; jurisdictionVerified?:boolean; withinAllowedHours?:boolean; }; }
export interface CallSummary { language:Language; outcome:"no_answer"|"not_interested"|"follow_up"|"qualified"|"meeting"|"do_not_contact"; summary:string; needs:string[]; objections:string[]; commitments:string[]; nextAction:string; nextActionAt?:string; decisionMaker?:string; budgetSignal?:string; urgency?:"low"|"medium"|"high"; }
