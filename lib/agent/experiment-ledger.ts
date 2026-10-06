import {buildDecisionEngineReport} from "@/lib/agent/decision-engine";
import type {DashboardSnapshot,ExperimentConfidence,ExperimentRecord,ExperimentVariant,Lead,PerformanceMetrics} from "@/lib/types";

export interface ExperimentDesign{
  dimension:ExperimentRecord["dimension"];
  assignment:ExperimentRecord["assignment"];
  causalClaimAllowed:boolean;
  hypothesis:string;
  primaryMetric:ExperimentRecord["primaryMetric"];
  minimumExposurePerVariant:number;
  windowHours:number;
  variants:Array<{
    id:string;
    label:string;
    role:"baseline"|"variant";
    target?:string;
    plannedShare:number;
    leadIds:string[];
  }>;
  notes:string[];
}

export interface ExperimentVariantAnalysis{
  id:string;
  label:string;
  role:"baseline"|"variant";
  exposureCount:number;
  primaryMetricValue:number;
  ratePerExposure:number;
  metrics:Required<PerformanceMetrics>;
}

export interface ExperimentAnalysis{
  experiment:ExperimentRecord;
  variants:ExperimentVariantAnalysis[];
  confidence:ExperimentConfidence;
  status:"not_started"|"collecting"|"directional"|"ready_to_compare"|"completed";
  winnerVariantId?:string;
  upliftPercent?:number;
  conclusion:string;
  causalLanguageAllowed:boolean;
  guardrails:string[];
}

const zeroMetrics=():Required<PerformanceMetrics>=>({impressions:0,engagements:0,clicks:0,replies:0,positiveReplies:0,meetings:0,conversions:0,revenueUsd:0,spend:0});
const ACTIVE=new Set<Lead["stage"]>(["new","researched","contacted","replied","qualified","meeting"]);

function hash(value:string){
  let out=2166136261;
  for(let i=0;i<value.length;i++){out^=value.charCodeAt(i);out=Math.imul(out,16777619);}
  return out>>>0;
}
function comparablePool(leads:Lead[]){
  const active=leads.filter(item=>ACTIVE.has(item.stage)&&!item.optedOut&&Boolean(item.email));
  const groups=new Map<string,Lead[]>();
  for(const lead of active){
    const key=[lead.segment||"unsegmented",lead.recommendedOfferCode||lead.recommendedOffer||"no-offer"].join("::");
    groups.set(key,[...(groups.get(key)||[]),lead]);
  }
  const best=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length||b[1].reduce((s,x)=>s+Number(x.score||0),0)-a[1].reduce((s,x)=>s+Number(x.score||0),0))[0];
  return best?.[1]||active;
}
function assignHoldout(leads:Lead[],planId:string){
  const ranked=[...leads].sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,8);
  const baseline:Lead[]=[];const variant:Lead[]=[];
  for(const lead of ranked){
    ((hash(planId+":"+lead.id)%2===0)?baseline:variant).push(lead);
  }
  if(!baseline.length&&variant.length)baseline.push(variant.shift()!);
  if(!variant.length&&baseline.length>1)variant.push(baseline.pop()!);
  const count=Math.min(baseline.length,variant.length,4);
  return{baseline:baseline.slice(0,count),variant:variant.slice(0,count)};
}

