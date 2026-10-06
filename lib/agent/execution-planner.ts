import {buildDecisionEngineReport} from "@/lib/agent/decision-engine";
import {prepareLeadOutreach} from "@/lib/agent/outreach-queue";
import {prepareSmmCampaign} from "@/lib/agent/smm-queue";
import {distributionStore} from "@/lib/store";
import type {DashboardSnapshot,PlannedAction} from "@/lib/types";

export type ExecutionPlanStepKind="prepare_outreach"|"prepare_campaign"|"queue_research"|"queue_measurement"|"operator_review";
export interface ExecutionPlanStep{
  id:string;
  kind:ExecutionPlanStepKind;
  title:string;
  detail:string;
  approvalRequired:boolean;
  externalExecution:boolean;
  targetLeadIds?:string[];
  limit?:number;
  days?:number;
  scheduledOffsetHours?:number;
}
export interface ExecutionPlan{
  id:string;
  missionId:string;
  directiveId:string;
  title:string;
  rationale:string;
  steps:ExecutionPlanStep[];
  guardrails:string[];
  generatedAt:string;
}
export interface StagedExecutionPlan{
  plan:ExecutionPlan;
  alreadyStaged:boolean;
  preparedOutreach:number;
  preparedCampaignAssets:number;
  queuedInternalActions:number;
  notes:string[];
}

function idFor(missionId:string,directiveId:string){return "plan-"+missionId+"-"+directiveId;}
function targetAccounts(state:DashboardSnapshot,missionId:string,count=3){
  const report=buildDecisionEngineReport(state,missionId);
  return report.priorityAccounts.slice(0,count).map(item=>item.leadId);
}

export function buildExecutionPlan(state:DashboardSnapshot,missionId:string,directiveId:string):ExecutionPlan{
  const report=buildDecisionEngineReport(state,missionId);
  const directive=report.directives.find(item=>item.id===directiveId);
  if(!directive)throw new Error("Decision directive not found");

  const steps:ExecutionPlanStep[]=[];
  const topLeadIds=targetAccounts(state,missionId,3);

  if(directive.scope==="account"||directive.kind==="focus"){
    if(topLeadIds.length){
      steps.push({
        id:"prepare-outreach",kind:"prepare_outreach",
        title:"Prepare governed outreach for the highest-priority accounts",
        detail:"Generate or reuse personalized sequences for up to three priority accounts. All external messages are forced into approval mode.",
        approvalRequired:false,externalExecution:false,targetLeadIds:topLeadIds
      });
    }
    steps.push({
      id:"review-revenue-queue",kind:"operator_review",
      title:"Review the warm revenue queue before adding cold volume",
      detail:"Operator reviews replies, meeting actions and newly prepared first-touch copy in Revenue Command.",
      approvalRequired:true,externalExecution:false
    });
    steps.push({
      id:"measure-72h",kind:"queue_measurement",
      title:"Schedule a fresh learning pass",
      detail:"Queue an internal evidence analysis after the experiment window so the next decision uses recorded outcomes.",
      approvalRequired:true,externalExecution:false,scheduledOffsetHours:72
    });
  }

  if(directive.scope==="channel"&&directive.kind==="scale_test"){
    steps.push({
      id:"prepare-campaign",kind:"prepare_campaign",
      title:"Prepare a controlled three-day content experiment",
      detail:"Create a short campaign using the active Product Brain. Publishing remains behind approval and quality gates.",
      approvalRequired:false,externalExecution:false,days:3
    });
    steps.push({
      id:"review-campaign",kind:"operator_review",
      title:"Approve only the strongest channel-native assets",
      detail:"Operator reviews quality, media requirements and channel fit before anything can publish.",
      approvalRequired:true,externalExecution:false
    });
    steps.push({
      id:"measure-72h",kind:"queue_measurement",
      title:"Measure downstream signal after the test",
      detail:"Queue an internal learning pass after 72 hours; do not infer causality from impressions alone.",
      approvalRequired:true,externalExecution:false,scheduledOffsetHours:72
    });
  }

  if(directive.scope==="channel"&&directive.kind==="hold"){
    steps.push({
      id:"prepare-campaign",kind:"prepare_campaign",
      title:"Prepare replacement creative without scaling volume",
      detail:"Generate a short three-day campaign as a rework candidate. Nothing publishes automatically.",
      approvalRequired:false,externalExecution:false,days:3
    });
    steps.push({
      id:"review-rework",kind:"operator_review",
      title:"Compare message and CTA before resuming the channel",
      detail:"Keep the channel at current or lower volume until the operator sees stronger copy and a clearer click-to-reply bridge.",
      approvalRequired:true,externalExecution:false
    });
  }

  if(directive.scope==="segment"&&directive.kind==="focus"){
    steps.push({
      id:"queue-research",kind:"queue_research",
      title:"Queue one incremental research batch",
      detail:"Add one governed internal research action to look for another account under the current mission assumptions.",
      approvalRequired:true,externalExecution:false,limit:1
    });
    if(topLeadIds.length)steps.push({
      id:"prepare-outreach",kind:"prepare_outreach",
      title:"Prepare outreach for current priority accounts",
      detail:"Materialize personalized drafts for up to three existing high-priority accounts before expanding volume.",
      approvalRequired:false,externalExecution:false,targetLeadIds:topLeadIds
    });
    steps.push({
      id:"measure-96h",kind:"queue_measurement",
      title:"Re-measure the segment after the next small batch",
      detail:"Queue an internal learning pass after 96 hours.",
      approvalRequired:true,externalExecution:false,scheduledOffsetHours:96
    });
  }

  if(directive.scope==="segment"&&directive.kind==="hold"){
    steps.push({
      id:"review-segment",kind:"operator_review",
      title:"Freeze net-new volume for this segment",
      detail:"Do not queue more research for the segment until the operator revises ICP assumptions or opening copy.",
      approvalRequired:true,externalExecution:false
    });
    if(topLeadIds.length)steps.push({
      id:"prepare-outreach",kind:"prepare_outreach",
      title:"Work existing warm accounts instead of adding volume",
      detail:"Prepare governed follow-up/outreach for existing priority accounts only.",
      approvalRequired:false,externalExecution:false,targetLeadIds:topLeadIds
    });
  }

  if(directive.scope==="offer"){
    if(topLeadIds.length)steps.push({
      id:"prepare-outreach",kind:"prepare_outreach",
      title:"Prepare offer-aligned outreach for priority accounts",
      detail:"Generate personalized drafts using each lead's recommended offer while preserving human approval.",
      approvalRequired:false,externalExecution:false,targetLeadIds:topLeadIds
    });
    steps.push({
      id:"measure-72h",kind:"queue_measurement",
      title:"Measure replies and meetings before widening the offer",
      detail:"Queue a learning pass after 72 hours.",
      approvalRequired:true,externalExecution:false,scheduledOffsetHours:72
    });
  }

  if(directive.scope==="quality"||directive.scope==="operations"){
    steps.push({
      id:"operator-review",kind:"operator_review",
      title:directive.scope==="quality"?"Fix blocked or low-quality copy first":"Resolve execution exceptions first",
      detail:directive.recommendation,
      approvalRequired:true,externalExecution:false
    });
    steps.push({
      id:"measure-24h",kind:"queue_measurement",
      title:"Re-check system evidence after the fix",
      detail:"Queue an internal learning pass 24 hours later.",
      approvalRequired:true,externalExecution:false,scheduledOffsetHours:24
    });
  }

  if(!steps.length){
    steps.push({
      id:"operator-review",kind:"operator_review",
      title:"Review the recommendation manually",
      detail:directive.recommendation,
      approvalRequired:true,externalExecution:false
    });
  }

  return{
    id:idFor(missionId,directiveId),
    missionId,directiveId,
    title:"Execution plan — "+directive.title,
    rationale:directive.reason,
    steps,
    guardrails:[
      "No external email, social post, call or calendar action is executed by staging this plan.",
      "Prepared outbound is forced into APPROVE mode even if the mission is configured for auto.",
      "Internal research and measurement steps are queued for approval instead of running immediately.",
      "Existing compliance, quality, opt-out, dependency and daily-limit gates remain authoritative."
    ],
    generatedAt:new Date().toISOString()
  };
}

