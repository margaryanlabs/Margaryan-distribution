import { NextResponse } from "next/server";
import { runDueAutoActions } from "@/lib/agent/action-runner";

export async function POST(req:Request){
  const secret=process.env.WORKER_SECRET;
  if(secret&&req.headers.get("x-worker-secret")!==secret)return NextResponse.json({ok:false},{status:401});
  const result=await runDueAutoActions(10);
  return NextResponse.json({ok:true,storage:"memory",...result});
}
