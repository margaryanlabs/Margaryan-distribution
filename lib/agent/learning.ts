import OpenAI from "openai";
import { distributionStore } from "@/lib/store";
import { buildExperimentLedger } from "@/lib/agent/experiment-ledger";
import type { LearningRanking, LearningReport, PerformanceEvent, PerformanceMetrics } from "@/lib/types";

type Bucket={key:string;metrics:Required<Omit<PerformanceMetrics,"spend">>&{spend:number}};
const zero=()=>({impressions:0,engagements:0,clicks:0,replies:0,positiveReplies:0,meetings:0,conversions:0,revenueUsd:0,spend:0});
function add(target:Bucket["metrics"],metrics:PerformanceMetrics){for(const key of Object.keys(target) as Array<keyof Bucket["metrics"]>){const value=Number(metrics[key]||0);if(Number.isFinite(value)&&value>0)target[key]+=value;}}
function score(metrics:Bucket["metrics"]){return Number((metrics.conversions*1000+metrics.revenueUsd*.2+metrics.meetings*250+metrics.positiveReplies*100+metrics.replies*25+metrics.clicks*2+metrics.engagements*.1).toFixed(2));}
function ranking(map:Map<string,Bucket["metrics"]>):LearningRanking[]{return[...map.entries()].map(([key,metrics])=>({key,impressions:metrics.impressions,engagements:metrics.engagements,clicks:metrics.clicks,replies:metrics.replies,positiveReplies:metrics.positiveReplies,meetings:metrics.meetings,conversions:metrics.conversions,revenueUsd:metrics.revenueUsd,score:score(metrics)})).sort((a,b)=>b.score-a.score);}
function aggregate(events:PerformanceEvent[],dimension:(event:PerformanceEvent)=>string|undefined){const map=new Map<string,Bucket["metrics"]>();for(const event of events){const key=dimension(event);if(!key)continue;const metrics=map.get(key)||zero();add(metrics,event.metrics);map.set(key,metrics);}return ranking(map);}

export async function generateLearningReport(missionId:string):Promise<LearningReport>{
 const mission=distributionStore.getMission(missionId);if(!mission)throw new Error("Mission not found");
 const events=distributionStore.listPerformance().filter(event=>event.missionId===missionId);const contentById=new Map(distributionStore.listContent().filter(item=>item.missionId===missionId).map(item=>[item.id,item]));const experiments=buildExperimentLedger(distributionStore.snapshot(),missionId);const comparableExperiments=experiments.filter(item=>["ready_to_compare","completed"].includes(item.status)&&item.winnerVariantId);
 const channelRankings=aggregate(events,event=>event.channel);const pillarRankings=aggregate(events,event=>event.contentId?contentById.get(event.contentId)?.pillar:undefined);
 let summary="No performance evidence has been recorded for this mission yet.";let recommendations=["Collect real provider or CRM metrics before changing the strategy.","Do not treat generated content volume as performance evidence."];
 if(events.length){
   const topChannel=channelRankings[0]?.key;const topPillar=pillarRankings[0]?.key;
   summary=`Learning pass used ${events.length} factual performance event${events.length===1?"":"s"}. ${topChannel?`Highest downstream-signal channel: ${topChannel}.`:""} ${topPillar?`Highest downstream-signal content pillar: ${topPillar}.`:""}`.trim();
   const experimentRecommendations=comparableExperiments.slice(0,2).map(item=>item.causalLanguageAllowed?`Controlled holdout: ${item.conclusion}`:`Directional experiment only: ${item.conclusion}`);recommendations=[...experimentRecommendations,...(topChannel?[`Keep testing ${topChannel}, but preserve a control allocation for other channels.`]:[]),...(topPillar?[`Create a new variant around the ${topPillar} pillar rather than simply reposting the same asset.`]:[]),events.length<5?"Sample size is small; avoid broad strategy changes yet.":"Compare the next batch against this baseline before scaling volume."].slice(0,6);
   if(process.env.OPENAI_API_KEY){
     try{
       const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});const response=await client.responses.create({model:process.env.OPENAI_CONTENT_MODEL||"gpt-5.6-luna",reasoning:{effort:"low"},instructions:["You are the learning layer of a governed distribution system.","Use only the supplied aggregate metrics and mission context. Never invent causality, attribution, revenue, audience sentiment or statistical significance.","Prefer testable next experiments over generic advice.","If evidence is sparse, say so.",`Write in ${mission.input.language==="ru"?"Russian":"English"}.`].join(" "),input:JSON.stringify({mission:mission.input,eventCount:events.length,channelRankings,pillarRankings,experiments:experiments.slice(0,6).map(item=>({hypothesis:item.experiment.hypothesis,assignment:item.experiment.assignment,primaryMetric:item.experiment.primaryMetric,status:item.status,confidence:item.confidence,conclusion:item.conclusion,causalLanguageAllowed:item.causalLanguageAllowed,upliftPercent:item.upliftPercent,variants:item.variants.map(variant=>({label:variant.label,role:variant.role,exposureCount:variant.exposureCount,primaryMetricValue:variant.primaryMetricValue,ratePerExposure:variant.ratePerExposure}))}))}),text:{format:{type:"json_schema",name:"distribution_learning",strict:true,schema:{type:"object",additionalProperties:false,required:["summary","recommendations"],properties:{summary:{type:"string"},recommendations:{type:"array",items:{type:"string"},minItems:1,maxItems:6}}}}}});const parsed=JSON.parse(response.output_text) as {summary:string;recommendations:string[]};summary=parsed.summary;recommendations=parsed.recommendations;}
     catch{/* Deterministic evidence-only fallback remains available. */}
   }
 }
 return distributionStore.addLearning({missionId,summary,channelRankings,pillarRankings,recommendations,evidenceEventIds:events.map(event=>event.id)});
}