export async function stageExecutionPlan(plan:ExecutionPlan):Promise<StagedExecutionPlan>{
  const existingPlannerActions=distributionStore.listActions().filter(action=>action.payload.plannerPlanId===plan.id);
  if(existingPlannerActions.length)return{plan,alreadyStaged:true,preparedOutreach:0,preparedCampaignAssets:0,queuedInternalActions:0,notes:["This execution plan is already staged. Existing governed actions were left unchanged."]};
  const mission=distributionStore.getMission(plan.missionId);
  if(!mission)throw new Error("Mission not found");
  const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
  let preparedOutreach=0;
  let preparedCampaignAssets=0;
  const internal:PlannedAction[]=[];
  const notes:string[]=[];

  for(const step of plan.steps){
    if(step.kind==="prepare_outreach"){
      for(const leadId of step.targetLeadIds||[]){
        const lead=distributionStore.getLead(leadId);
        if(!lead||lead.missionId!==plan.missionId)continue;
        const result=await prepareLeadOutreach(mission,lead,product,{forceApproval:true,plannerPlanId:plan.id});
        if(result.sequence)preparedOutreach+=1;
        if(result.existing)notes.push(lead.company+": existing outreach sequence reused; no duplicate actions created.");
        if("skipped" in result&&result.skipped)notes.push(lead.company+": "+result.skipped);
      }
    }else if(step.kind==="prepare_campaign"){
      const result=await prepareSmmCampaign(mission,Math.max(1,Math.min(3,step.days||3)),{plannerPlanId:plan.id});
      preparedCampaignAssets+=result.drafts.length;
    }else if(step.kind==="queue_research"){
      internal.push({
        id:"planner-research-"+crypto.randomUUID(),
        channel:"email",
        kind:"research",
        objective:"Decision Engine research increment",
        rationale:"Internal research staged from an approved execution plan; no prospect is contacted by this action.",
        mode:"APPROVE",
        scheduledOffsetHours:0,
        payload:{limit:Math.max(1,Math.min(1,step.limit||1)),plannerPlanId:plan.id}
      });
    }else if(step.kind==="queue_measurement"){
      internal.push({
        id:"planner-measure-"+crypto.randomUUID(),
        channel:"email",
        kind:"analyze",
        objective:"Decision Engine evidence re-measurement",
        rationale:"Internal learning pass staged from an execution plan.",
        mode:"APPROVE",
        scheduledOffsetHours:Math.max(1,step.scheduledOffsetHours||72),
        payload:{plannerPlanId:plan.id}
      });
    }
  }

  const queued=internal.length?distributionStore.enqueueActions(plan.missionId,internal):[];
  return{plan,alreadyStaged:false,preparedOutreach,preparedCampaignAssets,queuedInternalActions:queued.length,notes};
}
