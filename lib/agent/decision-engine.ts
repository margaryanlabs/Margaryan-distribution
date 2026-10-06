import type {DashboardSnapshot,Lead,LearningRanking} from "@/lib/types";
import {buildGrowthMemory} from "@/lib/agent/growth-memory";

export type DecisionKind="focus"|"scale_test"|"hold"|"fix"|"review";
export type DecisionScope="account"|"channel"|"segment"|"offer"|"motion"|"quality"|"operations";
export type DecisionConfidence="low"|"medium"|"high";

export interface DecisionDirective{
  id:string;
  kind:DecisionKind;
  scope:DecisionScope;
  target:string;
  title:string;
  recommendation:string;
  reason:string;
  evidence:string[];
  confidence:DecisionConfidence;
  priority:number;
}

export interface PriorityAccount{
  leadId:string;
  company:string;
  stage:Lead["stage"];
  priority:Lead["priority"];
  score:number;
  decisionScore:number;
  estimatedValueUsd:number;
  reasons:string[];
  nextAction?:string;
  nextActionAt?:string;
}

export interface ChannelGuidance{
  channel:string;
  posture:"increase_test"|"keep_testing"|"rework"|"insufficient_evidence";
  score:number;
  evidence:string;
}

export interface DecisionEngineReport{
  generatedAt:string;
  missionId:string;
  headline:string;
  directives:DecisionDirective[];
  priorityAccounts:PriorityAccount[];
  channelGuidance:ChannelGuidance[];
  evidenceEventCount:number;
  disclaimer:string;
}

const STAGE_WEIGHT:Record<Lead["stage"],number>={
  new:0,researched:5,contacted:10,replied:28,qualified:24,meeting:38,won:0,lost:-40,do_not_contact:-100
};
const PRIORITY_WEIGHT={P0:40,P1:30,P2:18,P3:8} as const;

function metricEvidence(item:LearningRanking){
  return [
    item.impressions?item.impressions+" impressions":"",
    item.clicks?item.clicks+" clicks":"",
    item.replies?item.replies+" replies":"",
    item.positiveReplies?item.positiveReplies+" positive replies":"",
    item.meetings?item.meetings+" meetings":"",
    item.revenueUsd?"$"+Math.round(item.revenueUsd).toLocaleString("en-US")+" verified revenue":""
  ].filter(Boolean).join(" · ")||"no downstream metrics yet";
}

function accountScore(lead:Lead){
  let score=STAGE_WEIGHT[lead.stage]+PRIORITY_WEIGHT[lead.priority||"P3"]+Math.min(30,Math.max(0,lead.score||0)*0.3);
  const reasons:string[]=[];
  if(lead.priority==="P0"){score+=8;reasons.push("P0 priority");}
  if((lead.buyingSignals||[]).length){score+=Math.min(16,(lead.buyingSignals||[]).length*4);reasons.push((lead.buyingSignals||[]).length+" buying signal(s)");}
  if(lead.stage==="meeting"){reasons.push("meeting-stage account");}
  else if(lead.stage==="replied"){reasons.push("active reply");}
  else if(lead.stage==="qualified"){reasons.push("qualified opportunity");}
  const value=Number(lead.estimatedValueUsd||0);
  if(value>=7500){score+=15;reasons.push("$7.5k+ potential");}
  else if(value>=3500){score+=12;reasons.push("$3.5k+ potential");}
  else if(value>=1500){score+=9;reasons.push("$1.5k+ potential");}
  else if(value>=349){score+=5;reasons.push("paid offer potential");}
  if(lead.nextActionAt){
    const due=Date.parse(lead.nextActionAt);
    if(Number.isFinite(due)){
      const hours=(due-Date.now())/3600000;
      if(hours<0){score+=16;reasons.push("next action overdue");}
      else if(hours<=48){score+=8;reasons.push("next action due within 48h");}
    }
  }
  if(lead.email||lead.phone||lead.linkedinUrl||lead.instagramUrl){score+=4;reasons.push("reachable");}
  return{score:Math.round(score),reasons};
}

