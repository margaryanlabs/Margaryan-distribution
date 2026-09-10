import OpenAI from "openai";
import type { Language, Lead, MissionRecord, ProductRecord } from "@/lib/types";

type LeadCandidate=Pick<Lead,"company"|"website"|"country"|"fitReason"|"score"|"research"|"email"|"phone"|"contactName"|"role"|"linkedinUrl"|"instagramUrl"|"sourceUrls">;

function cleanJson(text:string){return text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim();}
function cleanText(value:unknown){return typeof value==="string"&&value.trim()?value.trim():undefined;}
function cleanUrl(value:unknown){const raw=cleanText(value);if(!raw)return undefined;try{const url=new URL(raw);if(url.protocol!=="http:"&&url.protocol!=="https:")return undefined;url.hash="";return url.toString();}catch{return undefined;}}
function cleanEmail(value:unknown){const raw=cleanText(value)?.toLowerCase();if(!raw)return undefined;return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)?raw:undefined;}
function cleanPhone(value:unknown){const raw=cleanText(value);if(!raw)return undefined;const digits=raw.replace(/\D/g,"");return digits.length>=7&&digits.length<=16?raw:undefined;}

export async function researchBusinessLeads(mission:MissionRecord,limit=8,product?:ProductRecord):Promise<LeadCandidate[]>{
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is required for live lead research");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const language:Language=mission.input.language;const capped=Math.min(Math.max(1,limit),10);
  const response=await client.responses.create({
    model:process.env.OPENAI_RESEARCH_MODEL||"gpt-5.6-terra",
    reasoning:{effort:"medium"},
    tools:[{type:"web_search_preview",search_context_size:"medium"}],
    instructions:[
      "You are the evidence-first account research layer of a B2B distribution system.",
      "Find real active businesses that plausibly match the mission using current public web information. Prioritize buying intent, an obvious operational pain, product fit, and reachable official business channels over raw volume.",
      "Return businesses, not private consumers. Never guess an email, phone, employee name, job title, social profile, customer, metric, revenue, technology stack, or buying signal.",
      "A generic company email or public business phone may be returned only when explicitly published by the company or another authoritative public business source.",
      "contactName may be returned only for a publicly identified business representative on an official company source; role may be returned when that business role is explicit. Omit either field when uncertain.",
      "Prefer the official company website as website. Prefer company LinkedIn and Instagram URLs rather than personal profiles.",
      "Every material fit claim must be traceable to sourceUrls. Prefer official sources and recent pages; include no more than five source URLs per business.",
      "Avoid directories, lead farms, obvious duplicates, dead websites, businesses with no plausible need, and results whose contact data cannot be verified.",
      `Return JSON only: an array of at most ${capped} objects with company, website, country, fitReason, score (0-100), research, email, phone, contactName, role, linkedinUrl, instagramUrl, sourceUrls.`,
      `Write fitReason and research in ${language==="ru"?"Russian":"English"}.`
    ].join(" "),
    input:JSON.stringify({goal:mission.input.goal,market:mission.input.market,audience:mission.plan.audience,thesis:mission.plan.thesis,product:product||null})
  });
  const parsed=JSON.parse(cleanJson(response.output_text)) as LeadCandidate[];if(!Array.isArray(parsed))throw new Error("Lead research returned an invalid payload");
  return parsed.slice(0,capped).filter(lead=>typeof lead.company==="string"&&lead.company.trim()).map(lead=>{
    const website=cleanUrl(lead.website);const sourceUrls=Array.isArray(lead.sourceUrls)?lead.sourceUrls.map(cleanUrl).filter((url):url is string=>Boolean(url)).slice(0,5):[];
    return{
      company:lead.company.trim(),website,country:cleanText(lead.country)||mission.input.market,fitReason:cleanText(lead.fitReason)||"",score:Math.max(0,Math.min(100,Number(lead.score||0))),research:cleanText(lead.research)||"",
      email:cleanEmail(lead.email),phone:cleanPhone(lead.phone),contactName:cleanText(lead.contactName),role:cleanText(lead.role),linkedinUrl:cleanUrl(lead.linkedinUrl),instagramUrl:cleanUrl(lead.instagramUrl),sourceUrls
    };
  });
}
