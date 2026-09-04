import { NextResponse } from "next/server";
import { runAutopilot } from "@/lib/agent/director";

export async function POST(req:Request){
  const secret=process.env.AUTOPILOT_SECRET||process.env.WORKER_SECRET;
  if(secret&&req.headers.get("x-autopilot-secret")!==secret&&req.headers.get("x-worker-secret")!==secret)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  try{
    let body:Record<string,unknown>={};try{body=await req.json();}catch{}
    const report=await runAutopilot({missionId:typeof body.missionId==="string"?body.missionId:undefined,leadTarget:Number(body.leadTarget||8),researchPerTick:Number(body.researchPerTick||5),outreachPerTick:Number(body.outreachPerTick||3),smmDays:Number(body.smmDays||7),pollInbox:body.pollInbox!==false,runActions:body.runActions!==false});
    return NextResponse.json({ok:true,storage:"memory",report});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Autopilot failed"},{status:500});}
}
