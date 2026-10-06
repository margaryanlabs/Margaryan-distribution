import type {DashboardSnapshot,Lead,Channel,PerformanceMetrics} from "@/lib/types";

export type GrowthMemoryLevel="segment"|"segment_offer"|"segment_offer_channel"|"full_motion";
export type GrowthMemoryPosture="promote"|"explore"|"deprioritize";

export interface GrowthMemoryPattern{
  key:string;
  level:GrowthMemoryLevel;
  segment:string;
  trigger?:string;
  offer?:string;
  channel?:Channel;
  messageProfile?:string;
  accounts:number;
  exposures:number;
  replies:number;
  positiveReplies:number;
  meetings:number;
  wins:number;
  revenueUsd:number;
  replyRate:number;
  meetingRate:number;
  winRate:number;
  score:number;
  confidence:"low"|"medium"|"high";
  posture:GrowthMemoryPosture;
  evidence:string[];
  lastObservedAt?:string;
}

export interface GrowthMemoryReport{
  missionId:string;
  generatedAt:string;
  patterns:GrowthMemoryPattern[];
  promoted:GrowthMemoryPattern[];
  deprioritized:GrowthMemoryPattern[];
  exploration:GrowthMemoryPattern[];
  researchGuidance:string[];
  outreachGuidance:string[];
  evidenceSummary:{
    leads:number;
    touchedAccounts:number;
    succeededTouches:number;
    positiveReplies:number;
    meetings:number;
    wins:number;
    attributedRevenueUsd:number;
  };
  disclaimer:string;
}

type MutablePattern={
  key:string;level:GrowthMemoryLevel;segment:string;trigger?:string;offer?:string;channel?:Channel;messageProfile?:string;
  leadIds:Set<string>;exposures:number;replies:number;positiveReplies:number;meetings:number;wins:number;revenueUsd:number;lastObservedAt?:string;
};

function pct(num:number,den:number){return den?Math.round(num/den*1000)/10:0;}
function clean(value?:string){return value?.trim()||undefined;}
function experimentProfile(state:DashboardSnapshot,experimentId?:string,variantId?:string){
  if(!experimentId||!variantId)return undefined;
  const experiment=state.experiments.find(item=>item.id===experimentId);
  const variant=experiment?.variants.find(item=>item.id===variantId);
  return variant?.label||variant?.target;
}
function leadOutcome(state:DashboardSnapshot,lead:Lead){
  const replyItems=state.replies.filter(item=>item.leadId===lead.id);
  const meetingItems=state.meetings.filter(item=>item.leadId===lead.id&&["booked","approved","availability_checked"].includes(item.status));
  const replied=replyItems.length>0||["replied","qualified","meeting","won"].includes(lead.stage);
  const positive=replyItems.some(item=>["positive","question"].includes(item.decision.intent))||["qualified","meeting","won"].includes(lead.stage);
  const meeting=meetingItems.length>0||["meeting","won"].includes(lead.stage);
  const win=lead.stage==="won";
  return{replied,positive,meeting,win};
}
function mergeTime(current:string|undefined,next:string|undefined){
  if(!next)return current;if(!current)return next;return next>current?next:current;
}
function addMetrics(target:{revenueUsd:number},metrics:PerformanceMetrics){target.revenueUsd+=Number(metrics.revenueUsd||0);}
function keyParts(level:GrowthMemoryLevel,segment:string,offer?:string,channel?:Channel,trigger?:string,messageProfile?:string){
  if(level==="segment")return[segment];
  if(level==="segment_offer")return[segment,offer||"no-offer"];
  if(level==="segment_offer_channel")return[segment,offer||"no-offer",channel||"unknown"];
  return[segment,offer||"no-offer",channel||"unknown",trigger||"no-trigger",messageProfile||"standard"];
}
function ensure(map:Map<string,MutablePattern>,level:GrowthMemoryLevel,segment:string,offer?:string,channel?:Channel,trigger?:string,messageProfile?:string){
  const key=level+":"+keyParts(level,segment,offer,channel,trigger,messageProfile).join("::");
  let item=map.get(key);
  if(!item){item={key,level,segment,offer,channel,trigger,messageProfile,leadIds:new Set(),exposures:0,replies:0,positiveReplies:0,meetings:0,wins:0,revenueUsd:0};map.set(key,item);}
  return item;
}
function scorePattern(item:MutablePattern){
  const accounts=item.leadIds.size,exposures=item.exposures;
  const replyRate=pct(item.positiveReplies,Math.max(1,exposures));
  const meetingRate=pct(item.meetings,Math.max(1,exposures));
  const winRate=pct(item.wins,Math.max(1,exposures));
  const outcomePoints=item.positiveReplies*7+item.meetings*16+item.wins*32+Math.min(30,item.revenueUsd/250);
  const ratePoints=Math.min(18,replyRate*.22)+Math.min(24,meetingRate*.55)+Math.min(28,winRate*.8);
  const samplePoints=Math.min(16,accounts*2)+Math.min(12,exposures);
  const noSignalPenalty=exposures>=5&&item.positiveReplies===0&&item.meetings===0?Math.min(28,exposures*3):0;
  const score=Math.round((outcomePoints+ratePoints+samplePoints-noSignalPenalty)*10)/10;
  const confidence=exposures>=12&&(item.meetings>=2||item.wins>=1)?"high":exposures>=5||item.positiveReplies>=2||item.meetings>=1?"medium":"low";
  const posture:GrowthMemoryPosture =
    (item.wins>0||item.meetings>=2||item.positiveReplies>=3)&&score>=35?"promote":
    exposures>=6&&item.positiveReplies===0&&item.meetings===0?"deprioritize":"explore";
  return{accounts,replyRate,meetingRate,winRate,score,confidence,posture};
}

