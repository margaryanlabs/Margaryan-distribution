import {distributionStore} from "@/lib/store";
import {queryGoogleCalendarFreeBusy} from "@/lib/integrations/google-calendar";
import type {MeetingRecord,PlannedAction} from "@/lib/types";

function validIso(value:string){const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toISOString():undefined;}
function overlaps(start:string,end:string,busy:Array<{start:string;end:string}>){const a=Date.parse(start),b=Date.parse(end);return busy.some(slot=>Math.max(a,Date.parse(slot.start))<Math.min(b,Date.parse(slot.end)));}

export function proposeMeeting(args:{missionId:string;leadId:string;start:string;end?:string;timezone?:string;sourceCallSid?:string;title?:string;notes?:string}){
  const lead=distributionStore.getLead(args.leadId);if(!lead)throw new Error("Lead not found");if(!lead.email)throw new Error("Lead needs an email before a calendar invite can be proposed");
  const start=validIso(args.start);if(!start)throw new Error("Meeting start must be a valid date-time");
  const end=validIso(args.end||new Date(Date.parse(start)+30*60000).toISOString());if(!end||Date.parse(end)<=Date.parse(start))throw new Error("Meeting end must be after start");
  if(Date.parse(end)-Date.parse(start)>4*3600000)throw new Error("Meeting duration cannot exceed 4 hours");
  const timezone=args.timezone||lead.timezone||process.env.DEFAULT_TIMEZONE||"UTC";
  return distributionStore.addMeeting({missionId:args.missionId,leadId:lead.id,sourceCallSid:args.sourceCallSid,title:args.title||`Demo / conversation — ${lead.company}`,attendeeEmail:lead.email,attendeeName:lead.contactName,start,end,timezone,status:"proposed",availabilityVerified:false,notes:args.notes});
}

export async function verifyAndQueueMeeting(meetingId:string){
  const meeting=distributionStore.getMeeting(meetingId);if(!meeting)throw new Error("Meeting not found");if(meeting.status==="booked")return{meeting,queued:[],alreadyBooked:true};
  if(!process.env.GOOGLE_CLIENT_ID&&!process.env.GOOGLE_ACCESS_TOKEN&&!process.env.GMAIL_ACCESS_TOKEN)throw new Error("Google Calendar OAuth is not configured; availability cannot be verified");
  const result=await queryGoogleCalendarFreeBusy({timeMin:meeting.start,timeMax:meeting.end,calendarId:meeting.calendarId||process.env.GOOGLE_CALENDAR_ID||"primary"});
  const available=!overlaps(meeting.start,meeting.end,result.busy);const checkedAt=new Date().toISOString();
  if(!available){const updated=distributionStore.updateMeeting(meeting.id,{status:"proposed",availabilityVerified:false,availabilityCheckedAt:checkedAt,error:"Requested slot is busy"});return{meeting:updated,available:false,busy:result.busy,queued:[]};}
  const updated=distributionStore.updateMeeting(meeting.id,{status:"availability_checked",availabilityVerified:true,availabilityCheckedAt:checkedAt,calendarId:result.calendarId,error:undefined});
  const existing=distributionStore.listActions().find(action=>action.payload.meetingId===meeting.id&&action.kind==="book_meeting"&&!["failed","rejected"].includes(action.status));if(existing)return{meeting:updated,available:true,queued:[existing],existing:true};
  const action:PlannedAction={id:`book-meeting-${meeting.id}`,channel:"calendar",kind:"book_meeting",objective:`Book meeting — ${meeting.title}`,rationale:"Slot was verified free in Google Calendar; final booking remains human-approved",mode:"APPROVE",scheduledOffsetHours:0,payload:{meetingId:meeting.id,leadId:meeting.leadId,title:meeting.title,start:meeting.start,end:meeting.end,timezone:meeting.timezone,attendeeEmail:meeting.attendeeEmail,calendarId:result.calendarId,availabilityVerified:true,availabilityCheckedAt:checkedAt,createMeet:true,description:meeting.notes||"Scheduled by Margaryan Distribution after an explicit sales conversation."}};
  const queued=distributionStore.enqueueActions(meeting.missionId,[action]);return{meeting:updated,available:true,busy:result.busy,queued};
}
