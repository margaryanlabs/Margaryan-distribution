import type { Channel, ExecuteRequest } from "@/lib/types";

type ComplianceInput = { channel:Channel; country?:string; localHour?:number; optedOut?:boolean; doNotCall?:boolean; hasEmail?:boolean; hasPhone?:boolean; };

export function canContact(input: ComplianceInput): { allowed:boolean; reason?:string } {
  if (input.optedOut) return { allowed:false, reason:"Recipient opted out" };
  if (input.channel === "voice" && input.doNotCall) return { allowed:false, reason:"Do-not-call flag" };
  if (input.channel === "email" && !input.hasEmail) return { allowed:false, reason:"No email" };
  if (input.channel === "voice" && !input.hasPhone) return { allowed:false, reason:"No phone" };
  if (input.channel === "voice" && typeof input.localHour === "number" && (input.localHour < 9 || input.localHour >= 18)) return { allowed:false, reason:"Outside configured calling hours" };
  return { allowed:true };
}

export function evaluateExecution(action: ExecuteRequest): { allowed:boolean; reason?:string } {
  if (action.mode === "BLOCKED") return { allowed:false, reason:"Action is blocked by policy" };
  if (action.mode === "APPROVE") return { allowed:false, reason:"Human approval required" };
  if (action.policyContext?.optedOut) return { allowed:false, reason:"Recipient opted out" };
  if (action.channel === "voice") {
    if (action.policyContext?.doNotCall) return { allowed:false, reason:"Do-not-call flag" };
    if (!action.policyContext?.jurisdictionVerified) return { allowed:false, reason:"Calling jurisdiction not verified" };
    if (!action.policyContext?.withinAllowedHours) return { allowed:false, reason:"Outside permitted calling hours" };
  }
  return { allowed:true };
}
