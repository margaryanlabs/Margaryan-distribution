import {verifyMotionOAuthAccess,MOTION_OAUTH_ISSUER} from "@/lib/motion/owner-oauth";
import {ownerMotionMcpHandler} from "@/lib/motion/owner-mcp";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const ORIGINS=new Set(["https://chatgpt.com","https://chat.openai.com"]);
const MAX_BODY=6000;
const metadata=MOTION_OAUTH_ISSUER+"/.well-known/oauth-protected-resource";
const safeOrigin=(r:Request)=>{
 const origin=r.headers.get("origin");
 if(!origin)return true;
 try{
  const u=new URL(origin);
  return u.origin===new URL(r.url).origin||ORIGINS.has(u.origin);
 }catch{return false;}
};
const unauth=()=>Response.json({error:"unauthorized",error_description:"Owner OAuth required"},{
 status:401,headers:{"WWW-Authenticate":
  'Bearer resource_metadata="'+metadata+'", scope="motion:read motion:render"',
  "Cache-Control":"no-store"}});
const err=(message:string,status:number)=>Response.json({error:message},{
 status,headers:{"Cache-Control":"no-store"}});
export async function POST(request:Request){
 if(!safeOrigin(request))return err("origin_not_allowed",403);
 if(process.env.MOTION_RENDER_ENABLED!=="true")return err("motion_worker_disabled",503);
 if(!await verifyMotionOAuthAccess(request.headers.get("authorization")))
  return unauth();
 if(request.headers.get("content-type")?.split(";")[0]?.trim()!=="application/json")
  return err("json_required",415);
 if(Number(request.headers.get("content-length")||0)>MAX_BODY)return err("oversized",413);
 try{
  const body=await request.text();
  if(body.length>MAX_BODY)return err("oversized",413);
  const message=JSON.parse(body) as Record<string,unknown>;
  if(!message||Array.isArray(message)||typeof message.method!=="string")
   return err("invalid_rpc",400);
  // Paid write capability is independently checked, even if the MCP tool
  // protocol is called directly without the ChatGPT application UI.
  if(message.method==="tools/call"&&
    (message.params as {name?:unknown}|null)?.name==="motion_owner_render_create"&&
    !await verifyMotionOAuthAccess(request.headers.get("authorization"),"motion:render"))
   return err("insufficient_scope",403);
  const response=await ownerMotionMcpHandler.fetch(new Request(request.url,{
   method:"POST",headers:request.headers,body
  }));
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","no-store, private");
  return new Response(response.body,{status:response.status,headers});
 }catch{return err("invalid_rpc",400);}
}
export async function GET(request:Request){
 if(!safeOrigin(request))return err("origin_not_allowed",403);
 if(!await verifyMotionOAuthAccess(request.headers.get("authorization")))return unauth();
 return ownerMotionMcpHandler.fetch(request);
}
export async function DELETE(request:Request){
 if(!safeOrigin(request))return err("origin_not_allowed",403);
 if(!await verifyMotionOAuthAccess(request.headers.get("authorization")))return unauth();
 return ownerMotionMcpHandler.fetch(request);
}
