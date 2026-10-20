import test from "node:test";import assert from "node:assert/strict";
import {domainInputErrors,domainConnectPlan} from "../../lib/cloud/domain-plan.ts";
const input={hostname:"app.example.com",ipv4:"203.0.113.10",project:"staging-app"};
test("Domain planning is review-only with safe DNS record metadata",()=>{
 const plan=domainConnectPlan(input);
 assert.equal(plan.execution,"review-only");
 assert.equal(plan.dns.type,"A");assert.equal(plan.dns.host,"app.example.com");
 assert.ok(plan.checks.some(s=>s.includes("TLS")));
});
test("Invalid hosts and private IPv4 are rejected",()=>{
 for(const hostname of ["http://example.com","localhost","example.com/path","EXAMPLE.COM:443"])
  assert.ok(domainInputErrors({...input,hostname}).length>0,hostname);
 for(const ipv4 of ["127.0.0.1","10.3.1.1","192.168.10.10","172.16.4.1","999.0.0.1","1.2.3"])
  assert.ok(domainInputErrors({...input,ipv4}).length>0,ipv4);
});
test("No DNS writes are part of the domain plan",()=>{
 const text=JSON.stringify(domainConnectPlan(input));
 assert.doesNotMatch(text,/secret|access_token|apiKey/);
 assert.match(text,/review-only/);
});
