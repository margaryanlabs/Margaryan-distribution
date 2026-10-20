import {NextResponse} from "next/server";
import {readSelfHostedTelemetry} from "@/lib/cloud/telemetry";
import {cloudOperatorAccess} from "@/lib/cloud/operator-auth";

export const dynamic="force-dynamic";
export const runtime="nodejs";

/** Owner-only read of allowlisted self-hosted Prometheus aggregate metrics. */
export async function GET(request:Request){
 const access=cloudOperatorAccess(request.headers,process.env);
 if(access!=="allow"){
  return NextResponse.json({error:access==="unconfigured"?"Operator auth is required.":"Unauthorized"},{
   status:access==="unconfigured"?503:401,
   headers:{"Cache-Control":"private, no-store","WWW-Authenticate":'Basic realm="Markarian Cloud"'}
  });
 }
 return NextResponse.json(await readSelfHostedTelemetry(process.env),{headers:{
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff","Vary":"Authorization"
 }});
}
