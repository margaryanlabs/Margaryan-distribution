import {NextResponse} from "next/server";
export const runtime="nodejs";
const HOST="https://distribution-web-production.up.railway.app";
const allowedBrands=["promptence","veto","raios","labs","ingu","meqena","suren","veto_private","veto_sport","armat","tun","hay_engine","reality_engine"];
/** Public-safe GPT Action. This is *not* a proxy for OpenAI model inference.
 * The GPT itself proposes the brief. Margaryan Director builds the film data.
 */
const document={
 openapi:"3.1.0",
 info:{title:"Margaryan Motion Studio Director",version:"1.0.0",
 description:"Create editable storyboard projects using Margaryan Motion's original keyless cinematic engine. Generates JSON only: no AI video, no real scan results, no render queues or private files."},
 servers:[{url:HOST}],
 paths:{
  "/api/motion/storyboard":{
   post:{
    operationId:"createMotionStoryboard",
    summary:"Create a native Margaryan Motion film storyboard",
    description:"Create an original, brand-aware storyboard project for a video. Returns real editable Motion JSON, never an MP4. Requires no payment or API key. Use only public-safe prompts; no personal data or unsupported performance claims.",
    requestBody:{required:true,content:{"application/json":{schema:{
     type:"object",additionalProperties:false,
     required:["prompt","brand","format"],
     properties:{
      prompt:{type:"string",minLength:12,maxLength:650,description:"Human-approved public-safe creative direction and factual claims only."},
      brand:{type:"string",enum:allowedBrands,description:"Film's original supported brand."},
      format:{type:"string",enum:["portrait","landscape","square"]},
      language:{type:"string",enum:["ru","en","hy"]},
      style:{type:"string",enum:["cinematic","kinetic","technical"]}
     }
    }}}},
    responses:{
     "200":{description:"Editable native Motion Studio project. rendered=false means no video exists yet.",
      content:{"application/json":{schema:{type:"object",required:["project","rendered"],properties:{
       project:{type:"object",additionalProperties:true,description:"Native editable storyboard JSON; retain this structure verbatim and export as .motion.json or paste into Motion Creator."},
       engine:{type:"string"},requiresApiKey:{type:"boolean"},creditsUsed:{type:"integer"},
       rendered:{type:"boolean",const:false}
      }}}}},
     "400":{description:"Rejected malformed or unsupported brief"},
     "413":{description:"Oversized storyboard brief"}
    }
   }
  }
 }
} as const;
export function GET(){
 return NextResponse.json(document,{headers:{"Cache-Control":"public,max-age=3600",
  "Access-Control-Allow-Origin":"https://chatgpt.com",
  "X-Content-Type-Options":"nosniff"}});
}
