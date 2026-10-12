import {MOTION_OAUTH_ISSUER,MOTION_OWNER_SCOPES} from "@/lib/motion/owner-oauth";
export const dynamic="force-dynamic";
export function GET(){
 return Response.json({
  issuer:MOTION_OAUTH_ISSUER,
  authorization_endpoint:MOTION_OAUTH_ISSUER+"/api/motion/oauth/authorize",
  token_endpoint:MOTION_OAUTH_ISSUER+"/api/motion/oauth/token",
  registration_endpoint:MOTION_OAUTH_ISSUER+"/api/motion/oauth/register",
  response_types_supported:["code"],
  grant_types_supported:["authorization_code","refresh_token"],
  scopes_supported:MOTION_OWNER_SCOPES,
  code_challenge_methods_supported:["S256"],
  token_endpoint_auth_methods_supported:["none"],
  authorization_response_iss_parameter_supported:true
 },{headers:{"Cache-Control":"public,max-age=300"}});
}
