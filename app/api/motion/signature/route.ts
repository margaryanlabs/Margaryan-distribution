import { NextResponse } from "next/server";
import { createPromptenceSignature } from "@/lib/motion/signature-promptence";

export const runtime="nodejs";
/** Public, keyless source of truth for the curated 8-shot campaign.
 * Does not touch any CRM, provider keys, prompts or sensitive user data. */
export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams;
    const lang=params.get("lang")||"en",format=params.get("format")||"portrait";
    if(!["en","ru","hy"].includes(lang)||!["portrait","landscape","square"].includes(format)){
      return NextResponse.json({error:"lang must be en/ru/hy and format must be portrait/landscape/square"},{status:400});
    }
    const project=createPromptenceSignature(lang as "en"|"ru"|"hy",format as "portrait"|"landscape"|"square");
    return NextResponse.json({project,engine:"promptence-signature-film-v2",requiresApiKey:false,creditsUsed:0,rendered:false},
      {headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Cannot generate film"},{status:400});
  }
}