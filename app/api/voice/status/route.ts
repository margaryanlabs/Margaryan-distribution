import crypto from "node:crypto";
import {NextResponse} from "next/server";
import {distributionStore} from "@/lib/store";
import {ingestCompletedVoiceCall} from "@/lib/agent/call-orchestrator";
import type {VoiceCallStatus} from "@/lib/types";

function canonicalUrl(req:Request){const incoming=new URL(req.url);const base=process.env.APP_BASE_URL;if(!base)return incoming.toString();const canonical=new URL(incoming.pathname+incoming.search,base.endsWith("/")?base:`${base}/`);return canonical.toString();}
function validTwilioSignature(req:Request,form:FormData){
  const token=process.env.TWILIO_AUTH_TOKEN,sig=req.headers.get("x-twilio-signature");if(!token||!sig)return process.env.EXECUTION_ENABLED!=="true";
  const pairs:Array<[string,string]>=[];for(const [key,value] of form.entries())if(typeof value==="string")pairs.push([key,value]);pairs.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  const data=canonicalUrl(req)+pairs.map(([key,value])=>`${key}${value}`).join("");const expected=crypto.createHmac("sha1",token).update(data).digest("base64");
  const left=Buffer.from(expected),right=Buffer.from(sig);return left.length===right.length&&crypto.timingSafeEqual(left,right);
}
function mapStatus(value:string,current?:VoiceCallStatus):VoiceCallStatus{if(current==="summarized")return current;if(value==="ringing")return"ringing";if(value==="in-progress"||value==="answered")return"answered";if(value==="completed")return"completed";if(["busy","failed","no-answer","canceled"].includes(value))return"failed";return"initiated";}

export async function POST(req:Request){
  const form=await req.formData();if(!validTwilioSignature(req,form))return NextResponse.json({ok:false,error:"Invalid Twilio signature"},{status:401});
  const url=new URL(req.url);const callSid=String(form.get("CallSid")||"");const providerStatus=String(form.get("CallStatus")||"");if(!callSid)return NextResponse.json({ok:false,error:"CallSid missing"},{status:400});
  const existing=distributionStore.getCallBySid(callSid);const missionId=url.searchParams.get("missionId")||existing?.missionId||undefined;const leadId=url.searchParams.get("leadId")||existing?.leadId||undefined;const actionId=url.searchParams.get("actionId")||existing?.actionId||undefined;const now=new Date().toISOString();const durationRaw=Number(form.get("CallDuration")||NaN);const durationSeconds=Number.isFinite(durationRaw)?durationRaw:existing?.durationSeconds;
  const record=distributionStore.upsertCall({callSid,missionId,leadId,actionId,objective:existing?.objective,status:mapStatus(providerStatus,existing?.status),providerStatus,transcript:existing?.transcript||[],startedAt:existing?.startedAt||now,answeredAt:(providerStatus==="in-progress"||providerStatus==="answered")?(existing?.answeredAt||now):existing?.answeredAt,completedAt:["completed","busy","failed","no-answer","canceled"].includes(providerStatus)?now:existing?.completedAt,durationSeconds,summary:existing?.summary,error:["failed","canceled"].includes(providerStatus)?`Twilio status: ${providerStatus}`:existing?.error});
  if((providerStatus==="no-answer"||providerStatus==="busy")&&!record.summary)await ingestCompletedVoiceCall({callSid,missionId,leadId,actionId,transcript:[],startedAt:record.startedAt,completedAt:record.completedAt||now});
  return NextResponse.json({ok:true,sid:callSid,status:providerStatus});
}
