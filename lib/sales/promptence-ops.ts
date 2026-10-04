import { buildDistributionPlan } from "@/lib/agent/planner";
import { researchBusinessLeads } from "@/lib/agent/research";
import { ensurePortfolioProducts } from "@/lib/portfolio/catalog";
import { distributionStore } from "@/lib/store";
import type { Language, MissionInput } from "@/lib/types";

export const PROMPTENCE_DEFAULT_GOAL="Win 10 paid Promptence customers by building an evidence-led pipeline: research high-fit agencies and B2B SaaS accounts, identify concrete AI-visibility buying signals, prepare personalized outreach, convert interest into paid Diagnostics or the next appropriate offer, and learn from verified replies, meetings and revenue.";
export const PROMPTENCE_DEFAULT_MARKET="United States, United Kingdom, UAE";

export async function bootstrapPromptenceSales(){
  ensurePortfolioProducts();
  const product=distributionStore.listProducts().find(item=>item.name.trim().toLowerCase()==="promptence");
  if(!product)throw new Error("Promptence Product Brain could not be initialized");

  const existing=distributionStore.listMissions().find(item=>item.status==="active"&&item.input.productId===product.id);
  if(existing){
    return{
      created:false,
      product,
      mission:existing,
      actions:distributionStore.listActions().filter(action=>action.missionId===existing.id)
    };
  }

  const input:MissionInput={
    goal:PROMPTENCE_DEFAULT_GOAL,
    market:PROMPTENCE_DEFAULT_MARKET,
    language:"en",
    autonomy:"approve",
    productId:product.id
  };
  const plan=await buildDistributionPlan(input,product);
  const created=distributionStore.createMission(input,plan);
  return{created:true,product,...created};
}

export async function researchPromptenceBatch(missionId:string,limit=10){
  const mission=distributionStore.getMission(missionId);
  if(!mission)throw new Error("Promptence sales mission not found");
  const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
  if(!product||product.name.trim().toLowerCase()!=="promptence")throw new Error("Mission is not a Promptence sales mission");

  const capped=Math.max(1,Math.min(10,Number(limit||10)));
  const candidates=await researchBusinessLeads(mission,capped,product);
  const created=distributionStore.addLeads(candidates.map(candidate=>({
    ...candidate,
    missionId:mission.id,
    language:mission.input.language as Language,
    stage:"researched" as const
  })));

  const all=distributionStore.listLeads().filter(lead=>lead.missionId===mission.id);
  const matched=candidates.map(candidate=>{
    const host=(value?:string)=>{
      if(!value)return"";
      try{return new URL(value).hostname.toLowerCase().replace(/^www\./,"");}catch{return"";}
    };
    const candidateHost=host(candidate.website);
    return all.find(lead=>
      (candidateHost&&host(lead.website)===candidateHost)||
      (candidate.email&&lead.email?.toLowerCase()===candidate.email.toLowerCase())||
      lead.company.trim().toLowerCase()===candidate.company.trim().toLowerCase()
    );
  }).filter((lead):lead is NonNullable<typeof lead>=>Boolean(lead));

  return{researched:candidates.length,added:created.length,leads:matched};
}

export function promptenceShadowReport(missionId:string){
  const mission=distributionStore.getMission(missionId);
  if(!mission)throw new Error("Promptence sales mission not found");
  const leads=distributionStore.listLeads()
    .filter(lead=>lead.missionId===mission.id)
    .sort((a,b)=>(b.score||0)-(a.score||0));

  return{
    mission:{id:mission.id,name:mission.plan.missionName,status:mission.status,market:mission.input.market,goal:mission.input.goal},
    totals:{
      accounts:leads.length,
      reachable:leads.filter(lead=>Boolean(lead.email||lead.phone||lead.linkedinUrl||lead.instagramUrl)).length,
      qualifiedForOutreach:leads.filter(lead=>(lead.score||0)>=68&&Boolean(lead.email||lead.phone||lead.linkedinUrl||lead.instagramUrl)&&!lead.optedOut&&lead.stage!=="do_not_contact").length
    },
    topAccounts:leads.slice(0,20).map(lead=>({
      id:lead.id,
      company:lead.company,
      website:lead.website,
      country:lead.country,
      segment:lead.segment,
      priority:lead.priority,
      score:lead.score,
      buyingSignals:lead.buyingSignals||[],
      painHypotheses:lead.painHypotheses||[],
      qualificationReasons:lead.qualificationReasons||[],
      qualificationGaps:lead.qualificationGaps||[],
      recommendedOffer:lead.recommendedOffer,
      estimatedValueUsd:lead.estimatedValueUsd,
      email:lead.email,
      role:lead.role,
      contactName:lead.contactName,
      sourceUrls:lead.sourceUrls||[],
      stage:lead.stage
    }))
  };
}
