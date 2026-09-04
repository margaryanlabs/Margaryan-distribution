import {NextResponse} from "next/server";
import {proposeMeeting} from "@/lib/agent/meeting-orchestrator";
import {distributionStore} from "@/lib/store";

export function GET(){return NextResponse.json({meetings:distributionStore.listMeetings()});}

export async function POST(req:Request){
  try{
    const body=await req.json() as{missionId?:string;leadId?:string;start?:string;end?:string;timezone?:string;sourceCallSid?:string;title?:string;notes?:string};
    if(!body.leadId||!body.start)return NextResponse.json({error:"leadId and start are required"},{status:400});
    const lead=distributionStore.getLead(body.leadId);if(!lead)return NextResponse.json({error:"Lead not found"},{status:404});
    const missionId=body.missionId||lead.missionId;if(!missionId)return NextResponse.json({error:"Lead has no mission"},{status:409});
    const meeting=proposeMeeting({missionId,leadId:body.leadId,start:body.start,end:body.end,timezone:body.timezone,sourceCallSid:body.sourceCallSid,title:body.title,notes:body.notes});
    return NextResponse.json({meeting});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Meeting proposal failed"},{status:400});}
}
