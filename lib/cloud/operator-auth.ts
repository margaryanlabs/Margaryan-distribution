import {createHash,timingSafeEqual} from "node:crypto";

/** Defense in depth beyond proxy.ts for every Cloud API handler.
 * Node runtime only. Never accept credentials from query params/cookies.
 */
type AuthResult="allow"|"denied"|"unconfigured";
const digest=(value:string)=>createHash("sha256").update(value,"utf8").digest();
const equal=(actual:string,expected:string)=>timingSafeEqual(digest(actual),digest(expected));
export function cloudOperatorAccess(
 headers:Headers,env:Record<string,string|undefined>
):AuthResult{
 const expectedUser=env.DISTRIBUTION_BASIC_USER;
 const expectedPassword=env.DISTRIBUTION_BASIC_PASSWORD;
 if(!expectedUser||!expectedPassword)return "unconfigured";
 const raw=headers.get("authorization")||"";
 if(!raw.startsWith("Basic ")||raw.length>8192)return "denied";
 const encoded=raw.slice(6).trim();
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return "denied";
 try{
  const decoded=Buffer.from(encoded,"base64").toString("utf8");
  const separator=decoded.indexOf(":");
  if(separator<=0)return "denied";
  const username=decoded.slice(0,separator);
  const password=decoded.slice(separator+1);
  return equal(username,expectedUser)&&equal(password,expectedPassword)?"allow":"denied";
 }catch{return "denied";}
}
