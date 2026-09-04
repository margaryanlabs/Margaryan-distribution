function base64Url(input:string){return Buffer.from(input,"utf8").toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function base64UrlDecode(input:string){const padded=input.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((input.length+3)%4);return Buffer.from(padded,"base64").toString("utf8");}
function headerSafe(input:string){return input.replace(/[\r\n]+/g," ").trim();}

async function resolveAccessToken(){
  const clientId=process.env.GOOGLE_CLIENT_ID, clientSecret=process.env.GOOGLE_CLIENT_SECRET, refreshToken=process.env.GOOGLE_REFRESH_TOKEN;
  if(!clientId||!clientSecret||!refreshToken) throw new Error("Gmail OAuth is not configured");
  const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})});
  if(!res.ok) throw new Error(`Google OAuth refresh failed: ${res.status} ${await res.text()}`);
  const data=await res.json() as {access_token?:string}; if(!data.access_token) throw new Error("Google OAuth returned no access token"); return data.access_token;
}

export async function sendGmailMessage(args:{to:string;subject:string;body:string;replyToMessageId?:string;references?:string}){
  const token=await resolveAccessToken(); const from=process.env.GMAIL_SENDER_EMAIL;
  const headers=[...(from?[`From: ${headerSafe(from)}`]:[]),`To: ${headerSafe(args.to)}`,`Subject: ${headerSafe(args.subject)}`,"MIME-Version: 1.0","Content-Type: text/plain; charset=UTF-8",...(args.replyToMessageId?[`In-Reply-To: ${headerSafe(args.replyToMessageId)}`]:[]),...(args.references?[`References: ${headerSafe(args.references)}`]:[])];
  const raw=base64Url(`${headers.join("\r\n")}\r\n\r\n${args.body}`);
  const res=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({raw})});
  if(!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`); return res.json();
}

export async function listUnreadGmail(maxResults=20){
  const token=await resolveAccessToken();
  const list=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("is:unread newer_than:2d")}&maxResults=${maxResults}`,{headers:{Authorization:`Bearer ${token}`}});
  if(!list.ok) throw new Error(`Gmail list failed: ${list.status}`); const ids:Array<{id:string;threadId:string}>=(await list.json()).messages??[];
  return Promise.all(ids.map(async({id})=>{const res=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,{headers:{Authorization:`Bearer ${token}`}});if(!res.ok)throw new Error(`Gmail get failed: ${res.status}`);const msg=await res.json();const headers=Object.fromEntries((msg.payload?.headers??[]).map((h:{name:string;value:string})=>[h.name.toLowerCase(),h.value]));const findBody=(part:any):string=>{if(part?.mimeType==="text/plain"&&part?.body?.data)return base64UrlDecode(part.body.data);for(const child of part?.parts??[]){const hit=findBody(child);if(hit)return hit;}return "";};return{id:msg.id,threadId:msg.threadId,from:headers.from??"",subject:headers.subject??"",messageId:headers["message-id"]??"",text:findBody(msg.payload).slice(0,12000)||msg.snippet||""};}));
}
