import {NextResponse} from "next/server";
import {buildMeetingBrief} from "@/lib/agent/meeting-brief";

export async function POST(_:Request,context:{params:Promise<{id:string}>}){
  try{const{id}=await context.params;return NextResponse.json({brief:await buildMeetingBrief(id)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Meeting brief failed"},{status:400});}
}
