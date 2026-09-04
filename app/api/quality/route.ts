import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";

export function GET(){
  const state=distributionStore.snapshot();
  const content=state.content.filter(x=>typeof x.qualityScore==="number").map(x=>({id:x.id,type:"content",channel:x.channel,title:x.title,score:x.qualityScore,issues:x.qualityIssues||[],status:x.status,missionId:x.missionId}));
  const actions=state.actions.filter(x=>typeof x.payload.qualityScore==="number").map(x=>({id:x.recordId,type:"action",channel:x.channel,title:x.objective,score:Number(x.payload.qualityScore),issues:Array.isArray(x.payload.qualityIssues)?x.payload.qualityIssues.map(String):[],status:x.status,missionId:x.missionId}));
  const items=[...content,...actions].sort((a,b)=>a.score-b.score);return NextResponse.json({items,stats:{assessed:items.length,passed:items.filter(x=>x.score>=70&&!x.issues.some(issue=>/unresolved placeholder|absolute or guaranteed|numeric claim/i.test(issue))).length,blocked:state.actions.filter(x=>x.status==="blocked"&&typeof x.payload.qualityScore==="number").length,average:items.length?Math.round(items.reduce((sum,x)=>sum+x.score,0)/items.length):0}});
}
