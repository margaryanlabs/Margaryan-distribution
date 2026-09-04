import {NextResponse} from "next/server";
import {summarizeSalesConversation} from "@/lib/agent/summarize";

export async function POST(req:Request){
  try{
    const body=await req.json() as{transcript?:string};const transcript=body.transcript?.trim();if(!transcript)return NextResponse.json({ok:false,error:"transcript is required"},{status:400});
    const summary=await summarizeSalesConversation(transcript.slice(0,30000));return NextResponse.json({ok:true,summary,mutated:false,note:"Preview only: no lead, call, action or learning state was changed."});
  }catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Voice preview failed"},{status:500});}
}
