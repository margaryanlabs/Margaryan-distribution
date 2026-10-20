import {NextResponse} from "next/server";
import {getProviderOverview} from "@/lib/cloud/providers";

export const dynamic="force-dynamic";
export const runtime="nodejs";

/** GET-only. Auth enforced for /api/cloud/* by the existing Distribution proxy. */
export async function GET(){
 const inventory=await getProviderOverview(process.env);
 return NextResponse.json(inventory,{headers:{
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff",
  "Vary":"Authorization"
 }});
}
