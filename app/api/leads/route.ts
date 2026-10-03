import { NextResponse } from "next/server";
import { distributionStore } from "@/lib/store";
import { storageRuntime, withDurableState } from "@/lib/store/checkpoint";

function cleanText(value:unknown,max=500){
  return typeof value==="string"&&value.trim()?value.trim().slice(0,max):undefined;
}
function cleanUrl(value:unknown){
  const raw=cleanText(value,1000);if(!raw)return undefined;
  try{const url=new URL(raw);if(!["http:","https:"].includes(url.protocol))return undefined;url.hash="";return url.toString();}catch{return undefined;}
}
function cleanEmail(value:unknown){
  const raw=cleanText(value,320)?.toLowerCase();if(!raw)return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)?raw:undefined;
}

export async function GET(){
  try{
    const {result,hydration}=await withDurableState(()=>({leads:distributionStore.listLeads()}),{writeBack:false});
    return NextResponse.json({...result,runtime:storageRuntime(),hydration});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Lead load failed",runtime:storageRuntime()},{status:500});
  }
}

export async function POST(request:Request){
  try{
    if(!storageRuntime().durable)return NextResponse.json({error:"Durable CRM is required before adding real prospects",runtime:storageRuntime()},{status:503});
    const body=await request.json() as {
      missionId?:unknown;company?:unknown;website?:unknown;email?:unknown;contactName?:unknown;role?:unknown;
      country?:unknown;fitReason?:unknown;sourceUrl?:unknown;linkedinUrl?:unknown;
    };
    const missionId=cleanText(body.missionId,100);
    const company=cleanText(body.company,200);
    if(!missionId||!company)return NextResponse.json({error:"missionId and company are required"},{status:400});

    const website=cleanUrl(body.website);
    const sourceUrl=cleanUrl(body.sourceUrl);
    const linkedinUrl=cleanUrl(body.linkedinUrl);
    const email=cleanEmail(body.email);
    const fitReason=cleanText(body.fitReason,1200);

    const {result,persistence}=await withDurableState(()=>{
      const mission=distributionStore.getMission(missionId);
      if(!mission)throw new Error("Mission not found");
      const product=mission.input.productId?distributionStore.getProduct(mission.input.productId):undefined;
      const promptence=product?.name.trim().toLowerCase()==="promptence";
      const evidenceUrls=Array.from(new Set([sourceUrl,website].filter((value):value is string=>Boolean(value))));
      const created=distributionStore.addLeads([{
        missionId,
        company,
        website,
        email,
        contactName:cleanText(body.contactName,200),
        role:cleanText(body.role,200),
        country:cleanText(body.country,120)||mission.input.market,
        language:mission.input.language,
        stage:"new",
        fitReason:fitReason||"Manual prospect intake; evidence qualification pending.",
        research:fitReason||"Added manually by the operator. Do not treat this record as researched evidence until qualification is completed.",
        score:evidenceUrls.length?45:30,
        sourceUrls:evidenceUrls,
        linkedinUrl,
        priority:"P2",
        recommendedOfferCode:promptence?"free_signal":undefined,
        recommendedOffer:promptence?"Free AI visibility signal":undefined,
        estimatedValueUsd:promptence?0:undefined,
        qualificationReasons:[],
        qualificationGaps:["Manual intake: evidence-backed qualification pending"],
        nextAction:"Run evidence qualification"
      }]);
      const lead=created[0]||distributionStore.listLeads().find(item=>item.missionId===missionId&&item.company.trim().toLowerCase()===company.toLowerCase());
      return{lead,created:Boolean(created.length),product:product?{id:product.id,name:product.name}:null};
    });

    return NextResponse.json({...result,runtime:storageRuntime(),persistence},{status:result.created?201:200});
  }catch(error){
    const message=error instanceof Error?error.message:"Lead intake failed";
    return NextResponse.json({error:message,runtime:storageRuntime()},{status:message==="Mission not found"?404:500});
  }
}
