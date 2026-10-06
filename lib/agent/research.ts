import OpenAI from "openai";
import type { Language, Lead, MissionRecord, ProductRecord } from "@/lib/types";
import type { GrowthMemoryReport } from "@/lib/agent/growth-memory";
import { growthMemoryPrompt } from "@/lib/agent/growth-memory";

type LeadCandidate=Pick<Lead,"company"|"website"|"country"|"fitReason"|"score"|"research"|"email"|"phone"|"contactName"|"role"|"linkedinUrl"|"instagramUrl"|"sourceUrls"|"segment"|"buyingSignals"|"painHypotheses"|"recommendedOfferCode"|"recommendedOffer"|"estimatedValueUsd"|"priority"|"qualificationReasons"|"qualificationGaps">;

function cleanJson(text:string){return text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim();}
function cleanText(value:unknown){return typeof value==="string"&&value.trim()?value.trim():undefined;}
function cleanUrl(value:unknown){const raw=cleanText(value);if(!raw)return undefined;try{const url=new URL(raw);if(url.protocol!=="http:"&&url.protocol!=="https:")return undefined;url.hash="";return url.toString();}catch{return undefined;}}
function cleanEmail(value:unknown){const raw=cleanText(value)?.toLowerCase();if(!raw)return undefined;return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)?raw:undefined;}
function cleanPhone(value:unknown){const raw=cleanText(value);if(!raw)return undefined;const digits=raw.replace(/\D/g,"");return digits.length>=7&&digits.length<=16?raw:undefined;}
function cleanList(value:unknown,limit=6){return Array.isArray(value)?value.map(cleanText).filter((item):item is string=>Boolean(item)).slice(0,limit):undefined;}
function cleanPriority(value:unknown):Lead["priority"]{return value==="P0"||value==="P1"||value==="P2"||value==="P3"?value:undefined;}
function cleanMoney(value:unknown){const amount=Number(value);return Number.isFinite(amount)&&amount>=0&&amount<=1000000?Math.round(amount):undefined;}

export async function researchBusinessLeads(mission:MissionRecord,limit=8,product?:ProductRecord,options:{excludeCompanies?:string[];growthMemory?:GrowthMemoryReport}={}):Promise<LeadCandidate[]>{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is required for live lead research");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const language:Language=mission.input.language;const capped=Math.min(Math.max(1,limit),10);
  const researchProduct=product?{
    name:product.name,
    sourceUrl:product.sourceUrl,
    oneLiner:product.oneLiner,
    targetCustomer:product.targetCustomer,
    pains:product.pains,
    proof:product.proof,
    pricingNotes:product.pricingNotes,
    positioning:product.positioning,
    salesMotion:product.salesMotion?{
      minimumLeadScore:product.salesMotion.minimumLeadScore,
      segments:product.salesMotion.segments,
      triggerSignals:product.salesMotion.triggerSignals,
      qualificationRules:product.salesMotion.qualificationRules,
      offers:product.salesMotion.offers
    }:undefined
  }:null;
  const response=await client.responses.create({
    model:process.env.OPENAI_RESEARCH_MODEL||"gpt-6.1-sol",
    max_output_tokens:1800,
    tools:[{type:"web_search_preview",search_context_size:"low"}],
    instructions:[
      "You are the evidence-first account research layer of a B2B distribution system.",
      "Find real active businesses that plausibly match the mission using current public web information. Prioritize buying intent, an obvious operational pain, product fit, and reachable official business channels over raw volume.",
      "When a product salesMotion is supplied, use its ICP segments, trigger signals, qualification rules and offer ladder as the sales source of truth. Do not force-fit an account into a segment.",
      "Return businesses, not private consumers. Never guess an email, phone, employee name, job title, social profile, customer, metric, revenue, technology stack, or buying signal.",
      "A generic company email or public business phone may be returned only when explicitly published by the company or another authoritative public business source.",
      "contactName may be returned only for a publicly identified business representative on an official company source; role may be returned when that business role is explicit. Omit either field when uncertain.",
      "Prefer the official company website as website. Prefer company LinkedIn and Instagram URLs rather than personal profiles.",
      "Every material fit claim must be traceable to sourceUrls. Prefer official sources and recent pages; include no more than five source URLs per business.",
      "Score conservatively. A high score requires concrete evidence. For products with a structured sales motion, identify the closest segment, explicit buyingSignals, evidence-based painHypotheses, qualificationReasons, qualificationGaps and the next logical offer. estimatedValueUsd is the current listed price of that recommended offer, not expected revenue.",
      "Avoid directories, lead farms, obvious duplicates, dead websites, businesses with no plausible need, and results whose contact data cannot be verified.",
      "Do not return any company listed in excludeCompanies. Treat obvious brand/domain variants as the same company.",
      "Historical growthMemory is a prior from past CRM outcomes, not proof that a new company will convert. Use it to prioritize where current evidence is otherwise comparable. Never invent a trigger just to match memory. Deprioritized patterns may still be explored only when the current company has a materially different verified trigger or qualification signal.",
      `Return JSON only: an array of at most ${capped} objects with company, website, country, fitReason, score (0-100), research, email, phone, contactName, role, linkedinUrl, instagramUrl, sourceUrls, segment, buyingSignals:string[], painHypotheses:string[], recommendedOfferCode, recommendedOffer, estimatedValueUsd, priority (P0|P1|P2|P3), qualificationReasons:string[], qualificationGaps:string[].`,
      `Write fitReason and research in ${language==="ru"?"Russian":"English"}.`
    ].join(" "),
    input:JSON.stringify({goal:mission.input.goal,market:mission.input.market,audience:mission.plan.audience,thesis:mission.plan.thesis,product:researchProduct,growthMemory:options.growthMemory?growthMemoryPrompt(options.growthMemory):null,excludeCompanies:(options.excludeCompanies||[]).slice(0,100)})
  });
  const parsed=JSON.parse(cleanJson(response.output_text)) as LeadCandidate[];if(!Array.isArray(parsed))throw new Error("Lead research returned an invalid payload");
  return parsed.slice(0,capped).filter(lead=>typeof lead.company==="string"&&lead.company.trim()).map(lead=>{
    const website=cleanUrl(lead.website);const sourceUrls=Array.isArray(lead.sourceUrls)?lead.sourceUrls.map(cleanUrl).filter((url):url is string=>Boolean(url)).slice(0,5):[];
    return{
      company:lead.company.trim(),website,country:cleanText(lead.country)||mission.input.market,fitReason:cleanText(lead.fitReason)||"",score:Math.max(0,Math.min(100,Number(lead.score||0))),research:cleanText(lead.research)||"",
      email:cleanEmail(lead.email),phone:cleanPhone(lead.phone),contactName:cleanText(lead.contactName),role:cleanText(lead.role),linkedinUrl:cleanUrl(lead.linkedinUrl),instagramUrl:cleanUrl(lead.instagramUrl),sourceUrls,segment:cleanText(lead.segment),buyingSignals:cleanList(lead.buyingSignals),painHypotheses:cleanList(lead.painHypotheses),recommendedOfferCode:cleanText(lead.recommendedOfferCode),recommendedOffer:cleanText(lead.recommendedOffer),estimatedValueUsd:cleanMoney(lead.estimatedValueUsd),priority:cleanPriority(lead.priority),qualificationReasons:cleanList(lead.qualificationReasons),qualificationGaps:cleanList(lead.qualificationGaps)
    };
  });
}
