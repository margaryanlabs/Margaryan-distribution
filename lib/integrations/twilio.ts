export async function startOutboundCall(args:{to:string;from:string;accountSid:string;authToken:string;twimlUrl:string;statusCallback?:string}){
  const body=new URLSearchParams({To:args.to,From:args.from,Url:args.twimlUrl,Method:"POST"});
  if(args.statusCallback){body.set("StatusCallback",args.statusCallback);body.set("StatusCallbackMethod","POST");for(const event of ["initiated","ringing","answered","completed"])body.append("StatusCallbackEvent",event);}
  const auth=Buffer.from(`${args.accountSid}:${args.authToken}`).toString("base64");
  const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${args.accountSid}/Calls.json`,{method:"POST",headers:{Authorization:`Basic ${auth}`,"Content-Type":"application/x-www-form-urlencoded"},body});
  if(!res.ok) throw new Error(`Twilio call failed: ${res.status} ${await res.text()}`); return res.json();
}
