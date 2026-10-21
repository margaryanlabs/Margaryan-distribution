import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getProviderOverview,readProvider} from "../../lib/cloud/providers.ts";
const ok=(payload)=>new Response(JSON.stringify(payload),{status:200,headers:{"Content-Type":"application/json"}});
test("Without configured tokens, no network calls and explicit setup state",async()=>{
 let requests=0;
 const noFetch=async()=>{requests++;throw Error("Must not fetch");};
 const result=await getProviderOverview({},noFetch);
 assert.equal(requests,0);
 assert.deepEqual(result.providers.map(p=>p.state),["not_configured","not_configured","not_configured"]);
 assert.equal(result.providers.every(p=>p.resources.length===0),true);
});
test("Vercel fixed HTTPS GET, bearer token only server-side and safe projection",async()=>{
 let calls=0;
 const fake=async(url,config)=>{
  calls++;
  assert.match(String(url),/^https:\/\/api\.vercel\.com\/v9\/projects\?limit=100/);
  assert.equal(config.method,"GET");
  assert.equal(config.redirect,"error");
  assert.equal(config.cache,"no-store");
  assert.equal(config.headers.Authorization,"Bearer VERCEL_SECRET_VALUE");
  return ok({projects:[{id:"p1",name:"Promptence",framework:"nextjs",env:{PASSWORD:"LEAK"}}]});
 };
 const result=await readProvider("vercel",{token:"VERCEL_SECRET_VALUE"},fake);
 assert.equal(calls,1);
 assert.equal(result.state,"connected");
 assert.equal(result.resources[0].name,"Promptence");
 assert.doesNotMatch(JSON.stringify(result),/LEAK|VERCEL_SECRET_VALUE/);
});
test("Railway uses fixed read-only GraphQL with no arbitrary query inputs",async()=>{
 const fake=async(url,config)=>{
  assert.equal(url,"https://backboard.railway.com/graphql/v2");
  assert.equal(config.method,"POST");
  assert.equal(config.headers.Authorization,"Bearer SECRET_RAILWAY");
  const body=JSON.parse(config.body);
  assert.match(body.query,/MarkarianProjects/);
  assert.doesNotMatch(body.query,/mutation|environmentVariables|serviceDelete/i);
  return ok({data:{projects:{edges:[{node:{id:"id1",name:"VETO"}}],pageInfo:{hasNextPage:false}}}});
 };
 const result=await readProvider("railway",{token:"SECRET_RAILWAY"},fake);
 assert.equal(result.state,"connected");
 assert.equal(result.resources[0].name,"VETO");
 assert.doesNotMatch(JSON.stringify(result),/SECRET_RAILWAY/);
});
test("Supabase uses exact projects endpoint, masks sensitive upstream fields",async()=>{
 const fake=async(url,config)=>{
  assert.equal(url,"https://api.supabase.com/v1/projects");
  assert.equal(config.method,"GET");
  return ok([{id:"db-1",name:"RAIOS",region:"eu-central-1",status:"ACTIVE_HEALTHY",connectionString:"TOP_SECRET"}]);
 };
 const result=await readProvider("supabase",{token:"SUPA_TOKEN"},fake);
 assert.equal(result.state,"connected");
 assert.equal(result.resources[0].status,"ACTIVE_HEALTHY");
 assert.doesNotMatch(JSON.stringify(result),/TOP_SECRET|SUPA_TOKEN/);
});
test("Provider 401/invalid body gives safe error and no leaked response",async()=>{
 const err=await readProvider("vercel",{token:"PRIVATE_TOKEN"},async()=>new Response("token PRIVATE_TOKEN",{status:401}));
 assert.equal(err.state,"error");assert.match(err.notice,/401/);
 assert.doesNotMatch(JSON.stringify(err),/PRIVATE_TOKEN/);
 const error=await readProvider("railway",{token:"PRIVATE_TOKEN"},async()=>ok({errors:[{message:"PRIVATE_TOKEN leaked"}]}));
 assert.equal(error.state,"error");
 assert.doesNotMatch(JSON.stringify(error),/PRIVATE_TOKEN/);
});
test("Invalid Vercel team configuration is rejected before network call",async()=>{
 let calls=0;
 const result=await readProvider("vercel",{token:"a",teamId:"https://evil.com/"},async()=>{calls++;throw Error("bad");});
 assert.equal(calls,0);
 assert.equal(result.state,"error");
});
test("Server route and proxy restrict provider inventory to operator",()=>{
 const src=readFileSync(new URL("../../app/api/cloud/providers/route.ts",import.meta.url),"utf8");
 const proxy=readFileSync(new URL("../../proxy.ts",import.meta.url),"utf8");
 assert.match(src,/export async function GET/);
 assert.doesNotMatch(src,/export async function (POST|PATCH|DELETE|PUT)/);
 assert.match(proxy,/path\.startsWith\("\/api\/cloud\/"\)/);
 assert.match(proxy,/!operatorAuthConfigured/);
});
