import {NextResponse} from "next/server";
import {parseMotionCommission,motionCommissionText} from "@/lib/motion/commission";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const responseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const ready=()=>Boolean(
 process.env.MOTION_SALES_INBOX&&process.env.MOTION_SALES_SENDER&&
 process.env.RESEND_API_KEY&&process.env.TURNSTILE_SECRET_KEY&&
 process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
);
/** Only public readiness flags, no seller email, private provider config or API tokens. */
export async function GET(){
 return NextResponse.json({
   accepting:ready(),siteKey:ready()?process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY:null,
   mode:ready()?"reviewed-email-delivery":"local-brief-only",
   note:"No automatic payment, contract or promise of a booked project."
 },{headers:responseHeaders});
}
function hostMatches(req:Request,hostname:string){
 try{
   const target=new URL(req.url);
   const origin=req.headers.get("origin");
   const parsed=origin?new URL(origin):null;
   if(target.protocol!=="https:"&&process.env.NODE_ENV==="production")return false;
   return !!parsed&&parsed.host===target.host&&
     (parsed.protocol==="https:"||process.env.NODE_ENV!=="production")&&
     hostname===target.hostname;
 }catch{return false;}
}
export async function POST(request:Request){
 if(!ready())return NextResponse.json({
   error:"Commercial contact delivery has not been configured. Save your brief locally."
 },{status:503,headers:responseHeaders});
 try{
   const origin=request.headers.get("origin");
   if(!origin||new URL(origin).host!==new URL(request.url).host)
     return NextResponse.json({error:"Same-origin request required."},{status:403,headers:responseHeaders});
   const size=Number(request.headers.get("content-length")||0);
   if(size>9_000)return NextResponse.json({error:"Brief exceeds 9KB."},{status:413,headers:responseHeaders});
   const raw=await request.text();
   if(raw.length>9_000)return NextResponse.json({error:"Brief too large."},{status:413,headers:responseHeaders});
   const body=JSON.parse(raw) as Record<string,unknown>;
   // Reject bot-filled hidden field, do not tell a bot how to bypass.
   if(body.companyFax)return NextResponse.json({accepted:true,delivery:"review-only"},{status:202,headers:responseHeaders});
   const brief=parseMotionCommission(body);
   const token=typeof body.captcha==="string"?body.captcha.slice(0,2600):"";
   if(!token)return NextResponse.json({error:"Complete the anti-spam verification."},{status:400,headers:responseHeaders});
   const verification=new URLSearchParams({
     secret:process.env.TURNSTILE_SECRET_KEY!,response:token
   });
   const challenge=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
     method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
     body:verification.toString(),cache:"no-store",signal:AbortSignal.timeout(8_000)
   });
   if(!challenge.ok)throw Error("Verification service unavailable");
   const proof=await challenge.json() as {success?:boolean;hostname?:string;action?:string};
   if(!proof.success||proof.action!=="motion_inquiry"||
      !proof.hostname||!hostMatches(request,proof.hostname))
     return NextResponse.json({error:"Anti-spam check could not be verified. Refresh and retry."},{status:403,headers:responseHeaders});

   const sender=process.env.MOTION_SALES_SENDER!;
   const inbox=process.env.MOTION_SALES_INBOX!;
   // Inbound sender identity must be verified by the mail service.
   if(!/^[^\r\n<>]+@[^\s@\r\n<>]+\.[^\s@\r\n<>]+$/.test(sender)||
      !/^[^\r\n<>]+@[^\s@\r\n<>]+\.[^\s@\r\n<>]+$/.test(inbox))
     throw Error("Invalid commercial mail configuration");

   const outbound=await fetch("https://api.resend.com/emails",{
     method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,
       "Content-Type":"application/json"},
     body:JSON.stringify({
       from:sender,to:[inbox],reply_to:brief.email,
       subject:"Motion Studio inquiry / "+brief.company.replace(/[\r\n]/g," "),
       text:motionCommissionText(brief)
     }),cache:"no-store",signal:AbortSignal.timeout(10_000)
   });
   if(!outbound.ok){
     // Do not expose provider response headers, secrets, domain checks or PII.
     throw Error("Commercial mail provider did not accept the message");
   }
   const receipt=await outbound.json() as {id?:string};
   if(!receipt.id)throw Error("Delivery provider returned no confirmation");
   return NextResponse.json({
     accepted:true,delivery:"provider-accepted",
     note:"Your request was passed to our delivery provider; this is not a confirmed booking."
   },{status:202,headers:responseHeaders});
 }catch(error){
   const message=error instanceof Error?error.message:"Unable to process inquiry";
   const validation=/Enter your|Add your|Select a|Choose a|Consent is|Complete the/.test(message);
   return NextResponse.json({error:validation?message:
     "Unable to submit this brief. Save a local copy and try again later."},{
       status:validation?400:503,headers:responseHeaders});
 }
}
