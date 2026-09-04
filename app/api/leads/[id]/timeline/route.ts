import {NextResponse} from "next/server";
import {buildLead360} from "@/lib/agent/lead-timeline";

export async function GET(_:Request,context:{params:Promise<{id:string}>}){
  try{const{id}=await context.params;return NextResponse.json(buildLead360(id));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Lead timeline failed"},{status:404});}
}
