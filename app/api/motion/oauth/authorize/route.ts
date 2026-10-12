import {randomBytes} from "node:crypto";
import {consentCsrfSignature,issueMotionOAuthCode,motionOAuthClientValid,
 normalizeScope,validateAuthorizationInput,MOTION_OAUTH_ISSUER} from "@/lib/motion/owner-oauth";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const hdr={"Cache-Control":"no-store, private","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
 "X-Content-Type-Options":"nosniff"};
type OAuthInputs={client_id:string;redirect_uri:string;response_type:string;code_challenge:string;
 code_challenge_method:string;scope:string;resource:string;state:string};
const fields=["client_id","redirect_uri","response_type","code_challenge","code_challenge_method","scope","resource","state"] as const;
const esc=(value:string)=>value.replace(/[&<>"']/g,ch=>({
 "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[ch]||ch));
const parse=(form:URLSearchParams):OAuthInputs=>Object.fromEntries(
 fields.map(key=>[key,form.get(key)||""])) as unknown as OAuthInputs;
const invalid=()=>new Response("Invalid or expired OAuth authorization request",{
 status:400,headers:hdr
});
async function verify(x:OAuthInputs){
 try{
  validateAuthorizationInput(x);
  if(!await motionOAuthClientValid(x.client_id,x.redirect_uri))return false;
  return true;
 }catch{return false;}
}
export async function GET(request:Request){
 const x=parse(new URL(request.url).searchParams);
 if(!await verify(x))return invalid();
 const nonce=randomBytes(24).toString("base64url");
 const proof=consentCsrfSignature(x.state,nonce);
 const fieldsHtml=fields.map(key=>'<input type="hidden" name="'+key+
   '" value="'+esc(x[key])+'">').join("");
 const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8">
 <meta name="viewport" content="width=device-width,initial-scale=1">
 <title>Authorize Margaryan Motion Studio</title>
 <style>body{font:16px system-ui;background:#08130f;color:#e6f5ea;display:grid;place-items:center;min-height:100vh;margin:0}
 main{max-width:500px;margin:22px;padding:34px;border:1px solid #4b8463;border-radius:20px;background:#102319}
 h1{font-size:32px;letter-spacing:-1px}p,li{line-height:1.5;color:#bfd0c4}
 button{border:0;background:#b7efd2;color:#102319;border-radius:8px;padding:17px 22px;font-weight:800;cursor:pointer}
 small{display:block;margin-top:20px;color:#84a590}</style></head><body><main>
 <div>◉ MARGARYAN LABS / MOTION STUDIO</div>
 <h1>Connect ChatGPT to your Motion Studio?</h1>
 <p>You are signed in as the Distribution operator. Approve this connection only if <strong>you</strong> initiated it.</p>
 <ul>${x.scope.includes("motion:read")?"<li>Read your Motion render job progress and MP4 status.</li>":""}
 ${x.scope.includes("motion:render")?"<li>Request paid Railway compute: one job at a time, maximum three daily.</li>":""}
 <li>Only the existing fixed Promptence cinema preset is currently supported.</li></ul>
 <p>Authorization does not approve the creative content for commercial use.</p>
 <form action="/api/motion/oauth/authorize" method="post">
 ${fieldsHtml}
 <input type="hidden" name="nonce" value="${esc(nonce)}">
 <input type="hidden" name="csrf" value="${esc(proof)}">
 <button type="submit" name="approve" value="yes">APPROVE CONNECTION ↗</button>
 </form><small>Protected by the Distribution operator login · PKCE S256 · short-lived access token</small>
 </main></body></html>`;
 return new Response(html,{status:200,headers:{...hdr,"Content-Type":"text/html;charset=utf-8",
  "Set-Cookie":"motion_oauth_nonce="+nonce+"; Path=/api/motion/oauth/authorize; HttpOnly; Secure; SameSite=Lax; Max-Age=600"
 }});
}
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin")||"";
  if(new URL(origin).origin!==MOTION_OAUTH_ISSUER)return invalid();
  if(request.headers.get("content-type")?.split(";")[0]?.trim()!=="application/x-www-form-urlencoded")
   return invalid();
  const text=await request.text();
  if(text.length>3000)return invalid();
  const body=new URLSearchParams(text),x=parse(body);
  if(body.get("approve")!=="yes"||!await verify(x))return invalid();
  const cookie=(request.headers.get("cookie")||"").split(";").map(x=>x.trim())
    .find(x=>x.startsWith("motion_oauth_nonce="))?.slice(19)||"";
  const nonce=body.get("nonce")||"",sig=body.get("csrf")||"";
  if(!cookie||cookie!==nonce||!validateCsrf(x.state,nonce,sig))return invalid();
  const scope=normalizeScope(x.scope);
  const code=await issueMotionOAuthCode({...x,scope});
  const redirect=new URL(x.redirect_uri);
  redirect.searchParams.set("code",code);
  redirect.searchParams.set("state",x.state);
  redirect.searchParams.set("iss",MOTION_OAUTH_ISSUER);
  return Response.redirect(redirect.href,302);
 }catch{return invalid();}
}
function validateCsrf(state:string,nonce:string,signature:string){
 try{
  const expected=consentCsrfSignature(state,nonce);
  if(signature.length!==expected.length)return false;
  const a=Buffer.from(signature),b=Buffer.from(expected);
  const {timingSafeEqual}=require("node:crypto") as typeof import("node:crypto");
  return nonce.length>=32&&timingSafeEqual(a,b);
 }catch{return false;}
}
