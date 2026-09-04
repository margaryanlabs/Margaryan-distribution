import {NextResponse} from "next/server";
import {checkDailyExecutionLimit} from "@/lib/limits";
import {distributionStore} from "@/lib/store";

export function GET(){
  const actions=distributionStore.listActions();
  const limits={email:checkDailyExecutionLimit("email","send_email"),voice:checkDailyExecutionLimit("voice","call"),social:checkDailyExecutionLimit("x","publish_post"),calendar:checkDailyExecutionLimit("calendar","book_meeting")};
  return NextResponse.json({limits,retries:actions.filter(x=>x.status==="queued"&&x.retryCount>0),blocked:actions.filter(x=>x.status==="blocked"),deadLetters:actions.filter(x=>x.status==="dead_letter"),failed:actions.filter(x=>x.status==="failed")});
}
