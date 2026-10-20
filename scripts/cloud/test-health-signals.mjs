import test from "node:test";
import assert from "node:assert/strict";
import {allowedClickHouseOrigin,readClickHouseStatus} from "../../lib/cloud/clickhouse.ts";
import {healthSignals,domainRecords} from "../../lib/cloud/health-signals.ts";
const base={mode:"connected",applications:[],servers:[],deployments:[],projects:[],errors:[],
 sources:{applications:true,servers:true,deployments:true,projects:true}};
test("ClickHouse connector does no network call before setup",async()=>{
 let calls=0;
 const result=await readClickHouseStatus({},async()=>{calls++;throw Error("should not call");});
 assert.equal(result.state,"setup");assert.equal(calls,0);
});
test("Untrusted ClickHouse origins are rejected",()=>{
 for(const url of ["http://clickhouse.example","https://user:key@click.example","https://click.example/path",
 "https://click.example?secret=x","file:///etc/passwd"])assert.equal(allowedClickHouseOrigin(url),null,url);
 assert.equal(allowedClickHouseOrigin("https://click.example"),"https://click.example");
 assert.equal(allowedClickHouseOrigin("http://localhost:8123"),"http://localhost:8123");
});
test("ClickHouse uses one fixed readonly SQL and removes raw data and passwords",async()=>{
 let n=0;
 const fake=async(url,opts)=>{
  n++;assert.equal(opts.method,"POST");assert.equal(opts.redirect,"error");assert.equal(url.searchParams.get("readonly"),"1");
  assert.equal(opts.headers["X-ClickHouse-Key"],"PRIVATE_PASSWORD");
  assert.equal(opts.body,"SELECT version() AS version, uptime() AS uptime_seconds FORMAT JSON");
  return new Response(JSON.stringify({data:[{version:"25.10.1",uptime_seconds:720,secret:"EXPOSE_ME"}]}),{status:200});
 };
 const status=await readClickHouseStatus({CLOUD_CLICKHOUSE_URL:"https://click.example",CLOUD_CLICKHOUSE_USER:"reader",
  CLOUD_CLICKHOUSE_PASSWORD:"PRIVATE_PASSWORD"},fake);
 assert.equal(status.state,"connected");assert.equal(status.uptimeSeconds,720);
 assert.equal(n,1);assert.doesNotMatch(JSON.stringify(status),/PRIVATE_PASSWORD|EXPOSE_ME|click.example/);
});
test("ClickHouse errors have no raw upstream body or secrets",async()=>{
 const error=await readClickHouseStatus({CLOUD_CLICKHOUSE_URL:"https://click.example",CLOUD_CLICKHOUSE_USER:"readonly",
 CLOUD_CLICKHOUSE_PASSWORD:"TOP_SECRET"},async()=>new Response("TOP_SECRET",{status:500}));
 assert.equal(error.state,"error");assert.doesNotMatch(JSON.stringify(error),/TOP_SECRET/);
});
test("Application statuses never equate planned or unknown with running",()=>{
 const input={...base,applications:[
  {uuid:"a",name:"Real",status:"running",domain:"",gitRepository:"",gitBranch:"",updatedAt:""},
  {uuid:"b",name:"Issue",status:"unhealthy",domain:"",gitRepository:"",gitBranch:"",updatedAt:""},
  {uuid:"c",name:"Unknown",status:"pending",domain:"",gitRepository:"",gitBranch:"",updatedAt:""}
 ]};
 const r=healthSignals(input);
 assert.equal(r.online,1);assert.equal(r.attention,1);assert.equal(r.unknown,1);
 assert.equal(r.signals[0].severity,"critical");
});
test("Unavailable sources are unknown, not zero",()=>{
 const r=healthSignals({...base,mode:"setup",sources:{applications:false,servers:false,deployments:false,projects:false}});
 assert.equal(r.observed,null);assert.ok(r.signals.some(x=>x.id==="source:setup"));
});
test("Domains are explicitly configuration metadata, not SSL verification",()=>{
 const r=domainRecords({...base,applications:[{uuid:"a",name:"App",status:"running",gitRepository:"",gitBranch:"",updatedAt:"",
  domain:"https://one.example.com,http://two.example.com"}]});
 assert.equal(r.length,2);assert.equal(r[0].configured,true);
 assert.equal(r[0].host,"one.example.com");
});
