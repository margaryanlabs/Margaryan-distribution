import { NextResponse } from "next/server";
import { ingestCompletedVoiceCall } from "@/lib/agent/call-orchestrator";
import type { VoiceTranscriptTurn } from "@/lib/types";

function cleanTranscript(value:unknown):VoiceTranscriptTurn[]{
  if(!Array.isArray(value))return[];
  return value.slice(0,500).flatMap((item)=>{
    if(!item||typeof item!=="object")return[];
    const raw=item as Record<string,unknown>;const speaker=raw.speaker==="agent"||raw.speaker==="prospect"?raw.speaker:undefined;const text=typeof raw.text==="string"?raw.text.trim().slice(0,4000):"";
    if(!speaker||!text)return[];return[{speaker,text,at:typeof raw.at==="string"?raw.at:undefined}];
  });
}

export async function POST(req:Request){
  const expected=process.env.VOICE_CALLBACK_SECRET||process.env.WORKER_SECRET;
  if(process.env.EXECUTION_ENABLED==="true"&&!expected)return NextResponse.json({ok:false,error:"VOICE_CALLBACK_SECRET is required for live voice callbacks"},{status:503});
  if(expected&&req.headers.get("x-voice-secret")!==expected)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  try{
    const body=await req.json() as Record<string,unknown>;const metadata=body.metadata&&typeof body.metadata==="object"?body.metadata as Record<string,unknown>:{};const callSid=typeof body.callSid==="string"?body.callSid:"";
    if(!callSid)return NextResponse.json({ok:false,error:"callSid is required"},{status:400});
    const result=await ingestCompletedVoiceCall({callSid,streamSid:typeof body.streamSid==="string"?body.streamSid:undefined,missionId:typeof metadata.missionId==="string"?metadata.missionId:undefined,leadId:typeof metadata.leadId==="string"?metadata.leadId:undefined,actionId:typeof metadata.actionId==="string"?metadata.actionId:undefined,objective:typeof metadata.objective==="string"?metadata.objective:undefined,transcript:cleanTranscript(body.transcript),startedAt:typeof body.startedAt==="string"?body.startedAt:undefined,completedAt:typeof body.completedAt==="string"?body.completedAt:undefined});
    return NextResponse.json({ok:true,...result});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Voice completion failed"},{status:500});}
}
