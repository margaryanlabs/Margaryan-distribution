import OpenAI from "openai";
import type { Language, Lead, MissionRecord } from "@/lib/types";

type LeadCandidate = Pick<Lead, "company" | "website" | "country" | "fitReason" | "score" | "research">;

function cleanJson(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export async function researchBusinessLeads(mission: MissionRecord, limit = 8): Promise<LeadCandidate[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for live lead research");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const language: Language = mission.input.language;
  const response = await client.responses.create({
    model: process.env.OPENAI_RESEARCH_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    tools: [{ type: "web_search_preview", search_context_size: "medium" }],
    instructions: [
      "You are the research layer of a B2B distribution system.",
      "Find real companies that plausibly match the mission using current public web information.",
      "Return businesses, not private individuals. Do not guess private emails, phone numbers, or personal data.",
      "Prefer official company websites and public business pages. Do not invent facts.",
      `Return JSON only: an array of at most ${Math.min(limit, 10)} objects with company, website, country, fitReason, score (0-100), research.`,
      `Write fitReason and research in ${language === "ru" ? "Russian" : "English"}.`
    ].join(" "),
    input: JSON.stringify({
      goal: mission.input.goal,
      market: mission.input.market,
      audience: mission.plan.audience,
      thesis: mission.plan.thesis
    })
  });

  const parsed = JSON.parse(cleanJson(response.output_text)) as LeadCandidate[];
  if (!Array.isArray(parsed)) throw new Error("Lead research returned an invalid payload");
  return parsed.slice(0, Math.min(limit, 10)).filter((lead) => typeof lead.company === "string" && lead.company.trim()).map((lead) => ({
    company: lead.company.trim(),
    website: typeof lead.website === "string" ? lead.website.trim() : undefined,
    country: typeof lead.country === "string" ? lead.country.trim() : mission.input.market,
    fitReason: typeof lead.fitReason === "string" ? lead.fitReason.trim() : "",
    score: Math.max(0, Math.min(100, Number(lead.score || 0))),
    research: typeof lead.research === "string" ? lead.research.trim() : ""
  }));
}
