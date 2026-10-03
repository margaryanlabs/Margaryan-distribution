import { NextResponse } from "next/server";
import { isLiveExecutionEnabled } from "@/lib/integrations";
import { storageRuntime } from "@/lib/store/checkpoint";

export function GET(){
 const googleOAuthReady=Boolean(process.env.GOOGLE_ACCESS_TOKEN||process.env.GMAIL_ACCESS_TOKEN||(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REFRESH_TOKEN));
 const voiceReady=Boolean(process.env.OPENAI_API_KEY&&process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER&&process.env.VOICE_GATEWAY_WSS_URL&&(process.env.VOICE_CALLBACK_SECRET||process.env.WORKER_SECRET));
 const calendarReady=Boolean(googleOAuthReady&&process.env.GOOGLE_CALENDAR_ID);
 const operatorAuthReady=Boolean(process.env.DISTRIBUTION_BASIC_USER&&process.env.DISTRIBUTION_BASIC_PASSWORD);
 const runtime=storageRuntime();
 return NextResponse.json({
  executionEnabled:isLiveExecutionEnabled(),
  runtime,
  security:{operatorAuthConfigured:operatorAuthReady},
  automation:{portfolioCronConfigured:Boolean(process.env.CRON_SECRET),workerConfigured:Boolean(process.env.WORKER_SECRET||process.env.AUTOPILOT_SECRET)},
  launchRequirements:[
   {id:"auth",name:"Operator authentication",configured:operatorAuthReady,required:true,variables:["DISTRIBUTION_BASIC_USER","DISTRIBUTION_BASIC_PASSWORD"],why:"Protect prospect, inbox and revenue data before activating providers."},
   {id:"storage",name:"Durable CRM",configured:runtime.durable,required:true,variables:["DISTRIBUTION_DATABASE_URL"],why:"Preserve leads, approvals, replies and revenue across serverless restarts."},
   {id:"openai",name:"AI research runtime",configured:Boolean(process.env.OPENAI_API_KEY),required:true,variables:["OPENAI_API_KEY"],why:"Research ICP accounts, classify replies and prepare evidence-led copy."},
   {id:"gmail",name:"Gmail sales inbox",configured:googleOAuthReady,required:true,variables:["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GMAIL_SENDER_EMAIL"],why:"Send approved outreach and ingest verified replies from known CRM leads."},
   {id:"calendar",name:"Google Calendar",configured:calendarReady,required:false,variables:["GOOGLE_CALENDAR_ID"],why:"Check availability and book qualified meetings with Google Meet."},
   {id:"worker",name:"Worker cadence",configured:Boolean(process.env.WORKER_SECRET||process.env.AUTOPILOT_SECRET),required:true,variables:["WORKER_SECRET"],why:"Run controlled research, inbox and follow-up passes on a machine-authenticated cadence."},
   {id:"live",name:"Live execution",configured:isLiveExecutionEnabled(),required:false,variables:["EXECUTION_ENABLED=true"],why:"Keep false during shadow/assisted mode; enable only after the first reviewed cohort."}
  ],
  providers:[
   {id:"openai",name:"OpenAI",configured:Boolean(process.env.OPENAI_API_KEY),capability:"planning + content + summaries + realtime voice"},
   {id:"gmail",name:"Gmail",configured:googleOAuthReady,capability:"email outreach + inbox"},
   {id:"calendar",name:"Google Calendar",configured:calendarReady,capability:"free/busy + attendee invites + Google Meet booking"},
   {id:"x",name:"X",configured:Boolean(process.env.X_USER_ACCESS_TOKEN),capability:"publishing + threads"},
   {id:"linkedin",name:"LinkedIn",configured:Boolean(process.env.LINKEDIN_ACCESS_TOKEN&&process.env.LINKEDIN_AUTHOR_URN),capability:"approved publishing"},
   {id:"instagram",name:"Instagram",configured:Boolean(process.env.META_ACCESS_TOKEN&&process.env.INSTAGRAM_USER_ID),capability:"professional publishing"},
   {id:"twilio",name:"Voice Sales Stack",configured:voiceReady,capability:"Twilio outbound + realtime AI + transcript callback + CRM summary"}
  ]
 });
}
