import { NextResponse } from "next/server";
import { classifyInboundReply } from "@/lib/agent/replies";
import { distributionStore } from "@/lib/store";
import { isDurableStateConfigured, storageRuntime, withDurableState } from "@/lib/store/checkpoint";
import type { Language, LinkedInAgentThread } from "@/lib/types";

export const dynamic = "force-dynamic";

const limit = (value: unknown, length: number) => typeof value === "string" ? value.trim().slice(0, length) : "";
const validLanguage = (v: unknown): Language => v === "ru" ? "ru" : "en";
const error = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(req.url).host; } catch { return false; }
}
function verifiedProfile(input: string) {
  if (!input) return "";
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !/^(www\.)?linkedin\.com$/i.test(url.hostname) || !/^\/(in|messaging)\//.test(url.pathname)) return "";
    return url.toString();
  } catch { return ""; }
}
function status() {
  return {
    source: "operator_import",
    inboxReadAvailable: false,
    directMessageSendAvailable: false,
    approvedMessagingPartnerConnected: false,
    publishingTokenConfigured: Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN),
    durable: isDurableStateConfigured()
  };
}

export async function GET() {
  try {
    const { result } = await withDurableState(() => distributionStore.listLinkedInThreads(), { writeBack: false });
    return NextResponse.json({ ok: true, threads: result, capability: status() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return error(e instanceof Error ? e.message : "LinkedIn agent state unavailable", 503); }
}

// The operator supplies a real message copied from LinkedIn. This endpoint DOES NOT access LinkedIn's inbox.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origin mismatch", 403);
  if (!isDurableStateConfigured()) return error("Configure a durable Distribution database before importing private conversations", 503);
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return error("Invalid JSON", 400); }

  const threadId = limit(body.threadId, 100);
  const importId = limit(body.importId, 100);
  const latestInbound = limit(body.latestInbound, 12000);
  const context = limit(body.context, 12000);
  const leadId = limit(body.leadId, 100);
  const contactName = limit(body.contactName, 200);
  const company = limit(body.company, 200);
  const language = validLanguage(body.language);
  const profileRaw = limit(body.profileUrl, 1000);
  const profileUrl = verifiedProfile(profileRaw);
  if (profileRaw && !profileUrl) return error("Only HTTPS linkedin.com/in/ or /messaging/ URLs are allowed", 400);
  if (!latestInbound) return error("Paste the latest incoming LinkedIn message", 400);
  if (!importId) return error("importId is required for safe retry/deduplication", 400);
  if (!threadId && !contactName) return error("Contact name is required for a new thread", 400);

  try {
    const { result, persistence } = await withDurableState(async () => {
      const previous = threadId ? distributionStore.getLinkedInThread(threadId) : undefined;
      if (threadId && !previous) return { code: 404, error: "Thread not found" };
      if (previous?.importIds.includes(importId)) return { code: 200, thread: previous, duplicate: true };
      const lead = leadId ? distributionStore.getLead(leadId) : previous?.leadId ? distributionStore.getLead(previous.leadId) : undefined;
      if (leadId && !lead) return { code: 404, error: "Lead not found" };
      if (lead?.optedOut || lead?.stage === "do_not_contact") return { code: 409, error: "Lead is opted out; no reply should be drafted" };
      const name = previous?.contactName || contactName || lead?.contactName || "";
      const companyName = previous?.company || company || lead?.company || "";
      const selectedLanguage = previous?.language || language;
      const mission = lead?.missionId ? distributionStore.getMission(lead.missionId) : undefined;
      const productId = limit(body.productId, 100) || mission?.input.productId || "";
      const product = productId ? distributionStore.getProduct(productId) : undefined;
      const decision = await classifyInboundReply({
        from: name, subject: "LinkedIn direct message", text: latestInbound,
        context, language: selectedLanguage, lead, mission, product
      });
      // Never propose a send after explicit opt-out or rejection.
      if (decision.intent === "unsubscribe" || decision.intent === "negative" || decision.recommendedAction === "stop") {
        decision.draftReply = "";
        decision.recommendedAction = "stop";
      }
      const now = new Date().toISOString();
      const thread: LinkedInAgentThread = {
        id: previous?.id || crypto.randomUUID(),
        leadId: previous?.leadId || lead?.id,
        contactName: name,
        company: companyName,
        profileUrl: previous?.profileUrl || profileUrl,
        language: selectedLanguage,
        productId: product?.id || previous?.productId,
        latestInbound, context,
        decision, draftReply: decision.draftReply,
        draftStatus: decision.recommendedAction === "stop" ? "blocked" : "pending_review",
        importIds: [...(previous?.importIds || []), importId].slice(-50),
        messages: [...(previous?.messages || []), { id: crypto.randomUUID(), direction: "inbound" as const, text: latestInbound, at: now, source: "operator_import" as const }].slice(-100),
        createdAt: previous?.createdAt || now, updatedAt: now
      };
      distributionStore.upsertLinkedInThread(thread);
      if (lead) {
        if (decision.intent === "unsubscribe") {
          distributionStore.stopPendingLeadActions(lead.id, "LinkedIn explicit opt-out");
          distributionStore.updateLead(lead.id, { optedOut: true, doNotCall: true, stage: "do_not_contact", nextAction: "stop" });
        } else if (decision.intent === "negative") {
          distributionStore.stopPendingLeadActions(lead.id, "LinkedIn decline");
          distributionStore.updateLead(lead.id, { stage: "lost", nextAction: "stop" });
        } else if (decision.intent === "positive" || decision.intent === "question") {
          distributionStore.stopPendingLeadActions(lead.id, "LinkedIn reply requires human review");
          distributionStore.updateLead(lead.id, { stage: "replied", lastReplyAt: now, nextAction: decision.recommendedAction });
        }
      }
      return { code: 200, thread, duplicate: false };
    });
    if ("error" in result) return error(result.error || "Invalid thread", result.code);
    if (!persistence.saved) return error("Conversation could not be durably saved", 503);
    return NextResponse.json({ ok: true, thread: result.thread, duplicate: result.duplicate }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return error(e instanceof Error ? e.message : "Could not analyze LinkedIn message", 500); }
}

// Explicitly record that the human sent this draft on LinkedIn. NEVER sends a message to LinkedIn.
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return error("Origin mismatch", 403);
  if (!isDurableStateConfigured()) return error("Durable state is required", 503);
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return error("Invalid JSON", 400); }
  const threadId = limit(body.threadId, 100);
  if (!threadId) return error("threadId is required", 400);
  try {
    const { result, persistence } = await withDurableState(() => {
      const thread = distributionStore.getLinkedInThread(threadId);
      if (!thread) return { code: 404, error: "Thread not found" };
      if (thread.draftStatus === "confirmed_sent") return { code: 200, thread, duplicate: true };
      if (thread.draftStatus !== "pending_review" || !thread.draftReply) return { code: 409, error: "There is no draft eligible for confirmation" };
      const lead = thread.leadId ? distributionStore.getLead(thread.leadId) : undefined;
      if (lead?.optedOut || lead?.stage === "do_not_contact") return { code: 409, error: "Contact opted out" };
      const now = new Date().toISOString();
      const updated: LinkedInAgentThread = { ...thread, draftStatus: "confirmed_sent", updatedAt: now,
        messages: [...thread.messages, { id: crypto.randomUUID(), direction: "outbound", text: thread.draftReply, at: now, source: "operator_confirmed" }].slice(-100) };
      distributionStore.upsertLinkedInThread(updated);
      if (lead && ["new", "researched"].includes(lead.stage)) distributionStore.updateLead(lead.id, { stage: "contacted" });
      return { code: 200, thread: updated, duplicate: false };
    });
    if ("error" in result) return error(result.error || "Invalid confirmation", result.code);
    if (!persistence.saved) return error("Confirmation could not be saved", 503);
    return NextResponse.json({ ok: true, thread: result.thread, duplicate: result.duplicate }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return error(e instanceof Error ? e.message : "Unable to record operator confirmation", 500); }
}
