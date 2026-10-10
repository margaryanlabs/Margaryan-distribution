import { NextRequest, NextResponse } from "next/server";

function unauthorized() {return new NextResponse("Authentication required",{status:401,headers:{"WWW-Authenticate":'Basic realm="Margaryan Distribution", charset="UTF-8"',"Cache-Control":"no-store"}});}
function unavailable(message:string){return new NextResponse(message,{status:503,headers:{"Cache-Control":"no-store"}});}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i+=1)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function isMachinePath(path:string){return path==="/api/portfolio/tick"||path==="/api/autopilot/tick"||path.startsWith("/api/worker/");}
function machineAuthorized(request:NextRequest){
 const path=request.nextUrl.pathname;
 const authorization=request.headers.get("authorization")||"";
 if(path==="/api/portfolio/tick"&&process.env.CRON_SECRET&&safeEqual(authorization,`Bearer ${process.env.CRON_SECRET}`))return true;
 if(path==="/api/portfolio/tick"||path==="/api/autopilot/tick"){
  const supplied=request.headers.get("x-autopilot-secret")||"";
  if(process.env.AUTOPILOT_SECRET&&supplied&&safeEqual(supplied,process.env.AUTOPILOT_SECRET))return true;
 }
 if(isMachinePath(path)){
  const supplied=request.headers.get("x-worker-secret")||"";
  if(process.env.WORKER_SECRET&&supplied&&safeEqual(supplied,process.env.WORKER_SECRET))return true;
 }
 return false;
}
function sensitiveRuntimeConfigured(){
 return Boolean(
  process.env.DISTRIBUTION_DATABASE_URL||
  (process.env.DISTRIBUTION_SUPABASE_URL&&process.env.DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY)||
  process.env.OPENAI_API_KEY||
  process.env.GOOGLE_REFRESH_TOKEN||
  process.env.GMAIL_ACCESS_TOKEN||
  process.env.GOOGLE_ACCESS_TOKEN||
  process.env.EXECUTION_ENABLED==="true"
 );
}
export function proxy(request:NextRequest){
 if(machineAuthorized(request))return NextResponse.next();

 const path=request.nextUrl.pathname;
 // This exact public surface contains no CRM data, tokens, server AI calls or external effects.
 // Do not open other /api, /motion/* or Distribution routes without operator authentication.
 if(path==="/motion"||(path==="/api/motion/storyboard"||path==="/api/motion/captions"||path==="/api/motion/signature")||/^\/motion\/brands\/(?:promptence|meqena|ingu|veto-sport|veto-private|hay-engine|tun-component-preview)\.svg$/.test(path))return NextResponse.next();
 const expectedUser=process.env.DISTRIBUTION_BASIC_USER;
 const expectedPassword=process.env.DISTRIBUTION_BASIC_PASSWORD;
 const operatorAuthConfigured=Boolean(expectedUser&&expectedPassword);

 // Private message data must never be accessible on an unauthenticated demo deployment.
 if((path==="/linkedin"||path.startsWith("/linkedin/")||path.startsWith("/api/linkedin/agent"))&&!operatorAuthConfigured)return unavailable("Set DISTRIBUTION_BASIC_USER and DISTRIBUTION_BASIC_PASSWORD to enable private LinkedIn conversations.");

 if(isMachinePath(path)&&!operatorAuthConfigured)return unavailable("Machine endpoint disabled until CRON_SECRET, WORKER_SECRET, AUTOPILOT_SECRET, or operator auth is configured.");

 if(process.env.NODE_ENV==="production"&&sensitiveRuntimeConfigured()&&!operatorAuthConfigured){
  return unavailable("Distribution runtime is activated but operator authentication is not configured.");
 }

 if(!operatorAuthConfigured)return NextResponse.next();

 const authorization=request.headers.get("authorization");
 if(!authorization?.startsWith("Basic "))return unauthorized();
 try{
  const decoded=atob(authorization.slice(6));
  const separator=decoded.indexOf(":");
  if(separator<0)return unauthorized();
  const username=decoded.slice(0,separator);
  const password=decoded.slice(separator+1);
  if(!safeEqual(username,expectedUser!)||!safeEqual(password,expectedPassword!))return unauthorized();
  return NextResponse.next();
 }catch{return unauthorized();}
}
export const config={matcher:["/((?!api/health|_next/static|_next/image|favicon.ico).*)"]};
