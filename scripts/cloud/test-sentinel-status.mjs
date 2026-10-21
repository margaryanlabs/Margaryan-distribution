import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,chmodSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {readFileSync} from "node:fs";
import {readSentinelStatus} from "../../lib/cloud/sentinel-status.ts";
function sample(value){
 const dir=mkdtempSync(join(tmpdir(),"markarian-agent-status-"));
 const path=join(dir,"state.json");
 writeFileSync(path,JSON.stringify(value),{mode:0o600});
 return {dir,path};
}
test("No state mount means not configured, never invent a running agent",()=>{
 const result=readSentinelStatus({});
 assert.equal(result.state,"not_configured");assert.equal(result.activeIncidents,null);
});
test("Recent complete poll is reported with counts only",()=>{
 const now=Date.parse("2026-10-21T14:00:00Z");
 const {dir,path}=sample({version:1,checkedAt:"2026-10-21T13:59:00Z",
  signals:[{id:"app:1",severity:"critical",title:"Failed app",area:"deploy",secret:"NO_LEAK"}]});
 try{
  const result=readSentinelStatus({CLOUD_SENTINEL_STATE_FILE:path},now);
  assert.equal(result.state,"connected");assert.equal(result.criticalCount,1);
  assert.equal(result.activeIncidents,1);
  assert.doesNotMatch(JSON.stringify(result),/NO_LEAK|state.json/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("Stale poll never means currently active observation",()=>{
 const now=Date.parse("2026-10-21T14:00:00Z");
 const {dir,path}=sample({version:1,checkedAt:"2026-10-21T13:00:00Z",signals:[]});
 try{const s=readSentinelStatus({CLOUD_SENTINEL_STATE_FILE:path},now);assert.equal(s.state,"stale");assert.equal(s.criticalCount,0);}
 finally{rmSync(dir,{recursive:true,force:true});}
});
test("Rejects symlink, permissive permissions and malformed data",()=>{
 const {dir,path}=sample({version:1,checkedAt:"2060-01-01T00:00:00Z",signals:[]});
 try{
  assert.equal(readSentinelStatus({CLOUD_SENTINEL_STATE_FILE:path},Date.parse("2026-10-21T14:00:00Z")).state,"error");
  chmodSync(path,0o644);
  assert.equal(readSentinelStatus({CLOUD_SENTINEL_STATE_FILE:path}).state,"error");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("State endpoint requires independent owner auth and cannot write",()=>{
 const src=readFileSync(new URL("../../app/api/cloud/sentinel/route.ts",import.meta.url),"utf8");
 assert.match(src,/cloudOperatorAccess\(request\.headers,process\.env\)/);
 assert.match(src,/readSentinelStatus\(process\.env\)/);
 assert.doesNotMatch(src,/export async function (POST|PUT|PATCH|DELETE)/);
});
