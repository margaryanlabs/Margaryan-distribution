import OpenAI from "openai";
import type { BrandVoice, Language, ProductRecord } from "@/lib/types";

type ProductBrainInput = { name: string; sourceUrl?: string; notes?: string; language: Language };
type ProductBrainOutput = Omit<ProductRecord, "id" | "createdAt" | "updatedAt">;

function cleanJson(text: string) { return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim(); }
function defaultBrandVoice(language:Language):BrandVoice{return{tone:language==="ru"?["уверенный","конкретный","современный"]:["confident","specific","modern"],writingRules:language==="ru"?["Короткие конкретные предложения","Начинать с проблемы или наблюдения, а не с AI-хайпа","Использовать только проверяемые утверждения"]:["Use short concrete sentences","Lead with the problem or insight, not AI hype","Use only verifiable claims"],avoid:language==="ru"?["канцелярит","чрезмерные эмодзи","революционный/инновационный без доказательств","типичные AI-клише"]:["corporate filler","excessive emojis","revolutionary/innovative without proof","generic AI clichés"],founderVoice:language==="ru"?"Говорить как оператор, который строит продукт и понимает проблему изнутри.":"Sound like an operator who builds the product and understands the problem firsthand.",visualDirection:["clean","editorial","product-first","no generic AI neon"],channelRules:{x:["one sharp idea per post","concise"],linkedin:["operator insight","use whitespace","avoid sales-brochure tone"],instagram:["visual-first","strong hook","minimal on-image copy"],email:["plainspoken","personalized","one clear ask"],voice:["short turns","one question at a time","natural spoken language"]}};}

function fallback(input: ProductBrainInput): ProductBrainOutput {
  return {
    name: input.name, sourceUrl: input.sourceUrl, notes: input.notes, language: input.language,
    oneLiner: input.notes?.trim() || `${input.name} product profile`,
    targetCustomer: "Define target customer before live distribution",
    pains: [], proof: [], pricingNotes: undefined,
    forbiddenClaims: ["Unverified performance claims", "Invented customer results", "Guaranteed outcomes"],
    positioning: [], objections: [], useCases: [],brandVoice:defaultBrandVoice(input.language)
  };
}
function strings(value:unknown){return Array.isArray(value)?value.map(String).map(x=>x.trim()).filter(Boolean):[];}
function parseBrand(value:unknown,language:Language):BrandVoice{const base=defaultBrandVoice(language);if(!value||typeof value!=="object")return base;const raw=value as Record<string,unknown>;const channels=raw.channelRules&&typeof raw.channelRules==="object"?raw.channelRules as Record<string,unknown>:{};return{tone:strings(raw.tone).length?strings(raw.tone):base.tone,writingRules:strings(raw.writingRules).length?strings(raw.writingRules):base.writingRules,avoid:strings(raw.avoid).length?strings(raw.avoid):base.avoid,founderVoice:typeof raw.founderVoice==="string"?raw.founderVoice:base.founderVoice,visualDirection:strings(raw.visualDirection).length?strings(raw.visualDirection):base.visualDirection,channelRules:{x:strings(channels.x).length?strings(channels.x):base.channelRules.x,linkedin:strings(channels.linkedin).length?strings(channels.linkedin):base.channelRules.linkedin,instagram:strings(channels.instagram).length?strings(channels.instagram):base.channelRules.instagram,email:strings(channels.email).length?strings(channels.email):base.channelRules.email,voice:strings(channels.voice).length?strings(channels.voice):base.channelRules.voice}};}

export async function buildProductBrain(input: ProductBrainInput): Promise<ProductBrainOutput> {
  if (!process.env.OPENAI_API_KEY) return fallback(input);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_RESEARCH_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "medium" },
    tools: input.sourceUrl ? [{ type: "web_search_preview" as const, search_context_size: "medium" as const }] : undefined,
    instructions: [
      "You are the product and brand intelligence layer of an autonomous B2B distribution system.",
      "Create a sales-safe product brain from the supplied public source and notes.",
      "Do not invent customers, metrics, certifications, pricing, capabilities, or proof.",
      "Separate verified proof from positioning ideas. If evidence is absent, leave proof empty.",
      "Also infer a practical brandVoice from the actual source/notes. It must reduce generic AI writing, not create a fictional brand identity.",
      "brandVoice must contain tone[], writingRules[], avoid[], founderVoice, visualDirection[], and channelRules with x[], linkedin[], instagram[], email[], voice[].",
      "Return JSON only with: name, sourceUrl, notes, language, oneLiner, targetCustomer, pains, proof, pricingNotes, forbiddenClaims, positioning, objections, useCases, brandVoice.",
      `Use ${input.language === "ru" ? "Russian" : "English"} for human-readable fields.`
    ].join(" "),
    input: JSON.stringify(input)
  });
  const parsed = JSON.parse(cleanJson(response.output_text)) as Partial<ProductBrainOutput>;
  return {
    name: String(parsed.name || input.name), sourceUrl: input.sourceUrl, notes: input.notes, language: input.language,
    oneLiner: String(parsed.oneLiner || input.notes || input.name), targetCustomer: String(parsed.targetCustomer || ""),
    pains: strings(parsed.pains), proof: strings(parsed.proof),
    pricingNotes: typeof parsed.pricingNotes === "string" ? parsed.pricingNotes : undefined,
    forbiddenClaims: strings(parsed.forbiddenClaims), positioning: strings(parsed.positioning), objections: strings(parsed.objections), useCases: strings(parsed.useCases),brandVoice:parseBrand(parsed.brandVoice,input.language)
  };
}