export function designExperimentForDirective(state:DashboardSnapshot,missionId:string,directiveId:string,plannerPlanId:string):ExperimentDesign|undefined{
  const report=buildDecisionEngineReport(state,missionId);
  const directive=report.directives.find(item=>item.id===directiveId);
  if(!directive)return undefined;

  if(directive.scope==="channel"&&["scale_test","hold"].includes(directive.kind)){
    const target=directive.target;
    return{
      dimension:"channel",assignment:"observational",causalClaimAllowed:false,
      hypothesis:directive.kind==="scale_test"
        ? "A larger controlled test on "+target+" will improve downstream signal relative to the current channel baseline."
        : "Reworked creative on "+target+" will improve downstream signal relative to the current channel baseline.",
      primaryMetric:target==="email"?"positiveReplies":"clicks",
      minimumExposurePerVariant:2,windowHours:96,
      variants:[
        {id:plannerPlanId+"-baseline",label:"Other-channel holdout",role:"baseline",target:"not:"+target,plannedShare:40,leadIds:[]},
        {id:plannerPlanId+"-variant",label:target.toUpperCase()+" test",role:"variant",target,plannedShare:60,leadIds:[]}
      ],
      notes:["Channel comparison is observational because channel audiences and delivery contexts are not interchangeable.","Treat any uplift as directional until a within-channel randomized test exists."]
    };
  }

  if(["account","segment","offer"].includes(directive.scope)||directive.kind==="focus"){
    const usedLeadIds=new Set(state.outreach.filter(item=>item.missionId===missionId).map(item=>item.leadId));
    const missionLeads=state.leads.filter(item=>item.missionId===missionId&&!usedLeadIds.has(item.id));
    const pool=comparablePool(missionLeads);
    const assigned=assignHoldout(pool,plannerPlanId);
    if(assigned.baseline.length>=2&&assigned.variant.length>=2){
      const segment=assigned.baseline[0]?.segment||assigned.variant[0]?.segment||"comparable ICP";
      const offer=assigned.baseline[0]?.recommendedOffer||assigned.variant[0]?.recommendedOffer||"same next-step offer";
      return{
        dimension:"message",assignment:"hash_holdout",causalClaimAllowed:true,
        hypothesis:"For comparable "+segment+" accounts on "+offer+", a single-signal CTA will improve positive reply rate versus the standard evidence-led CTA.",
        primaryMetric:"positiveReplies",minimumExposurePerVariant:2,windowHours:120,
        variants:[
          {id:plannerPlanId+"-baseline",label:"Standard evidence-led CTA",role:"baseline",target:"baseline",plannedShare:50,leadIds:assigned.baseline.map(item=>item.id)},
          {id:plannerPlanId+"-variant",label:"Single-signal CTA",role:"variant",target:"single_signal_cta",plannedShare:50,leadIds:assigned.variant.map(item=>item.id)}
        ],
        notes:["Assignment is fixed from lead UUID before outcomes are observed.","Eligible leads come from the largest comparable segment + offer group.","External execution still requires the existing approval and compliance gates."]
      };
    }
  }

  return undefined;
}

export function createExperimentRecord(design:ExperimentDesign,missionId:string,plannerPlanId:string,directiveId:string):Omit<ExperimentRecord,"id"|"createdAt"|"updatedAt">{
  const startedAt=new Date().toISOString();
  const endsAt=new Date(Date.now()+design.windowHours*3600000).toISOString();
  return{
    missionId,plannerPlanId,directiveId,dimension:design.dimension,assignment:design.assignment,causalClaimAllowed:design.causalClaimAllowed,
    hypothesis:design.hypothesis,primaryMetric:design.primaryMetric,status:"running",
    variants:design.variants.map(item=>({...item,actionIds:[],contentIds:[],exposureCount:0})),
    minimumExposurePerVariant:design.minimumExposurePerVariant,windowHours:design.windowHours,startedAt,endsAt,notes:design.notes
  };
}

function addMetrics(target:Required<PerformanceMetrics>,metrics:PerformanceMetrics){
  for(const key of Object.keys(target) as Array<keyof Required<PerformanceMetrics>>){
    const value=Number(metrics[key]||0);if(Number.isFinite(value))target[key]+=value;
  }
}
function primary(metrics:Required<PerformanceMetrics>,key:ExperimentRecord["primaryMetric"]){return Number(metrics[key]||0);}
function exposureIds(state:DashboardSnapshot,experimentId:string,variantId:string){
  const actionIds=state.actions.filter(action=>action.payload.experimentId===experimentId&&action.payload.variantId===variantId&&action.status==="succeeded").map(action=>action.recordId);
  const contentIds=state.content.filter(item=>item.experimentId===experimentId&&item.variantId===variantId&&item.status==="published").map(item=>item.id);
  const eventActionIds=state.performance.filter(event=>event.experimentId===experimentId&&event.variantId===variantId&&event.actionId).map(event=>event.actionId!);
  const eventContentIds=state.performance.filter(event=>event.experimentId===experimentId&&event.variantId===variantId&&event.contentId).map(event=>event.contentId!);
  return new Set([...actionIds,...contentIds,...eventActionIds,...eventContentIds]);
}

