import {motionMcpHandler} from "@/lib/motion/native-mcp";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * Real Model Context Protocol / Streamable HTTP, not a REST endpoint renamed MCP.
 * Anonymous use is deliberately READ-ONLY and STATeless: project JSON never
 * goes to a database; no remote render jobs, no users/files/credentials exposed.
 */
const MAX_BODY=32_000;
const CLIENT_ORIGINS=new Set(["https://chatgpt.com","https://chat.openai.com"]);
const headers={"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer"};
function safeOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true; // server-to-server MCP clients generally omit Origin
 try{return new URL(origin).origin===new URL(request.url).origin||CLIENT_ORIGINS.has(new URL(origin).origin);}
 catch{return false;}
}
function deny(message:string,status:number){
 return Response.json({error:message},{status,headers});
}
export async function POST(request:Request){
 if(!safeOrigin(request))return deny("MCP origin is not allowed.",403);
 if(request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()!=="application/json")
  return deny("MCP requests must be application/json.",415);
 const announced=Number(request.headers.get("content-length")||0);
 if(!Number.isFinite(announced)||announced>MAX_BODY)return deny("MCP request exceeds 32KB.",413);
 try{
  const body=await request.text();
  if(body.length>MAX_BODY)return deny("MCP request exceeds 32KB.",413);
  const response=await motionMcpHandler.fetch(new Request(request.url,{
   method:"POST",headers:request.headers,body
  }));
  const outbound=new Headers(response.headers);
  for(const [name,value]of Object.entries(headers))outbound.set(name,value);
  return new Response(response.body,{status:response.status,headers:outbound});
 }catch{
  return deny("MCP transport failed.",500);
 }
}
export async function GET(request:Request){
 if(!safeOrigin(request))return deny("MCP origin is not allowed.",403);
 return motionMcpHandler.fetch(request);
}
export async function DELETE(request:Request){
 if(!safeOrigin(request))return deny("MCP origin is not allowed.",403);
 return motionMcpHandler.fetch(request);
}
