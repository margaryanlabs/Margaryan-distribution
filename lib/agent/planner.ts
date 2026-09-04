import OpenAI from "openai";
import type { DistributionPlan, MissionInput } from "@/lib/types";

const schema = {
  type:"object", additionalProperties:false,
  required:["missionName","thesis","audience","contentPillars","actions","successMetrics","stopConditions"],
  properties:{
    missionName:{type:"string"}, thesis:{type:"string"}, audience:{type:"array",items:{type:"string"}}, contentPillars:{type:"array",items:{type:"string"}},
    actions:{type:"array",items:{type:"object",additionalProperties:false,required:["id","channel","kind","objective","rationale","mode","scheduledOffsetHours","payload"],properties:{
      id:{type:"string"}, channel:{type:"string",enum:["email","voice","linkedin","instagram","x"]}, kind:{type:"string",enum:["send_email","publish_post","reply","call","research","analyze"]}, objective:{type:"string"}, rationale:{type:"string"}, mode:{type:"string",enum:["AUTO","APPROVE","BLOCKED"]}, scheduledOffsetHours:{type:"number",minimum:0}, payload:{type:"object",additionalProperties:true}
    }}}, successMetrics:{type:"array",items:{type:"string"}}, stopConditions:{type:"array",items:{type:"string"}}
  }
} as const;

function fallback(input: MissionInput): DistributionPlan {
  const publicMode = input.autonomy === "auto" ? "AUTO" : "APPROVE";
  return {
    missionName:"Distribution mission", thesis:input.goal, audience:[`Relevant buyers in ${input.market || "target market"}`], contentPillars:["Problem education","Proof","Product demonstration","Founder perspective"],
    actions:[
      {id:"research-1",channel:"email",kind:"research",objective:"Build and score target accounts",rationale:"Relevance before volume",mode:"AUTO",scheduledOffsetHours:0,payload:{}},
      {id:"email-1",channel:"email",kind:"send_email",objective:"Personalized first touch",rationale:"Direct measurable outreach",mode:publicMode,scheduledOffsetHours:2,payload:{subject:"Generated at execution time",body:"Generated at execution time"}},
      {id:"x-1",channel:"x",kind:"publish_post",objective:"Publish a problem-led insight",rationale:"Build public demand while outbound runs",mode:publicMode,scheduledOffsetHours:4,payload:{text:"Generated at execution time"}},
      {id:"linkedin-1",channel:"linkedin",kind:"publish_post",objective:"Publish founder-led proof",rationale:"Reach professional buyers",mode:"APPROVE",scheduledOffsetHours:8,payload:{commentary:"Generated at execution time"}},
      {id:"instagram-1",channel:"instagram",kind:"publish_post",objective:"Publish visual proof",rationale:"Repurpose campaign creatively",mode:"APPROVE",scheduledOffsetHours:12,payload:{caption:"Generated at execution time",mediaUrl:""}},
      {id:"voice-1",channel:"voice",kind:"call",objective:"Qualify warm responders",rationale:"Use voice after intent appears",mode:"BLOCKED",scheduledOffsetHours:24,payload:{}}
    ],
    successMetrics:["Qualified replies","Meetings booked","Positive reply rate","Content engagement","Attributed pipeline"], stopConditions:["Explicit opt-out","High complaint rate","Channel restriction","Unverified calling jurisdiction"]
  };
}

export async function buildDistributionPlan(input: MissionInput): Promise<DistributionPlan> {
  if (!process.env.OPENAI_API_KEY) return fallback(input);
  const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response = await client.responses.create({
    model:process.env.OPENAI_PLANNER_MODEL || "gpt-5.6-terra",
    reasoning:{effort:"medium"},
    instructions:"You are the planning brain of Margaryan Distribution, a governed autonomous distribution OS. Translate the business goal into a practical multi-channel sales + SMM plan. Use official provider APIs only. Never propose credential scraping, platform-bypass automation, deceptive identity claims, or spam at scale. Prefer low-volume relevance and measurable experiments. Use APPROVE for cold outreach or public brand actions unless policy clearly permits AUTO. Use BLOCKED for voice until jurisdiction, DNC and permitted-hours checks are verified.",
    input:JSON.stringify(input),
    text:{format:{type:"json_schema",name:"distribution_plan",strict:true,schema}}
  });
  return JSON.parse(response.output_text) as DistributionPlan;
}