export function analyzeExperiment(state:DashboardSnapshot,experiment:ExperimentRecord):ExperimentAnalysis{
  const analyses=experiment.variants.map(variant=>{
    const metrics=zeroMetrics();
    const events=state.performance.filter(event=>event.experimentId===experiment.id&&event.variantId===variant.id);
    for(const event of events)addMetrics(metrics,event.metrics);
    const exposures=exposureIds(state,experiment.id,variant.id).size;
    const metricValue=primary(metrics,experiment.primaryMetric);
    return{id:variant.id,label:variant.label,role:variant.role,exposureCount:exposures,primaryMetricValue:metricValue,ratePerExposure:exposures?metricValue/exposures:0,metrics};
  });

  const baseline=analyses.find(item=>item.role==="baseline");
  const variant=analyses.find(item=>item.role==="variant");
  const minimum=experiment.minimumExposurePerVariant;
  const enough=Boolean(baseline&&variant&&baseline.exposureCount>=minimum&&variant.exposureCount>=minimum);
  const totalExposure=analyses.reduce((sum,item)=>sum+item.exposureCount,0);
  let confidence:ExperimentConfidence="insufficient";
  let status:ExperimentAnalysis["status"]="not_started";
  let conclusion="No exposure has been recorded yet.";
  let winnerVariantId:string|undefined;
  let upliftPercent:number|undefined;

  if(totalExposure>0){status="collecting";conclusion="The experiment is collecting factual exposure and outcome data.";}
  if(enough&&baseline&&variant){
    status="ready_to_compare";
    const baselineRate=baseline.ratePerExposure,variantRate=variant.ratePerExposure;
    if(baselineRate>0)upliftPercent=Math.round((variantRate-baselineRate)/baselineRate*1000)/10;
    if(variantRate!==baselineRate)winnerVariantId=variantRate>baselineRate?variant.id:baseline.id;
    const separation=Math.abs(variantRate-baselineRate);
    confidence=experiment.assignment==="hash_holdout"
      ? (Math.min(baseline.exposureCount,variant.exposureCount)>=Math.max(6,minimum*3)&&separation>0?"moderate":"directional")
      : "directional";
    conclusion=winnerVariantId
      ? (experiment.assignment==="hash_holdout"?"The holdout shows a "+confidence+" advantage for "+(winnerVariantId===variant.id?variant.label:baseline.label)+".":"Observed outcomes currently favor "+(winnerVariantId===variant.id?variant.label:baseline.label)+", but channel/context confounding prevents a causal claim.")
      : "Baseline and variant are currently tied on the primary metric.";
  }

  if(experiment.status==="completed"){status="completed";}
  return{
    experiment:{...experiment,variants:experiment.variants.map(item=>({...item,exposureCount:analyses.find(x=>x.id===item.id)?.exposureCount||0}))},
    variants:analyses,confidence,status,winnerVariantId,upliftPercent,
    conclusion,causalLanguageAllowed:experiment.causalClaimAllowed&&experiment.assignment==="hash_holdout"&&enough,
    guardrails:[
      experiment.assignment==="observational"?"This comparison is observational; do not use causal language.":"Holdout assignment was fixed before outcomes were observed.",
      "Revenue and meetings remain factual outcomes; the primary metric is "+experiment.primaryMetric+".",
      "Small samples stay directional even when one arm is ahead.",
      "Do not auto-scale from a single experiment."
    ]
  };
}

export function buildExperimentLedger(state:DashboardSnapshot,missionId:string){
  return state.experiments.filter(item=>item.missionId===missionId).map(item=>analyzeExperiment(state,item)).sort((a,b)=>b.experiment.createdAt.localeCompare(a.experiment.createdAt));
}
