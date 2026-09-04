import {NextResponse} from "next/server";
import {buildExecutiveBrief} from "@/lib/agent/executive-brief";

export async function GET(req:Request){
  try{const hours=Number(new URL(req.url).searchParams.get("hours")||24);return NextResponse.json(await buildExecutiveBrief(hours));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Brief failed"},{status:500});}
}
