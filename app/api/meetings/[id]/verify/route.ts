import {NextResponse} from "next/server";
import {verifyAndQueueMeeting} from "@/lib/agent/meeting-orchestrator";

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
  try{const{id}=await context.params;const result=await verifyAndQueueMeeting(id);return NextResponse.json(result);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Meeting availability check failed"},{status:409});}
}
