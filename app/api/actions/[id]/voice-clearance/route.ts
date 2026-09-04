import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";

export async function POST(req:Request,context:{params:Promise<{id:string}>}){
  const{id}=await context.params;const action=distributionStore.getAction(id);if(!action)return NextResponse.json({error:"Action not found"},{status:404});
  if(action.channel!=="voice"||action.kind!=="call")return NextResponse.json({error:"Voice clearance applies only to call actions"},{status:409});
  if(!["blocked","queued","failed"].includes(action.status))return NextResponse.json({error:`Cannot clear voice action in ${action.status} state`},{status:409});
  const body=await req.json().catch(()=>({})) as{jurisdictionVerified?:boolean;withinAllowedHours?:boolean;aiDisclosureAcknowledged?:boolean};
  if(body.jurisdictionVerified!==true||body.withinAllowedHours!==true||body.aiDisclosureAcknowledged!==true)return NextResponse.json({error:"Explicit jurisdiction, calling-hours, and AI-disclosure acknowledgements are required"},{status:400});
  const leadId=typeof action.payload.leadId==="string"?action.payload.leadId:undefined;const lead=leadId?distributionStore.getLead(leadId):undefined;
  if(!lead?.phone)return NextResponse.json({error:"Lead has no verified phone number in CRM"},{status:409});if(lead.optedOut||lead.doNotCall||lead.stage==="do_not_contact")return NextResponse.json({error:"Lead cannot be called because an opt-out or do-not-call flag is active"},{status:409});
  const updated=distributionStore.updateAction(id,{mode:"AUTO",status:"approved",approvedAt:new Date().toISOString(),error:undefined,payload:{...action.payload,jurisdictionVerified:true,withinAllowedHours:true,aiDisclosureAcknowledged:true,complianceCheckedAt:new Date().toISOString(),complianceSource:"manual_operator_verification"}});
  return NextResponse.json({ok:true,action:updated,note:"Voice action is cleared for execution. The realtime agent is instructed to disclose that it is an AI representative."});
}
