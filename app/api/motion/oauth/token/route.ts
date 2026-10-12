import {exchangeMotionOAuthCode,refreshMotionOAuthToken,MOTION_OWNER_RESOURCE} from "@/lib/motion/owner-oauth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noCache={"Cache-Control":"no-store","Pragma":"no-cache","X-Content-Type-Options":"nosniff"};
export async function POST(request:Request){
 if(request.headers.get("content-type")?.split(";")[0]?.trim()!=="application/x-www-form-urlencoded")
  return Response.json({error:"invalid_request"},{status:415,headers:noCache});
 if(Number(request.headers.get("content-length")||0)>2000)
  return Response.json({error:"invalid_request"},{status:413,headers:noCache});
 try{
  const body=await request.text();
  if(body.length>2000)throw Error("invalid_request");
  const x=new URLSearchParams(body),grant=x.get("grant_type");
  const client_id=x.get("client_id")||"";
  if(client_id.length<24||client_id.length>128)throw Error("invalid_client");
  if(grant==="authorization_code"){
   const response=await exchangeMotionOAuthCode({
    code:x.get("code")||"",client_id,redirect_uri:x.get("redirect_uri")||"",
    code_verifier:x.get("code_verifier")||"",
    resource:x.get("resource")||MOTION_OWNER_RESOURCE
   });
   return Response.json(response,{headers:noCache});
  }
  if(grant==="refresh_token"){
   const response=await refreshMotionOAuthToken({client_id,refresh_token:x.get("refresh_token")||""});
   return Response.json(response,{headers:noCache});
  }
  throw Error("unsupported_grant_type");
 }catch(e){
  const err=e instanceof Error?e.message:"invalid_request";
  const known=["invalid_request","invalid_grant","invalid_client","invalid_target","unsupported_grant_type"];
  return Response.json({error:known.includes(err)?err:"invalid_grant"},
   {status:400,headers:noCache});
 }
}
