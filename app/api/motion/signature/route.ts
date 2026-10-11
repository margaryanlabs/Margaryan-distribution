import { NextResponse } from "next/server";
import { createPromptenceSignature, createPromptenceCampaign } from "@/lib/motion/signature-promptence";

export const runtime="nodejs";
/** Public, keyless source of truth for the curated 8-shot campaign.
 * Does not touch any CRM, provider keys, prompts or sensitive user data. */
export async function GET(request:Request){
  try{
    const params=new URL(request.url).searchParams;
    const lang=params.get("lang")||"en",format=params.get("format")||"portrait",cut=params.get("cut")||"original";
    if(!["en","ru","hy"].includes(lang)||!["portrait","landscape","square"].includes(format)){
      return NextResponse.json({error:"lang must be en/ru/hy and format must be portrait/landscape/square"},{status:400});
    }
    if(!["original","campaign"].includes(cut)) {
      return NextResponse.json({error:"cut must be original or campaign"},{status:400});
    }
    const language=lang as "en"|"ru"|"hy";
    const movieFormat=format as "portrait"|"landscape"|"square";
    const project=cut==="campaign"
      ?createPromptenceCampaign(language,movieFormat)
      :createPromptenceSignature(language,movieFormat);
    return NextResponse.json({project,engine:cut==="campaign"?"promptence-36.5s-campaign":"promptence-signature-film-v2",requiresApiKey:false,creditsUsed:0,rendered:false},
      {headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Cannot generate film"},{status:400});
  }
}