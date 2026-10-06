import {buildDecisionEngineReport} from "@/lib/agent/decision-engine";
import {buildExperimentLedger} from "@/lib/agent/experiment-ledger";
import type {DashboardSnapshot,Lead,LearningRanking} from "@/lib/types";

export type AllocationBucket="pipeline"|"research"|"channel_experiments"|"offer_icp_tests"|"quality_ops";
export type AllocationScenarioId="protect_pipeline"|"balanced"|"evidence_weighted";

export interface AllocationSlice{
  key:string;
  label:string;
  units:number;
  percent:number;
  rationale:string;
  evidence:string[];
}

export interface AllocationDirectiveRef{ id:string; title:string; scope:string; kind:string; priority:number; }

export interface AllocationScenario{
  id:AllocationScenarioId;
  name:string;
  thesis:string;
  recommended:boolean;
  confidence:"low"|"medium"|"high";
  totalUnits:number;
  buckets:Record<AllocationBucket,number>;
  channelMix:AllocationSlice[];
  segmentMix:AllocationSlice[];
  offerMix:AllocationSlice[];
  suggestedDirectives:AllocationDirectiveRef[];
  operatingRules:string[];
  learningGoal:string;
}

export interface ResourceAllocationReport{
  generatedAt:string;
  missionId:string;
  totalUnits:number;
  recommendedScenarioId:AllocationScenarioId;
  scenarios:AllocationScenario[];
  constraints:string[];
  evidenceSummary:{
    events:number;
    openAccounts:number;
    warmAccounts:number;
    overdueAccounts:number;
    approvalBacklog:number;
    executionExceptions:number;
    rankedChannels:number;
    controlledExperiments:number;
    directionalExperiments:number;
  };
  disclaimer:string;
}

const ACTIVE_STAGES=new Set<Lead["stage"]>(["new","researched","contacted","replied","qualified","meeting"]);
const WARM_STAGES=new Set<Lead["stage"]>(["replied","qualified","meeting"]);

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value));}
function roundToTotal(values:number[],total:number){
  if(!values.length)return[];
  const raw=values.map(value=>Math.max(0,value));
  const sum=raw.reduce((a,b)=>a+b,0);
  if(sum<=0){
    const base=Math.floor(total/raw.length),remainder=total-base*raw.length;
    return raw.map((_,index)=>base+(index<remainder?1:0));
  }
  const scaled=raw.map(value=>value/sum*total);
  const floors=scaled.map(Math.floor);
  let remainder=total-floors.reduce((a,b)=>a+b,0);
  const order=scaled.map((value,index)=>({index,fraction:value-floors[index]})).sort((a,b)=>b.fraction-a.fraction);
  for(let i=0;i<remainder;i++)floors[order[i%order.length].index]+=1;
  return floors;
}
function toPercent(units:number,total:number){return total?Math.round(units/total*100):0;}
function evidence(item:LearningRanking){
  return[
    item.clicks?item.clicks+" clicks":"",
    item.replies?item.replies+" replies":"",
    item.positiveReplies?item.positiveReplies+" positive replies":"",
    item.meetings?item.meetings+" meetings":"",
    item.revenueUsd?"$"+Math.round(item.revenueUsd).toLocaleString("en-US")+" verified revenue":""
  ].filter(Boolean);
}
function scoreChannel(item:LearningRanking){
  return item.score+item.meetings*15+item.positiveReplies*8+Math.min(20,item.revenueUsd/250);
}
function buildMix(entries:Array<{key:string;label:string;weight:number;rationale:string;evidence:string[]}>,units:number,floorExploration=false){
  if(units<=0||!entries.length)return[];
  const sorted=[...entries].sort((a,b)=>b.weight-a.weight).slice(0,5);
  let weights=sorted.map(item=>Math.max(1,item.weight));
  if(floorExploration&&sorted.length>1){
    const max=Math.max(...weights);
    weights=weights.map((weight,index)=>index===0?max:Math.max(weight,max*.2));
  }
  const allocations=roundToTotal(weights,units);
  return sorted.map((item,index)=>({
    key:item.key,label:item.label,units:allocations[index],percent:toPercent(allocations[index],units),
    rationale:item.rationale,evidence:item.evidence
  })).filter(item=>item.units>0);
}
function groupSegments(leads:Lead[]){
  const groups=new Map<string,Lead[]>();
  for(const lead of leads){
    const key=lead.segment?.trim();if(!key)continue;
    groups.set(key,[...(groups.get(key)||[]),lead]);
  }
  return[...groups.entries()].map(([key,items])=>{
    const warm=items.filter(item=>WARM_STAGES.has(item.stage)).length;
    const meetings=items.filter(item=>["meeting","won"].includes(item.stage)).length;
    const touched=items.filter(item=>["contacted","replied","qualified","meeting","won","lost"].includes(item.stage)).length;
    const avgFit=items.length?items.reduce((sum,item)=>sum+Number(item.score||0),0)/items.length:0;
    const weight=avgFit*.35+warm*12+meetings*18+(touched?Math.min(10,warm/touched*20):0);
    return{key,label:key,weight,rationale:meetings?"Meeting-stage evidence exists for this segment.":warm?"Warm-stage evidence exists for this segment.":"Fit evidence only; preserve exploration rather than scaling.",evidence:[items.length+" accounts",warm+" warm",meetings+" meeting/won",Math.round(avgFit)+" avg fit"]};
  }).filter(item=>item.weight>0);
}
function groupOffers(leads:Lead[]){
  const groups=new Map<string,Lead[]>();
  for(const lead of leads){
    const key=(lead.recommendedOffer||lead.recommendedOfferCode||"").trim();if(!key)continue;
    groups.set(key,[...(groups.get(key)||[]),lead]);
  }
  return[...groups.entries()].map(([key,items])=>{
    const warm=items.filter(item=>WARM_STAGES.has(item.stage)||item.stage==="won").length;
    const meetings=items.filter(item=>["meeting","won"].includes(item.stage)).length;
    const value=items.reduce((sum,item)=>sum+Number(item.estimatedValueUsd||0),0);
    const weight=warm*10+meetings*18+Math.min(20,value/1000)+items.length*2;
    return{key,label:key,weight,rationale:meetings?"The offer is attached to meeting/won accounts.":warm?"The offer is attached to warm accounts.":"Offer has recommendation coverage but limited downstream evidence.",evidence:[items.length+" accounts",warm+" warm",meetings+" meeting/won",value?"$"+Math.round(value).toLocaleString("en-US")+" estimated value":""] .filter(Boolean)};
  }).filter(item=>item.weight>0);
}

