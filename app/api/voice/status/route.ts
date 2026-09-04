import {NextResponse} from "next/server";
export async function POST(req:Request){const form=await req.formData();return NextResponse.json({ok:true,sid:form.get("CallSid"),status:form.get("CallStatus")});}
