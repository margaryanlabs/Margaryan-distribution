import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readSelfHostedTelemetry, readScalarVector, trustedMetricsOrigin} from "../../lib/cloud/telemetry.ts";
const payload=n=>({status:"success",data:{resultType:"vector",result:[{value:[1234,String(n)]}]}});
test("Unconfigured self-hosted telemetry performs no requests",async()=>{
 let calls=0;const output=await readSelfHostedTelemetry({},async()=>{calls++;throw Error("No fetch");});
 assert.equal(calls,0);assert.equal(output.mode,"setup");
 assert.equal(output.metrics.every(x=>x.value===null),true);
});
test("Prometheus URL is HTTPS-only except localhost, with no userinfo or paths",()=>{
 for(const u of ["http://production.internal","https://user:secret@host.example","https://host.example/api",
  "https://host.example?key=yes","file:///etc/passwd"]){
  assert.equal(trustedMetricsOrigin(u),null,u);
 }
 assert.equal(trustedMetricsOrigin("http://localhost:9090"),"http://localhost:9090");
 assert.equal(trustedMetricsOrigin("https://monitor.example"),"https://monitor.example");
});
test("Prometheus accepts only finite nonnegative single-item vectors",()=>{
 assert.equal(readScalarVector(payload(53)),53);
 assert.equal(readScalarVector(payload(Infinity)),null);
 assert.equal(readScalarVector({status:"success",data:{resultType:"vector",result:[]}}),null);
 assert.equal(readScalarVector({status:"success",data:{resultType:"vector",result:[{value:[1,"-5"]}]}}),null);
});
test("Metrics calls use fixed read-only queries and never echo credentials",async()=>{
 const seen=[];
 const fake=async(u,o)=>{
  seen.push(u.searchParams.get("query"));
  assert.equal(u.pathname,"/api/v1/query");
  assert.equal(o.method,"GET");assert.equal(o.redirect,"error");
  assert.equal(o.headers.Authorization,"Bearer PRIVATE_TOKEN");
  assert.equal(o.cache,"no-store");
  return new Response(JSON.stringify(payload(3)),{status:200});
 };
 const output=await readSelfHostedTelemetry({CLOUD_PROMETHEUS_URL:"https://metrics.example",
  CLOUD_PROMETHEUS_TOKEN:"PRIVATE_TOKEN"},fake);
 assert.equal(output.mode,"connected");assert.equal(output.metrics.length,3);
 assert.equal(output.metrics[0].value,3);
 assert.deepEqual(seen.sort(),["count(up)","sum(up)","prometheus_tsdb_head_series"].sort());
 assert.doesNotMatch(JSON.stringify(output),/PRIVATE_TOKEN|metrics.example/);
});
test("Partial metric responses never become success or fake zeros",async()=>{
 const fake=async u=>u.searchParams.get("query")==="count(up)"?
  new Response(JSON.stringify(payload(10)),{status:200}):new Response("Unavailable",{status:503});
 const output=await readSelfHostedTelemetry({CLOUD_PROMETHEUS_URL:"https://metrics.example"},fake);
 assert.equal(output.mode,"degraded");assert.equal(output.metrics[0].value,10);assert.equal(output.metrics[1].value,null);
});
test("Nested telemetry API applies additional owner-only authentication",()=>{
 const src=readFileSync(new URL("../../app/api/cloud/telemetry/route.ts",import.meta.url),"utf8");
 const proxy=readFileSync(new URL("../../proxy.ts",import.meta.url),"utf8");
 assert.match(src,/cloudOperatorAccess\(request\.headers,process\.env\)/);
 assert.match(src,/access!=="allow"/);
 assert.match(src,/export async function GET/);
 assert.doesNotMatch(src,/export async function (POST|PUT|PATCH|DELETE)/);
 assert.ok(proxy.includes('path.startsWith("/api/cloud/")'));
});
