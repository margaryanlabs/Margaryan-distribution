import {registerMotionOAuthClient} from "@/lib/motion/owner-oauth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const noCache={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function POST(request:Request){
 if(request.headers.get("content-type")?.split(";")[0]?.trim()!=="application/json")
  return Response.json({error:"invalid_client_metadata"},{status:415,headers:noCache});
 if(Number(request.headers.get("content-length")||0)>1500)
  return Response.json({error:"invalid_client_metadata"},{status:413,headers:noCache});
 try{
  const raw=await request.text();
  if(raw.length>1500)throw Error("invalid_client_metadata");
  const x=JSON.parse(raw);
  if(!x||Array.isArray(x)||!Array.isArray(x.redirect_uris)||x.redirect_uris.length!==1||
   typeof x.redirect_uris[0]!=="string"||
   (x.token_endpoint_auth_method&&x.token_endpoint_auth_method!=="none")||
   (x.grant_types&&(!Array.isArray(x.grant_types)||
     !x.grant_types.includes("authorization_code"))))
   throw Error("invalid_client_metadata");
  const id=await registerMotionOAuthClient(x.redirect_uris[0]);
  return Response.json({
   client_id:id,client_name:"Margaryan Motion Studio / ChatGPT",
   redirect_uris:x.redirect_uris,token_endpoint_auth_method:"none",
   grant_types:["authorization_code","refresh_token"],
   response_types:["code"]
  },{status:201,headers:noCache});
 }catch(e){
  const reason=e instanceof Error?e.message:"invalid_client_metadata";
  return Response.json({error:["registration_limit","invalid_redirect_uri"].includes(reason)?
   reason:"invalid_client_metadata"},{status:reason==="registration_limit"?429:400,headers:noCache});
 }
}
