import {test} from "node:test";
import assert from "node:assert/strict";
import {cloudOperatorAccess} from "../../lib/cloud/operator-auth.ts";
import {readFileSync} from "node:fs";
const credentials={DISTRIBUTION_BASIC_USER:"operator",DISTRIBUTION_BASIC_PASSWORD:"a VERY secret password"};
const auth=(value)=>new Headers(value?{authorization:value}:{});
const basic=(u,p)=>"Basic "+Buffer.from(u+":"+p).toString("base64");
test("Cloud API refuses access when operator credentials are not configured",()=>{
 assert.equal(cloudOperatorAccess(auth(),{}),"unconfigured");
 assert.equal(cloudOperatorAccess(auth(basic("operator","password")),{DISTRIBUTION_BASIC_USER:"operator"}),"unconfigured");
});
test("Cloud API requires actual Basic credentials and never trusts a query value",()=>{
 assert.equal(cloudOperatorAccess(auth(),credentials),"denied");
 assert.equal(cloudOperatorAccess(auth("Bearer abc"),credentials),"denied");
 assert.equal(cloudOperatorAccess(auth("Basic !!"),credentials),"denied");
 assert.equal(cloudOperatorAccess(auth(basic("operator","wrong")),credentials),"denied");
 assert.equal(cloudOperatorAccess(auth(basic("wrong","a VERY secret password")),credentials),"denied");
 assert.equal(cloudOperatorAccess(auth(basic("operator","a VERY secret password")),credentials),"allow");
});
test("Both Cloud routes enforce operator policy inside route handler",()=>{
 for(const file of ["../../app/api/cloud/route.ts","../../app/api/cloud/providers/route.ts"]){
  const src=readFileSync(new URL(file,import.meta.url),"utf8");
  assert.match(src,/cloudOperatorAccess\(request\.headers,process\.env\)/);
  assert.match(src,/access!=="allow"/);
 }
});