function segmentDirectives(leads:Lead[]):DecisionDirective[]{
  const groups=new Map<string,Lead[]>();
  for(const lead of leads){
    const key=lead.segment?.trim();
    if(!key)continue;
    groups.set(key,[...(groups.get(key)||[]),lead]);
  }
  const out:DecisionDirective[]=[];
  for(const[segment,items]of groups){
    if(items.length<3)continue;
    const touched=items.filter(item=>["contacted","replied","qualified","meeting","won","lost"].includes(item.stage)).length;
    const warm=items.filter(item=>["replied","qualified","meeting","won"].includes(item.stage)).length;
    const meetings=items.filter(item=>["meeting","won"].includes(item.stage)).length;
    const avg=Math.round(items.reduce((sum,item)=>sum+Number(item.score||0),0)/items.length);
    if(meetings>0){
      out.push({
        id:"segment-focus-"+segment,kind:"focus",scope:"segment",target:segment,
        title:"Keep "+segment+" near the front of research",
        recommendation:"Allocate the next research batch toward this segment while preserving a holdout against other ICPs.",
        reason:"This segment has produced meeting-stage evidence inside the current CRM.",
        evidence:[items.length+" accounts",warm+" warm",meetings+" meeting/won",avg+" average fit score"],
        confidence:meetings>=2?"high":"medium",priority:72+Math.min(12,meetings*4)
      });
    }else if(touched>=3&&warm===0){
      out.push({
        id:"segment-hold-"+segment,kind:"hold",scope:"segment",target:segment,
        title:"Pause expansion of "+segment,
        recommendation:"Do not add more volume until ICP assumptions or the opening message are retested.",
        reason:"Several accounts were already touched without a recorded warm-stage outcome.",
        evidence:[items.length+" accounts",touched+" touched","0 warm outcomes",avg+" average fit score"],
        confidence:touched>=6?"high":"medium",priority:64+Math.min(12,touched)
      });
    }
  }
  return out;
}

function offerDirectives(leads:Lead[]):DecisionDirective[]{
  const groups=new Map<string,Lead[]>();
  for(const lead of leads){
    const key=(lead.recommendedOffer||lead.recommendedOfferCode||"").trim();
    if(!key)continue;
    groups.set(key,[...(groups.get(key)||[]),lead]);
  }
  const out:DecisionDirective[]=[];
  for(const[offer,items]of groups){
    if(items.length<2)continue;
    const meetings=items.filter(item=>["meeting","won"].includes(item.stage)).length;
    const warm=items.filter(item=>["replied","qualified","meeting","won"].includes(item.stage)).length;
    if(meetings>0){
      out.push({
        id:"offer-focus-"+offer,kind:"focus",scope:"offer",target:offer,
        title:"Preserve "+offer+" as a proven next-step candidate",
        recommendation:"Use this offer as the default next commitment for similar qualified accounts, but continue measuring against alternatives.",
        reason:"The offer is attached to accounts that reached meeting or won stages.",
        evidence:[items.length+" recommended accounts",warm+" warm",meetings+" meeting/won"],
        confidence:meetings>=2?"high":"medium",priority:70+Math.min(10,meetings*4)
      });
    }
  }
  return out;
}

