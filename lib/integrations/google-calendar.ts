import crypto from "node:crypto";
import {resolveGoogleAccessToken} from "./google-oauth";

export async function queryGoogleCalendarFreeBusy(args:{timeMin:string;timeMax:string;calendarId?:string}){
  const token=await resolveGoogleAccessToken();const calendarId=args.calendarId||process.env.GOOGLE_CALENDAR_ID||"primary";
  const res=await fetch("https://www.googleapis.com/calendar/v3/freeBusy",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({timeMin:args.timeMin,timeMax:args.timeMax,items:[{id:calendarId}]})});
  if(!res.ok)throw new Error(`Google Calendar free/busy failed: ${res.status} ${await res.text()}`);
  const data=await res.json() as{calendars?:Record<string,{busy?:Array<{start:string;end:string}>;errors?:unknown[]}>};const calendar=data.calendars?.[calendarId];
  if(calendar?.errors?.length)throw new Error(`Google Calendar free/busy returned calendar errors: ${JSON.stringify(calendar.errors)}`);
  return{calendarId,busy:calendar?.busy||[]};
}

export async function createGoogleCalendarEvent(args:{calendarId?:string;summary:string;description?:string;start:string;end:string;timeZone:string;attendeeEmails:string[];createMeet?:boolean}){
  const token=await resolveGoogleAccessToken();const calendarId=args.calendarId||process.env.GOOGLE_CALENDAR_ID||"primary";
  const query=new URLSearchParams({sendUpdates:"all"});
  const body:Record<string,unknown>={summary:args.summary,description:args.description||"",start:{dateTime:args.start,timeZone:args.timeZone},end:{dateTime:args.end,timeZone:args.timeZone},attendees:args.attendeeEmails.filter(Boolean).map(email=>({email})),reminders:{useDefault:true}};
  if(args.createMeet!==false){query.set("conferenceDataVersion","1");body.conferenceData={createRequest:{requestId:crypto.randomUUID().replace(/-/g,"").slice(0,32),conferenceSolutionKey:{type:"hangoutsMeet"}}};}
  const res=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${query.toString()}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!res.ok)throw new Error(`Google Calendar event insert failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{id?:string;htmlLink?:string;hangoutLink?:string;status?:string;conferenceData?:{entryPoints?:Array<{entryPointType?:string;uri?:string}>}}>;
}
