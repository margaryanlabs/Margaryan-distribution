import {NextResponse} from "next/server";
import {cloudOperatorAccess} from "@/lib/cloud/operator-auth";
import {readClickHouseStatus} from "@/lib/cloud/clickhouse";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const access=cloudOperatorAccess(request.headers,process.env);
 if(access!=="allow")return NextResponse.json({error:access==="unconfigured"?"Operator authentication not configured.":"Unauthorized"},
 {status:access==="unconfigured"?503:401,headers:{"Cache-Control":"no-store","WWW-Authenticate":'Basic realm="Markarian Cloud"'}});
 return NextResponse.json(await readClickHouseStatus(process.env),{headers:{"Cache-Control":"private, no-store, max-age=0","Vary":"Authorization","X-Content-Type-Options":"nosniff"}});
}
