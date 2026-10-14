import { NextResponse } from "next/server";

// Exact immutable capture of the publicly accessible homepage, collected
// October 14, 2026. Never fetch an arbitrary user-supplied URL or private data.
const PUBLIC_CAPTURE = "https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/33e7b99c-919c-471b-aa8a-491a35e1b3d6.png";

export const runtime = "nodejs";
export async function GET(){
  try {
    const res=await fetch(PUBLIC_CAPTURE,{cache:"force-cache",signal:AbortSignal.timeout(9000)});
    const type=res.headers.get("content-type")||"";
    if(!res.ok||!type.toLowerCase().includes("image/png"))
      return new NextResponse("Public screenshot unavailable",{status:503});
    const bytes=await res.arrayBuffer();
    if(bytes.byteLength<1000||bytes.byteLength>12_000_000)
      return new NextResponse("Invalid public screenshot",{status:502});
    return new NextResponse(bytes,{
      status:200,headers:{
        "content-type":"image/png",
        "cache-control":"public, max-age=3600",
        "x-promptence-capture":"public-homepage-2026-10-14",
        "x-content-type-options":"nosniff"
      }
    });
  } catch {
    return new NextResponse("Public screenshot unavailable",{status:503});
  }
}
