import {NextResponse} from "next/server";
import {cloudOperatorAccess} from "@/lib/cloud/operator-auth";
import {readSentinelStatus} from "@/lib/cloud/sentinel-status";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const access=cloudOperatorAccess(request.headers,process.env);
 if(access!=="allow")return NextResponse.json({error:access==="unconfigured"?"Private Cloud operator credentials are required.":"Unauthorized"},{
  status:access==="unconfigured"?503:401,
  headers:{"Cache-Control":"private, no-store","WWW-Authenticate":'Basic realm="Markarian Cloud"'}
 });
 return NextResponse.json(readSentinelStatus(process.env),{headers:{
  "Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","Vary":"Authorization"
 }});
}
