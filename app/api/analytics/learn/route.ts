import { NextResponse } from "next/server";
import { generateLearningReport } from "@/lib/agent/learning";

export async function POST(req:Request){
  try{const body=await req.json() as {missionId?:string};if(!body.missionId)return NextResponse.json({error:"missionId is required"},{status:400});return NextResponse.json({report:await generateLearningReport(body.missionId)});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Learning pass failed"},{status:500});}
}