export function buildGrowthMemory(state:DashboardSnapshot,missionId:string):GrowthMemoryReport{
  const leads=state.leads.filter(item=>item.missionId===missionId);
  const leadById=new Map(leads.map(item=>[item.id,item]));
  const actions=state.actions.filter(item=>item.missionId===missionId&&typeof item.payload.leadId==="string"&&["send_email","reply","call"].includes(item.kind));
  const actionById=new Map(actions.map(item=>[item.recordId,item]));
  const map=new Map<string,MutablePattern>();

  for(const lead of leads){
    const segment=clean(lead.segment)||"unsegmented";
    const offer=clean(lead.recommendedOfferCode)||clean(lead.recommendedOffer);
    const trigger=clean(lead.buyingSignals?.[0]);
    const outcome=leadOutcome(state,lead);
    const leadActions=actions.filter(action=>action.payload.leadId===lead.id);
    const allSucceeded=leadActions.filter(action=>action.status==="succeeded");
    for(const level of ["segment","segment_offer"] as GrowthMemoryLevel[]){
      const pattern=ensure(map,level,segment,offer);
      pattern.leadIds.add(lead.id);
      pattern.exposures+=allSucceeded.length;
      pattern.replies+=outcome.replied?1:0;
      pattern.positiveReplies+=outcome.positive?1:0;
      pattern.meetings+=outcome.meeting?1:0;
      pattern.wins+=outcome.win?1:0;
      for(const action of leadActions)pattern.lastObservedAt=mergeTime(pattern.lastObservedAt,action.executedAt||action.updatedAt||action.createdAt);
    }

    const channels=Array.from(new Set(leadActions.map(action=>action.channel)));
    for(const channel of channels){
      const relevant=leadActions.filter(action=>action.channel===channel);
      const succeeded=relevant.filter(action=>action.status==="succeeded");
      const profile=relevant.map(action=>experimentProfile(state,typeof action.payload.experimentId==="string"?action.payload.experimentId:undefined,typeof action.payload.variantId==="string"?action.payload.variantId:undefined)).find(Boolean);
      for(const level of ["segment_offer_channel","full_motion"] as GrowthMemoryLevel[]){
        const pattern=ensure(map,level,segment,offer,channel,trigger,profile);
        pattern.leadIds.add(lead.id);
        pattern.exposures+=succeeded.length;
        pattern.replies+=outcome.replied?1:0;
        pattern.positiveReplies+=outcome.positive?1:0;
        pattern.meetings+=outcome.meeting?1:0;
        pattern.wins+=outcome.win?1:0;
        for(const action of relevant)pattern.lastObservedAt=mergeTime(pattern.lastObservedAt,action.executedAt||action.updatedAt||action.createdAt);
      }
    }
  }

  for(const event of state.performance.filter(item=>item.missionId===missionId)){
    const action=event.actionId?actionById.get(event.actionId):undefined;
    const leadId=action&&typeof action.payload.leadId==="string"?action.payload.leadId:undefined;
    const lead=leadId?leadById.get(leadId):undefined;
    if(!lead||!action)continue;
    const segment=clean(lead.segment)||"unsegmented";
    const offer=clean(lead.recommendedOfferCode)||clean(lead.recommendedOffer);
    const trigger=clean(lead.buyingSignals?.[0]);
    const actionExperimentId=typeof action.payload.experimentId==="string"?String(action.payload.experimentId):undefined;
    const actionVariantId=typeof action.payload.variantId==="string"?String(action.payload.variantId):undefined;
    const profile=experimentProfile(state,event.experimentId||actionExperimentId,event.variantId||actionVariantId);
    for(const level of ["segment","segment_offer"] as GrowthMemoryLevel[]){
      const pattern=ensure(map,level,segment,offer);
      addMetrics(pattern,event.metrics);
      pattern.lastObservedAt=mergeTime(pattern.lastObservedAt,event.occurredAt);
    }
    for(const level of ["segment_offer_channel","full_motion"] as GrowthMemoryLevel[]){
      const pattern=ensure(map,level,segment,offer,action.channel,trigger,profile);
      addMetrics(pattern,event.metrics);
      pattern.lastObservedAt=mergeTime(pattern.lastObservedAt,event.occurredAt);
    }
  }

  const patterns=[...map.values()].map(item=>{
    const ranked=scorePattern(item);
    const evidence=[
      item.exposures+" succeeded touch(es)",
      item.positiveReplies+" positive reply/account(s)",
      item.meetings+" meeting/account(s)",
      item.wins+" win(s)",
      item.revenueUsd?"$"+Math.round(item.revenueUsd).toLocaleString("en-US")+" attributed revenue":""
    ].filter(Boolean);
    return{
      key:item.key,level:item.level,segment:item.segment,trigger:item.trigger,offer:item.offer,channel:item.channel,messageProfile:item.messageProfile,
      accounts:ranked.accounts,exposures:item.exposures,replies:item.replies,positiveReplies:item.positiveReplies,meetings:item.meetings,wins:item.wins,
      revenueUsd:Math.round(item.revenueUsd*100)/100,replyRate:ranked.replyRate,meetingRate:ranked.meetingRate,winRate:ranked.winRate,
      score:ranked.score,confidence:ranked.confidence,posture:ranked.posture,evidence,lastObservedAt:item.lastObservedAt
    } satisfies GrowthMemoryPattern;
  }).sort((a,b)=>b.score-a.score||b.meetings-a.meetings||b.positiveReplies-a.positiveReplies);

  const promoted=patterns.filter(item=>item.posture==="promote").slice(0,8);
  const deprioritized=patterns.filter(item=>item.posture==="deprioritize").sort((a,b)=>b.exposures-a.exposures).slice(0,6);
  const exploration=patterns.filter(item=>item.posture==="explore").slice(0,8);
  const researchGuidance=[
    ...promoted.filter(item=>item.level==="segment_offer").slice(0,3).map(item=>"Prioritize discovery around "+item.segment+(item.offer?" with next-step offer "+item.offer:"")+"; evidence: "+item.evidence.join(", ")+"."),
    ...deprioritized.filter(item=>item.level==="segment").slice(0,2).map(item=>"Reduce net-new volume for "+item.segment+" until a new trigger or message hypothesis is tested; evidence: "+item.evidence.join(", ")+".")
  ].slice(0,5);
  const outreachGuidance=promoted.filter(item=>item.level==="full_motion").slice(0,4).map(item=>"For "+item.segment+(item.trigger?' with trigger "'+item.trigger+'"':"")+", favor "+(item.offer||"the current offer")+" via "+(item.channel||"the tested channel")+(item.messageProfile?' using "'+item.messageProfile+'" framing':"")+"; evidence: "+item.evidence.join(", ")+".");
  const attributedRevenueUsd=state.performance.filter(item=>item.missionId===missionId).reduce((sum,item)=>sum+Number(item.metrics.revenueUsd||0),0);
  const touchedAccounts=new Set(actions.map(action=>String(action.payload.leadId))).size;
  const succeededTouches=actions.filter(action=>action.status==="succeeded").length;
  const positiveReplies=leads.filter(lead=>leadOutcome(state,lead).positive).length;
  const meetings=leads.filter(lead=>leadOutcome(state,lead).meeting).length;
  const wins=leads.filter(lead=>lead.stage==="won").length;

  return{
    missionId,generatedAt:new Date().toISOString(),patterns,promoted,deprioritized,exploration,researchGuidance,outreachGuidance,
    evidenceSummary:{leads:leads.length,touchedAccounts,succeededTouches,positiveReplies,meetings,wins,attributedRevenueUsd:Math.round(attributedRevenueUsd*100)/100},
    disclaimer:"Growth Memory is derived from durable CRM and factual outcomes. It ranks recurring go-to-market patterns; it does not prove causality unless the underlying evidence came from an eligible controlled experiment."
  };
}

export function growthMemoryPrompt(report:GrowthMemoryReport){
  return{
    promoted:report.promoted.filter(item=>["segment_offer","full_motion"].includes(item.level)).slice(0,5).map(item=>({
      segment:item.segment,trigger:item.trigger,offer:item.offer,channel:item.channel,messageProfile:item.messageProfile,confidence:item.confidence,evidence:item.evidence
    })),
    deprioritized:report.deprioritized.filter(item=>["segment","segment_offer"].includes(item.level)).slice(0,4).map(item=>({
      segment:item.segment,offer:item.offer,evidence:item.evidence
    })),
    researchGuidance:report.researchGuidance,
    outreachGuidance:report.outreachGuidance
  };
}