export function buildResourceAllocationReport(state:DashboardSnapshot,missionId:string,totalUnits=100):ResourceAllocationReport{
  const units=clamp(Math.round(totalUnits)||100,20,500);
  const mission=state.missions.find(item=>item.id===missionId);
  if(!mission)throw new Error("Mission not found");

  const leads=state.leads.filter(item=>item.missionId===missionId);
  const actions=state.actions.filter(item=>item.missionId===missionId);
  const events=state.performance.filter(item=>item.missionId===missionId);
  const learning=[...state.learnings].filter(item=>item.missionId===missionId).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))[0];
  const decisions=buildDecisionEngineReport(state,missionId);
  const experiments=buildExperimentLedger(state,missionId);
  const controlledExperiments=experiments.filter(item=>item.causalLanguageAllowed&&["ready_to_compare","completed"].includes(item.status));
  const directionalExperiments=experiments.filter(item=>!item.causalLanguageAllowed&&["directional","ready_to_compare","completed"].includes(item.status));

  const open=leads.filter(item=>ACTIVE_STAGES.has(item.stage));
  const warm=open.filter(item=>WARM_STAGES.has(item.stage));
  const overdue=open.filter(item=>item.nextActionAt&&Date.parse(item.nextActionAt)<Date.now());
  const approvals=actions.filter(item=>item.mode==="APPROVE"&&item.status==="queued");
  const exceptions=actions.filter(item=>["blocked","failed","dead_letter"].includes(item.status));
  const rankedChannels=learning?.channelRankings||[];

  const evidenceStrength=clamp(
    events.length*.8+warm.length*5+rankedChannels.filter(item=>item.replies||item.meetings||item.revenueUsd).length*10+controlledExperiments.length*22+directionalExperiments.length*6,
    0,100
  );
  const opsRisk=clamp(exceptions.length*10+approvals.length*3,0,100);
  const pipelinePressure=clamp(warm.length*12+overdue.length*14+approvals.filter(item=>["reply","book_meeting"].includes(item.kind)).length*10,0,100);

  const recommendedScenarioId:AllocationScenarioId =
    opsRisk>=45||pipelinePressure>=55 ? "protect_pipeline" :
    evidenceStrength>=55 ? "evidence_weighted" : "balanced";

  const channelEntries=rankedChannels.map(item=>({
    key:item.key,label:item.key.toUpperCase(),weight:Math.max(1,scoreChannel(item)),
    rationale:item.meetings||item.revenueUsd?"Downstream evidence supports a larger controlled test.":item.replies||item.clicks?"Some downstream signal exists; keep the test bounded.":"Insufficient downstream signal; keep exploration small.",
    evidence:evidence(item)
  }));
  const segmentEntries=groupSegments(leads);
  const offerEntries=groupOffers(leads);

  const scenarioDefs:Array<{id:AllocationScenarioId;name:string;thesis:string;weights:number[];confidence:"low"|"medium"|"high";learningGoal:string;rules:string[]}>= [
    {
      id:"protect_pipeline",name:"Protect Pipeline",
      thesis:"Concentrate attention on existing warm opportunities and system health before adding more volume.",
      weights:[55,10,10,10,15],
      confidence:(warm.length||overdue.length||exceptions.length)?"high":"medium",
      learningGoal:"Maximize learning from already-open opportunities before expanding the top of funnel.",
      rules:["Warm replies and meeting-stage accounts outrank cold acquisition.","No extra volume while execution exceptions remain unresolved.","Keep a small exploration budget so learning does not stop."]
    },
    {
      id:"balanced",name:"Balanced Discovery",
      thesis:"Keep current opportunities moving while preserving enough research and channel experimentation to avoid premature convergence.",
      weights:[38,22,20,10,10],
      confidence:events.length>=10?"medium":"low",
      learningGoal:"Collect comparable evidence across pipeline, ICP and channel without overcommitting to weak signals.",
      rules:["Maintain at least 20% of effort for net-new discovery.","No single channel receives more than 60% of the channel experiment bucket.","Operator approvals stay ahead of net-new volume."]
    },
    {
      id:"evidence_weighted",name:"Evidence Weighted",
      thesis:"Lean into recorded downstream signal while keeping explicit exploration floors and operational reserves.",
      weights:[
        clamp(30+pipelinePressure*.18,30,48),
        clamp(18-evidenceStrength*.07,10,18),
        clamp(24+evidenceStrength*.16,24,38),
        clamp(14+evidenceStrength*.05,14,20),
        clamp(14+opsRisk*.12,12,25)
      ],
      confidence:evidenceStrength>=70?"high":evidenceStrength>=45?"medium":"low",
      learningGoal:"Test whether the strongest current evidence survives a larger but still controlled allocation.",
      rules:["Evidence changes the next test size, not an automatic budget.","Every strong channel/ICP keeps a holdout against alternatives.","Operational risk can override growth allocation."]
    }
  ];

  function suggestedFor(id:AllocationScenarioId){
    const list=decisions.directives;
    const preferred=id==="protect_pipeline"
      ? list.filter(item=>item.scope==="account"||item.scope==="operations"||item.scope==="quality")
      : id==="evidence_weighted"
        ? list.filter(item=>item.kind==="scale_test"||item.scope==="segment"||item.scope==="offer"||item.scope==="account")
        : list.filter(item=>item.scope!=="quality"||item.kind==="fix");
    return [...preferred,...list.filter(item=>!preferred.some(candidate=>candidate.id===item.id))]
      .slice(0,3)
      .map(item=>({id:item.id,title:item.title,scope:item.scope,kind:item.kind,priority:item.priority}));
  }

  const scenarios=scenarioDefs.map(def=>{
    const normalized=roundToTotal(def.weights,units);
    const buckets:Record<AllocationBucket,number>={
      pipeline:normalized[0],research:normalized[1],channel_experiments:normalized[2],offer_icp_tests:normalized[3],quality_ops:normalized[4]
    };
    return{
      id:def.id,name:def.name,thesis:def.thesis,recommended:def.id===recommendedScenarioId,confidence:def.confidence,totalUnits:units,buckets,
      channelMix:buildMix(channelEntries,buckets.channel_experiments,true),
      segmentMix:buildMix(segmentEntries,Math.max(0,Math.round(buckets.research*.65)),true),
      offerMix:buildMix(offerEntries,buckets.offer_icp_tests,true),
      suggestedDirectives:suggestedFor(def.id),
      operatingRules:def.rules,
      learningGoal:def.learningGoal
    };
  });

  return{
    generatedAt:new Date().toISOString(),missionId,totalUnits:units,recommendedScenarioId,scenarios,
    constraints:[
      "Units are relative attention/capacity units, not dollars and not a revenue forecast.",
      "No scenario can spend money, send messages, publish content, place calls or book meetings.",
      "A scenario changes only the recommended shape of the next controlled experiment.",
      "Existing approval, opt-out, quality, dependency and daily-limit gates remain authoritative.",
      "Attribution is observational; allocations are designed to improve learning, not claim causality."
    ],
    evidenceSummary:{
      events:events.length,openAccounts:open.length,warmAccounts:warm.length,overdueAccounts:overdue.length,
      approvalBacklog:approvals.length,executionExceptions:exceptions.length,rankedChannels:rankedChannels.length,controlledExperiments:controlledExperiments.length,directionalExperiments:directionalExperiments.length
    },
    disclaimer:"Resource allocation is non-monetary decision support. Percentages describe relative attention for the next experiment cycle and must not be interpreted as guaranteed outcomes."
  };
}
