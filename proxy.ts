import {timingSafeEqual} from "node:crypto";
import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

// Scoped ONLY to Markarian Cloud routes. Existing Distribution and Motion
// authentication and behavior remain unchanged.
function same(a:string,b:string){
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
}
export function proxy(request:NextRequest){
 const user=process.env.DISTRIBUTION_BASIC_USER;
 const pass=process.env.DISTRIBUTION_BASIC_PASSWORD;
 const isApi=request.nextUrl.pathname.startsWith("/api/cloud");
 // The preview UI contains no sensitive live data. Never expose the API
 // if an operator password is not configured.
 if(!user||!pass){
  if(isApi)return NextResponse.json({error:"Cloud API requires DISTRIBUTION_BASIC_USER and DISTRIBUTION_BASIC_PASSWORD."},
   {status:503,headers:{"Cache-Control":"no-store"}});
  return NextResponse.next();
 }
 const header=request.headers.get("authorization")||"";
 let pair="";
 if(header.startsWith("Basic ")&&header.length<1500){
  try{pair=Buffer.from(header.slice(6),"base64").toString("utf8");}catch{}
 }
 const boundary=pair.indexOf(":");
 if(boundary>=0&&same(pair.slice(0,boundary),user)&&same(pair.slice(boundary+1),pass))
  return NextResponse.next();
 return new NextResponse("Operator authorization required",{
  status:401,headers:{"WWW-Authenticate":'Basic realm="Markarian Cloud", charset="UTF-8"',
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
 });
}
export const config={matcher:["/cloud/:path*","/api/cloud/:path*"]};
