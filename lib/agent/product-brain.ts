import OpenAI from "openai";
import type { Language, ProductRecord } from "@/lib/types";

type ProductBrainInput = { name: string; sourceUrl?: string; notes?: string; language: Language };
type ProductBrainOutput = Omit<ProductRecord, "id" | "createdAt" | "updatedAt">;

function cleanJson(text: string) { return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(); }

function fallback(input: ProductBrainInput): ProductBrainOutput {
  return {
    name: input.name, sourceUrl: input.sourceUrl, notes: input.notes, language: input.language,
    oneLiner: input.notes?.trim() || `${input.name} product profile`,
    targetCustomer: "Define target customer before live distribution",
    pains: [], proof: [], pricingNotes: undefined,
    forbiddenClaims: ["Unverified performance claims", "Invented customer results", "Guaranteed outcomes"],
    positioning: [], objections: [], useCases: []
  };
}

export async function buildProductBrain(input: ProductBrainInput): Promise<ProductBrainOutput> {
  if (!process.env.OPENAI_API_KEY) return fallback(input);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_RESEARCH_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    tools: input.sourceUrl ? [{ type: "web_search_preview" as const, search_context_size: "medium" as const }] : undefined,
    instructions: [
      "You are the product intelligence layer of an autonomous B2B distribution system.",
      "Create a sales-safe product brain from the supplied public source and notes.",
      "Do not invent customers, metrics, certifications, pricing, capabilities, or proof.",
      "Separate verified proof from positioning ideas. If evidence is absent, leave proof empty.",
      "Return JSON only with: name, sourceUrl, notes, language, oneLiner, targetCustomer, pains, proof, pricingNotes, forbiddenClaims, positioning, objections, useCases.",
      `Use ${input.language === "ru" ? "Russian" : "English"} for human-readable fields.`
    ].join(" "),
    input: JSON.stringify(input)
  });
  const parsed = JSON.parse(cleanJson(response.output_text)) as Partial<ProductBrainOutput>;
  return {
    name: String(parsed.name || input.name), sourceUrl: input.sourceUrl, notes: input.notes, language: input.language,
    oneLiner: String(parsed.oneLiner || input.notes || input.name), targetCustomer: String(parsed.targetCustomer || ""),
    pains: Array.isArray(parsed.pains) ? parsed.pains.map(String) : [], proof: Array.isArray(parsed.proof) ? parsed.proof.map(String) : [],
    pricingNotes: typeof parsed.pricingNotes === "string" ? parsed.pricingNotes : undefined,
    forbiddenClaims: Array.isArray(parsed.forbiddenClaims) ? parsed.forbiddenClaims.map(String) : [],
    positioning: Array.isArray(parsed.positioning) ? parsed.positioning.map(String) : [],
    objections: Array.isArray(parsed.objections) ? parsed.objections.map(String) : [],
    useCases: Array.isArray(parsed.useCases) ? parsed.useCases.map(String) : []
  };
}
