import {NextResponse} from "next/server";
import {cloudOperatorAccess} from "@/lib/cloud/operator-auth";
import {getProviderOverview} from "@/lib/cloud/providers";

export const dynamic="force-dynamic";
export const runtime="nodejs";

/** GET-only. Auth enforced for /api/cloud/* by the existing Distribution proxy. */
export async function GET(request:Request){
 const access=cloudOperatorAccess(request.headers,process.env);
 if(access!=="allow")return NextResponse.json({error:access==="unconfigured"?"Private Cloud operator credentials are required.":"Unauthorized"},{status:access==="unconfigured"?503:401,headers:{"Cache-Control":"private, no-store","WWW-Authenticate":'Basic realm="Markarian Cloud"'}});
 const inventory=await getProviderOverview(process.env);
 return NextResponse.json(inventory,{headers:{
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff",
  "Vary":"Authorization"
 }});
}
