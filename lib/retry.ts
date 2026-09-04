export function classifyExecutionError(message:string){
  const text=message.toLowerCase();
  const transient=/\b429\b|\b5\d\d\b|timeout|timed out|temporar|network|fetch failed|econnreset|econnrefused|socket|rate limit|too many requests|service unavailable|gateway/.test(text);
  const permanent=/\b400\b|\b401\b|\b403\b|\b404\b|invalid|unauthoriz|forbidden|opt.?out|do.?not.?call|jurisdiction|availability/.test(text);
  return{transient:transient&&!permanent,permanent};
}

export function nextRetry(retryCount:number){
  const maxRetries=Math.max(0,Math.min(8,Number(process.env.MAX_ACTION_RETRIES||3)));
  const nextCount=retryCount+1;if(nextCount>maxRetries)return{retry:false,nextCount,delayMs:0};
  const baseMinutes=Math.max(1,Number(process.env.RETRY_BASE_MINUTES||5));const delayMs=Math.min(6*3600000,baseMinutes*60000*Math.pow(2,Math.max(0,nextCount-1)));
  return{retry:true,nextCount,delayMs};
}
