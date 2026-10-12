import {MOTION_OWNER_RESOURCE,MOTION_OAUTH_ISSUER,MOTION_OWNER_SCOPES} from "@/lib/motion/owner-oauth";
export const dynamic="force-dynamic";
export function GET(){
 return Response.json({
  resource:MOTION_OWNER_RESOURCE,
  authorization_servers:[MOTION_OAUTH_ISSUER],
  scopes_supported:MOTION_OWNER_SCOPES,
  bearer_methods_supported:["header"]
 },{headers:{"Cache-Control":"public,max-age=300"}});
}
