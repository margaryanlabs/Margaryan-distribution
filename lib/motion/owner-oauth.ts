import {createHash,randomBytes,timingSafeEqual,createHmac} from "node:crypto";
import {motionRenderDb} from "@/lib/motion/cloud-render-queue";
const ISSUER="https://distribution-web-production.up.railway.app";
export const MOTION_OWNER_RESOURCE=ISSUER+"/api/motion/mcp/owner";
export const MOTION_OAUTH_ISSUER=ISSUER;
export const MOTION_OWNER_SCOPES=["motion:read","motion:render","offline_access"] as const;
const TOKEN_TTL_SECONDS=3600;
const REFRESH_TTL_SECONDS=30*86400;
const MAX_CLIENTS=20;
declare global{var __motionOAuthSchema:Promise<void>|undefined;}
const digest=(s:string)=>createHash("sha256").update(s).digest("hex");
const entropy=()=>randomBytes(32).toString("base64url");
const equal=(a:string,b:string)=>{
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
};
const signingSecret=()=>{
 const s=process.env.MOTION_OWNER_OAUTH_SIGNING_SECRET||"";
 if(s.length<48)throw Error("MOTION_OAUTH_DISABLED");
 return s;
};
export async function motionOAuthDb(){
 signingSecret();
 const db=await motionRenderDb();
 if(!globalThis.__motionOAuthSchema){
  globalThis.__motionOAuthSchema=db.query(`
  create table if not exists motion_oauth_clients(
   client_id text primary key,
   redirect_uri text not null,
   created_at timestamptz not null default now()
  );
  create table if not exists motion_oauth_codes(
   code_hash text primary key,
   client_id text not null references motion_oauth_clients(client_id),
   redirect_uri text not null,
   challenge text not null,
   scope text not null,
   resource text not null,
   expires_at timestamptz not null,
   used_at timestamptz
  );
  create table if not exists motion_oauth_tokens(
   token_hash text primary key,
   client_id text not null references motion_oauth_clients(client_id),
   scope text not null,
   kind text not null check (kind in ('access','refresh')),
   expires_at timestamptz not null,
   revoked_at timestamptz
  );
  create index if not exists motion_oauth_tokens_expire on motion_oauth_tokens(expires_at);
  `).then(()=>undefined).catch(error=>{globalThis.__motionOAuthSchema=undefined;throw error;});
 }
 await globalThis.__motionOAuthSchema;
 return db;
}
export function safeOAuthRedirect(uri:string){
 try{
  const u=new URL(uri);
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.port)return false;
  if(!["chatgpt.com","chat.openai.com","platform.openai.com"].includes(u.hostname))return false;
  return /^\/(?:connector\/oauth\/|oauth\/|apps-manage\/oauth\/)/.test(u.pathname)&&u.pathname.length<240;
 }catch{return false;}
}
export function normalizeScope(scope:string){
 const list=scope.split(/\s+/).filter(Boolean);
 if(!list.length||list.some(s=>!MOTION_OWNER_SCOPES.includes(s as typeof MOTION_OWNER_SCOPES[number])))
  throw Error("invalid_scope");
 const unique=[...new Set(list)];
 // No token can start a render without also reading its state.
 if(unique.includes("motion:render")&&!unique.includes("motion:read"))
  throw Error("invalid_scope");
 return unique.join(" ");
}
export function createPkceChallenge(verifier:string){
 if(!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))throw Error("invalid_grant");
 return createHash("sha256").update(verifier).digest("base64url");
}
export function validateAuthorizationInput(input:{
 client_id:string;redirect_uri:string;response_type:string;code_challenge:string;
 code_challenge_method:string;scope:string;resource:string;state:string;
}){
 if(input.response_type!=="code"||input.code_challenge_method!=="S256"||
   !/^[A-Za-z0-9_-]{43,128}$/.test(input.code_challenge)||
   input.resource!==MOTION_OWNER_RESOURCE||!input.state||input.state.length>512||
   !safeOAuthRedirect(input.redirect_uri)||input.client_id.length<24||input.client_id.length>128)
  throw Error("invalid_request");
 return normalizeScope(input.scope);
}
export async function registerMotionOAuthClient(redirect_uri:string){
 if(!safeOAuthRedirect(redirect_uri))throw Error("invalid_redirect_uri");
 const db=await motionOAuthDb();
 const existing=await db.query<{count:string}>("select count(*)::text count from motion_oauth_clients");
 if(Number(existing.rows[0].count)>=MAX_CLIENTS)throw Error("registration_limit");
 const client_id="motion_"+entropy();
 await db.query("insert into motion_oauth_clients(client_id,redirect_uri) values($1,$2)",
  [client_id,redirect_uri]);
 return client_id;
}
export async function motionOAuthClientValid(id:string,redirect:string){
 const db=await motionOAuthDb();
 const r=await db.query("select 1 from motion_oauth_clients where client_id=$1 and redirect_uri=$2",
  [id,redirect]);
 return r.rowCount===1;
}
export async function issueMotionOAuthCode(input:{
 client_id:string;redirect_uri:string;code_challenge:string;scope:string;resource:string;
}){
 const db=await motionOAuthDb();
 if(!await motionOAuthClientValid(input.client_id,input.redirect_uri))throw Error("unauthorized_client");
 const code=entropy();
 await db.query(`insert into motion_oauth_codes
 (code_hash,client_id,redirect_uri,challenge,scope,resource,expires_at)
 values($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')`,
 [digest(code),input.client_id,input.redirect_uri,input.code_challenge,
  input.scope,input.resource]);
 return code;
}
async function issuePair(client:any,clientId:string,scope:string){
 const access=entropy(),refresh=entropy();
 const add=async(t:string,kind:string,seconds:number)=>{
  await client.query(`insert into motion_oauth_tokens
   (token_hash,client_id,scope,kind,expires_at)
   values($1,$2,$3,$4,now()+($5 || ' seconds')::interval)`,
   [digest(t),clientId,scope,kind,String(seconds)]);
 };
 await add(access,"access",TOKEN_TTL_SECONDS);
 await add(refresh,"refresh",REFRESH_TTL_SECONDS);
 return {
  access_token:access,token_type:"Bearer",expires_in:TOKEN_TTL_SECONDS,
  refresh_token:refresh,scope
 };
}
export async function exchangeMotionOAuthCode(input:{
 code:string;client_id:string;redirect_uri:string;code_verifier:string;resource:string;
}){
 if(input.resource!==MOTION_OWNER_RESOURCE)throw Error("invalid_target");
 const db=await motionOAuthDb();
 const c=await db.connect();
 try{
  await c.query("begin");
  const row=await c.query(`select * from motion_oauth_codes
   where code_hash=$1 and expires_at>now() and used_at is null for update`,[digest(input.code)]);
  const item=row.rows[0];
  if(!item||!equal(item.client_id,input.client_id)||item.redirect_uri!==input.redirect_uri||
     item.resource!==input.resource||
     !equal(item.challenge,createPkceChallenge(input.code_verifier)))
   throw Error("invalid_grant");
  const clients=await c.query("select 1 from motion_oauth_clients where client_id=$1 and redirect_uri=$2",
   [input.client_id,input.redirect_uri]);
  if(clients.rowCount!==1)throw Error("invalid_client");
  await c.query("update motion_oauth_codes set used_at=now() where code_hash=$1",[digest(input.code)]);
  const token=await issuePair(c,item.client_id,item.scope);
  await c.query("commit");
  return token;
 }catch(e){await c.query("rollback");throw e;}
 finally{c.release();}
}
export async function refreshMotionOAuthToken(input:{refresh_token:string;client_id:string}){
 const db=await motionOAuthDb(),c=await db.connect();
 try{
  await c.query("begin");
  const r=await c.query(`select * from motion_oauth_tokens
   where token_hash=$1 and client_id=$2 and kind='refresh'
    and expires_at>now() and revoked_at is null for update`,
   [digest(input.refresh_token),input.client_id]);
  if(r.rowCount!==1)throw Error("invalid_grant");
  await c.query("update motion_oauth_tokens set revoked_at=now() where token_hash=$1",
   [digest(input.refresh_token)]);
  const result=await issuePair(c,input.client_id,r.rows[0].scope);
  await c.query("commit");
  return result;
 }catch(e){await c.query("rollback");throw e;}
 finally{c.release();}
}
export async function verifyMotionOAuthAccess(auth:string|null,requestedScope="motion:read"){
 if(!auth?.startsWith("Bearer ")||auth.length>400)return false;
 const token=auth.slice(7);
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(token))return false;
 try{
  const db=await motionOAuthDb();
  const result=await db.query(`select scope from motion_oauth_tokens
    where token_hash=$1 and kind='access' and expires_at>now()
    and revoked_at is null limit 1`,[digest(token)]);
  return result.rows.length===1&&result.rows[0].scope.split(/\s+/).includes(requestedScope);
 }catch{return false;}
}
export function consentCsrfSignature(state:string,nonce:string){
 return createHmac("sha256",signingSecret()).update(state+"."+nonce).digest("base64url");
}
export function validConsentCsrf(state:string,nonce:string,signature:string){
 try{return nonce.length>=32&&equal(consentCsrfSignature(state,nonce),signature);}
 catch{return false;}
}
export function signedMotionShare(id:string,expires:number){
 const message=id+"."+expires;
 return createHmac("sha256",signingSecret()).update("download."+message).digest("base64url");
}
export function verifyMotionShare(id:string,expires:number,signature:string){
 if(!Number.isSafeInteger(expires)||expires<Date.now()/1000||expires>Date.now()/1000+610)return false;
 return !!signature&&equal(signedMotionShare(id,expires),signature);
}
