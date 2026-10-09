import { NextResponse } from "next/server";
import { createCaptionBundle } from "@/lib/motion/captions";
import { sanitizeMotionProject } from "@/lib/motion/studio";
export const runtime = "nodejs";
/**
 * Stateless, no-keys, no-upload caption tool. Does not generate speech or
 * purport to transcribe it. No user content is persisted.
 */
export async function POST(request:Request) {
  try {
    if(Number(request.headers.get("content-length")||0)>18000){
      return NextResponse.json({error:"Storyboard exceeds 18KB limit"},{status:413});
    }
    const raw=await request.text();
    if(raw.length>18000)return NextResponse.json({error:"Storyboard exceeds 18KB limit"},{status:413});
    const body=JSON.parse(raw);
    if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("Expected object");
    const project=sanitizeMotionProject(body.project);
    const result=createCaptionBundle(project);
    return NextResponse.json(
      { ...result,kind:"editorial-shot-cues",alignedToVoice:false,requiresApiKey:false,creditsUsed:0 },
      {headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}}
    );
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Invalid project"},
      {status:400,headers:{"Cache-Control":"no-store"}});
  }
}
