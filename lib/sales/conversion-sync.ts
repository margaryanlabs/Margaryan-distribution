import { distributionStore } from "@/lib/store";

type BookingProviderResult={
  id?:unknown;
  htmlLink?:unknown;
  hangoutLink?:unknown;
  conferenceData?:{entryPoints?:Array<{entryPointType?:string;uri?:string}>};
};

export function syncBookedMeeting(args:{
  missionId:string;
  actionId:string;
  leadId?:string;
  payload:Record<string,unknown>;
  result:unknown;
}){
  if(typeof args.payload.meetingId!=="string"||!args.result||typeof args.result!=="object")return undefined;

  const data=args.result as BookingProviderResult;
  const meetLink=typeof data.hangoutLink==="string"
    ? data.hangoutLink
    : data.conferenceData?.entryPoints?.find(item=>item.entryPointType==="video")?.uri;

  const meeting=distributionStore.updateMeeting(args.payload.meetingId,{
    status:"booked",
    calendarEventId:typeof data.id==="string"?data.id:undefined,
    calendarHtmlLink:typeof data.htmlLink==="string"?data.htmlLink:undefined,
    meetLink,
    error:undefined
  });

  const leadId=args.leadId||meeting?.leadId;
  if(leadId){
    distributionStore.stopPendingLeadActions(leadId,"Cold outreach stopped after a verified meeting booking");
    distributionStore.updateLead(leadId,{
      stage:"meeting",
      nextAction:"prepare meeting",
      nextActionAt:meeting?.start
    });
  }

  const alreadyRecorded=distributionStore.listPerformance().some(event=>
    event.actionId===args.actionId&&Number(event.metrics.meetings||0)>0
  );
  if(!alreadyRecorded){
    distributionStore.addPerformance({
      missionId:args.missionId,
      actionId:args.actionId,
      channel:"calendar",
      source:"provider",
      metrics:{meetings:1},
      occurredAt:new Date().toISOString(),
      note:meeting?"Verified calendar booking: "+meeting.title:"Verified calendar booking"
    });
  }

  return meeting;
}
