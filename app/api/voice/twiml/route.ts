function xmlEscape(value:string){return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&apos;");}

export async function POST(request:Request){
  const url=new URL(request.url);const streamUrl=process.env.VOICE_GATEWAY_WSS_URL;if(!streamUrl)return new Response("VOICE_GATEWAY_WSS_URL missing",{status:500});
  const params={leadId:url.searchParams.get("leadId")||"",missionId:url.searchParams.get("missionId")||"",actionId:url.searchParams.get("actionId")||"",leadName:url.searchParams.get("leadName")||"",objective:url.searchParams.get("objective")||"qualify interest",language:url.searchParams.get("language")||"en"};
  const custom=Object.entries(params).map(([name,value])=>`<Parameter name="${xmlEscape(name)}" value="${xmlEscape(value)}"/>`).join("");
  const xml=`<Response><Connect><Stream url="${xmlEscape(streamUrl)}">${custom}</Stream></Connect></Response>`;
  return new Response(xml,{headers:{"Content-Type":"text/xml; charset=utf-8","Cache-Control":"no-store"}});
}
