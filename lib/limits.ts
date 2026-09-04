import {distributionStore} from "@/lib/store";
import type {Channel,ActionKind} from "@/lib/types";

function max(name:string,fallback:number){const value=Number(process.env[name]||fallback);return Number.isFinite(value)&&value>=0?Math.floor(value):fallback;}
function dayKey(value:string){return value.slice(0,10);}

export function dailyLimitFor(channel:Channel,kind:ActionKind){
  if(channel==="email")return{limit:max("MAX_EMAILS_PER_DAY",40),label:"email sends"};
  if(channel==="voice")return{limit:max("MAX_CALLS_PER_DAY",20),label:"voice calls"};
  if(["x","linkedin","instagram"].includes(channel)&&kind==="publish_post")return{limit:max("MAX_SOCIAL_POSTS_PER_DAY",12),label:"social posts"};
  if(channel==="calendar"&&kind==="book_meeting")return{limit:max("MAX_MEETINGS_PER_DAY",20),label:"calendar bookings"};
  return undefined;
}

export function checkDailyExecutionLimit(channel:Channel,kind:ActionKind){
  const config=dailyLimitFor(channel,kind);if(!config)return{allowed:true,count:0};
  const today=new Date().toISOString().slice(0,10);const actions=distributionStore.listActions();
  const count=actions.filter(action=>action.status==="succeeded"&&Boolean(action.executedAt)&&dayKey(action.executedAt!)===today&&(channel==="email"?action.channel==="email":channel==="voice"?action.channel==="voice":["x","linkedin","instagram"].includes(channel)?["x","linkedin","instagram"].includes(action.channel)&&action.kind==="publish_post":action.channel==="calendar"&&action.kind==="book_meeting")).length;
  return{allowed:count<config.limit,count,limit:config.limit,reason:count>=config.limit?`Daily limit reached for ${config.label}: ${count}/${config.limit}`:undefined};
}
