#!/usr/bin/env node
import assert from "node:assert/strict";
import {parseMotionCommission,motionCommissionText,MOTION_OFFERS,MOTION_BUDGETS}
  from "../../lib/motion/commission.ts";

const clean={
 name:"Example Client",email:"contact@example.org",company:"Example Software",
 website:"https://example.org/products?affiliate=123#section",
 offer:"product",format:"portrait",goal:"Explain a software product",
 audience:"Potential buyers",budget:"Not sure yet",timeline:"To be agreed",
 brief:"We want real software interfaces, edited clearly for a qualified buyer.",
 assets:"We own these recordings",consent:true
};
const p=parseMotionCommission(clean);
assert.equal(p.offer,"product");assert.equal(p.website,"https://example.org/products");
assert.ok(motionCommissionText(p).includes("No guaranteed sales"));
assert.ok(motionCommissionText(p).includes("Product Story"));
assert.equal(MOTION_OFFERS.length,3);
assert.ok(MOTION_BUDGETS.includes("Not sure yet"));
assert.equal(parseMotionCommission({...clean,consent:false},false).consent,false,
  "Local creation must not require permission to contact");
assert.throws(()=>parseMotionCommission({...clean,consent:false}),/Consent/);
assert.throws(()=>parseMotionCommission({...clean,offer:"unlimited"}),/Select a valid/);
assert.throws(()=>parseMotionCommission({...clean,format:"6:9"}),/Select a valid/);
assert.throws(()=>parseMotionCommission({...clean,brief:"too short"}),/Add your company/);
assert.throws(()=>parseMotionCommission({...clean,email:"newline@example.org\nBCC:fraud"}),/valid contact/);
assert.equal(parseMotionCommission({...clean,website:"javascript:alert(1)"}).website,"");
assert.equal(parseMotionCommission({...clean,website:"https://u:p@example.org/"}).website,"");
const injected=parseMotionCommission({...clean,name:"A\nB",company:"Example\r\nCompany"});
assert.ok(!motionCommissionText(injected).includes("A\nB"));
const fs=await import("node:fs/promises");
const path=await import("node:path");
const route=await fs.readFile(new URL("../../app/api/motion/commission/route.ts",import.meta.url),"utf8");
const proxy=await fs.readFile(new URL("../../proxy.ts",import.meta.url),"utf8");
assert.match(route,/TURNSTILE_SECRET_KEY/);assert.match(route,/RESEND_API_KEY/);
assert.match(route,/MOTION_SALES_INBOX/);assert.match(route,/hostMatches\(request,proof\.hostname\)/);
assert.match(route,/proof\.action!=="motion_inquiry"/);
assert.match(route,/process\.env\.NODE_ENV==="production"/);
assert.match(route,/!ready\(\)/);
assert.match(proxy,/path==="\/api\/motion\/commission"/);
assert.doesNotMatch(proxy,/path\.startsWith\("\/api\/motion\/"/);
console.log("Motion sales contract PASS: 3 offers, safe buyer brief, offline consent independence, webhook fail-closed Turnstile + exact public proxy");
