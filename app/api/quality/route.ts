import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";
import {storageRuntime,withDurableState} from "@/lib/store/checkpoint";

export async function GET() {
  try{
    const{result,hydration}=await withDurableState(()=>{
      const state = distributionStore.snapshot();
      const content = state.content
        .filter((item) => typeof item.qualityScore === "number")
        .map((item) => ({
          id: item.id,type: "content" as const,channel: item.channel,title: item.title,score: Number(item.qualityScore),
          issues: item.qualityIssues ?? [],status: item.status,missionId: item.missionId,
        }));
      const actions = state.actions
        .filter((action) => typeof action.payload.qualityScore === "number")
        .map((action) => ({
          id: action.recordId,type: "action" as const,channel: action.channel,title: action.objective,score: Number(action.payload.qualityScore),
          issues: Array.isArray(action.payload.qualityIssues)? action.payload.qualityIssues.map(String): [],
          status: action.status,missionId: action.missionId,
        }));
      const items = [...content, ...actions].sort((a, b) => a.score - b.score);
      return{
        items,
        stats:{
          assessed: items.length,
          passed: items.filter((item)=>item.score>=70&&!item.issues.some((issue)=>/unresolved placeholder|absolute or guaranteed|numeric claim/i.test(issue))).length,
          blocked: state.actions.filter((action)=>action.status==="blocked"&&typeof action.payload.qualityScore==="number").length,
          average: items.length?Math.round(items.reduce((sum,item)=>sum+item.score,0)/items.length):0,
        }
      };
    },{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Quality read failed",runtime:storageRuntime()},{status:500});
  }
}
