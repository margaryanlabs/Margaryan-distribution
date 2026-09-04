import { NextResponse } from "next/server";
import { pollKnownLeadGmail } from "@/lib/agent/inbox-poller";

export async function POST(){
  try{return NextResponse.json({ok:true,...await pollKnownLeadGmail(25)});}
  catch(error){return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Gmail poll failed"},{status:500});}
}