export function buildDecisionEngineReport(state:DashboardSnapshot,missionId:string):DecisionEngineReport{
  const leads=state.leads.filter(item=>item.missionId===missionId);
  const events=state.performance.filter(item=>item.missionId===missionId);
  const learning=[...state.learnings].filter(item=>item.missionId===missionId).sort((a,b)=>b.generatedAt.localeCompare(a.generatedAt))[0];
  const actions=state.actions.filter(item=>item.missionId===missionId);
  const content=state.content.filter(item=>item.missionId===missionId);
  const directives:DecisionDirective[]=[];
  const growthMemory=buildGrowthMemory(state,missionId);

  const priorityAccounts=leads
    .filter(item=>!["won","lost","do_not_contact"].includes(item.stage))
    .map(lead=>{const ranked=accountScore(lead);return{
      leadId:lead.id,company:lead.company,stage:lead.stage,priority:lead.priority,score:Number(lead.score||0),
      decisionScore:ranked.score,estimatedValueUsd:Number(lead.estimatedValueUsd||0),reasons:ranked.reasons.slice(0,4),
      nextAction:lead.nextAction,nextActionAt:lead.nextActionAt
    };})
    .sort((a,b)=>b.decisionScore-a.decisionScore)
    .slice(0,5);

  const overdue=leads.filter(lead=>lead.nextActionAt&&Date.parse(lead.nextActionAt)<Date.now()&&!["won","lost","do_not_contact"].includes(lead.stage));
  if(overdue.length){
    directives.push({
      id:"overdue-accounts",kind:"focus",scope:"account",target:"next-action queue",
      title:"Clear overdue account actions first",
      recommendation:"Work the overdue warm-account queue before adding more cold volume.",
      reason:"Existing opportunities already have next actions past due.",
      evidence:[overdue.length+" overdue account(s)",overdue.slice(0,3).map(item=>item.company).join(", ")],
      confidence:"high",priority:96
    });
  }

  const approvals=actions.filter(item=>item.mode==="APPROVE"&&item.status==="queued");
  if(approvals.length>=5){
    directives.push({
      id:"approval-bottleneck",kind:"review",scope:"operations",target:"approval queue",
      title:"Operator approvals are becoming the bottleneck",
      recommendation:"Review warm replies and meeting actions before creating additional first-touch volume.",
      reason:"The governed action queue is accumulating faster than it is being reviewed.",
      evidence:[approvals.length+" approvals waiting",approvals.filter(item=>item.kind==="reply").length+" reply actions",approvals.filter(item=>item.kind==="book_meeting").length+" meeting actions"],
      confidence:"high",priority:92
    });
  }

  const blocked=actions.filter(item=>["blocked","failed","dead_letter"].includes(item.status));
  if(blocked.length){
    directives.push({
      id:"runtime-exceptions",kind:"fix",scope:"operations",target:"execution path",
      title:"Fix execution exceptions before scaling volume",
      recommendation:"Resolve blocked, failed and dead-letter actions before increasing autonomous throughput.",
      reason:"Scaling an unhealthy execution path would amplify operational errors.",
      evidence:[
        actions.filter(item=>item.status==="blocked").length+" blocked",
        actions.filter(item=>item.status==="failed").length+" failed",
        actions.filter(item=>item.status==="dead_letter").length+" dead-letter"
      ],
      confidence:"high",priority:94
    });
  }

  const qualityItems=[
    ...content.filter(item=>typeof item.qualityScore==="number").map(item=>Number(item.qualityScore)),
    ...actions.filter(item=>typeof item.payload.qualityScore==="number").map(item=>Number(item.payload.qualityScore))
  ];
  const avgQuality=qualityItems.length?Math.round(qualityItems.reduce((a,b)=>a+b,0)/qualityItems.length):0;
  if(qualityItems.length>=3&&avgQuality<70){
    directives.push({
      id:"quality-fix",kind:"fix",scope:"quality",target:"outbound copy",
      title:"Raise copy quality before adding volume",
      recommendation:"Fix low-scoring messages and content before increasing sends or publishing cadence.",
      reason:"Average assessed quality is below the current shipping threshold.",
      evidence:[avgQuality+" average quality score",qualityItems.length+" assessed items"],
      confidence:"high",priority:90
    });
  }

  const channelGuidance:ChannelGuidance[]=[];
  for(const item of learning?.channelRankings||[]){
    let posture:ChannelGuidance["posture"]="insufficient_evidence";
    if(item.meetings>0||item.revenueUsd>0||item.positiveReplies>=2)posture="increase_test";
    else if(item.impressions>=200&&item.clicks===0&&item.replies===0)posture="rework";
    else if(item.clicks>=10&&item.replies===0)posture="rework";
    else if(item.impressions>=100||item.clicks>=5||item.replies>0)posture="keep_testing";
    channelGuidance.push({channel:item.key,posture,score:item.score,evidence:metricEvidence(item)});

    if(posture==="increase_test"){
      directives.push({
        id:"channel-scale-"+item.key,kind:"scale_test",scope:"channel",target:item.key,
        title:"Increase the next test on "+item.key.toUpperCase(),
        recommendation:"Give this channel a larger share of the next controlled experiment, not an unlimited budget increase.",
        reason:"It has the strongest recorded downstream evidence among current channel observations.",
        evidence:[metricEvidence(item),"learning score "+item.score],
        confidence:item.meetings>0||item.revenueUsd>0?"high":"medium",priority:78+Math.min(12,item.meetings*4)
      });
    }else if(posture==="rework"){
      directives.push({
        id:"channel-rework-"+item.key,kind:"hold",scope:"channel",target:item.key,
        title:"Do not scale "+item.key.toUpperCase()+" yet",
        recommendation:"Rework targeting, creative or the click-to-reply bridge before adding more volume.",
        reason:"The channel has activity but insufficient recorded downstream signal.",
        evidence:[metricEvidence(item),"learning score "+item.score],
        confidence:item.impressions>=500||item.clicks>=20?"high":"medium",priority:68
      });
    }
  }

  directives.push(...segmentDirectives(leads),...offerDirectives(leads));

  const winningMotion=growthMemory.promoted.find(item=>item.level==="full_motion")||growthMemory.promoted.find(item=>item.level==="segment_offer");
  if(winningMotion&&winningMotion.confidence!=="low"){
    directives.push({
      id:"memory-focus-"+winningMotion.key,kind:"focus",scope:"motion",target:winningMotion.key,
      title:"Reuse the strongest remembered GTM motion",
      recommendation:"Bias the next small research/outreach batch toward this motion while preserving exploration against alternatives.",
      reason:"Growth Memory has repeated downstream evidence for this combination across durable CRM outcomes.",
      evidence:[
        winningMotion.segment+(winningMotion.offer?" · "+winningMotion.offer:"")+(winningMotion.channel?" · "+winningMotion.channel:""),
        ...winningMotion.evidence.slice(0,3)
      ],
      confidence:winningMotion.confidence,priority:82+Math.min(10,winningMotion.meetings*2+winningMotion.wins*4)
    });
  }

  const losingMotion=growthMemory.deprioritized.find(item=>item.level==="full_motion")||growthMemory.deprioritized.find(item=>item.level==="segment_offer");
  if(losingMotion){
    directives.push({
      id:"memory-hold-"+losingMotion.key,kind:"hold",scope:"motion",target:losingMotion.key,
      title:"Stop repeating a low-signal motion",
      recommendation:"Reduce net-new volume for this exact motion until a new trigger, message or offer hypothesis is tested.",
      reason:"Durable Growth Memory shows repeated exposure without recorded warm downstream outcomes.",
      evidence:[
        losingMotion.segment+(losingMotion.offer?" · "+losingMotion.offer:"")+(losingMotion.channel?" · "+losingMotion.channel:""),
        ...losingMotion.evidence.slice(0,3)
      ],
      confidence:losingMotion.confidence,priority:73+Math.min(8,losingMotion.exposures)
    });
  }

  directives.sort((a,b)=>b.priority-a.priority);

  const headline=directives.length
    ? directives[0].title+". "+(priorityAccounts[0]?"Top account: "+priorityAccounts[0].company+".":"")
    : "No strong intervention is justified yet. Keep collecting factual evidence before reallocating effort.";

  return{
    generatedAt:new Date().toISOString(),missionId,headline,
    directives:directives.slice(0,12),priorityAccounts,channelGuidance:channelGuidance.slice(0,8),
    evidenceEventCount:events.length,
    disclaimer:"Decision guidance is evidence-ranked operational advice, not proof of causal attribution. Scale recommendations mean controlled tests, not automatic spend increases."
  };
}
