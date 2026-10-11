#!/usr/bin/env node
/** Production MCP safety contract, independent of provider keys, browser or GPU.
 * The HTTP integration is separately tested against a launched Next server.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const server=read("lib/motion/native-mcp.ts");
const route=read("app/api/motion/mcp/route.ts");
const proxy=read("proxy.ts");
const connect=read("app/motion/mcp/page.tsx");
const pkg=JSON.parse(read("package.json"));
assert.equal(pkg.dependencies["@modelcontextprotocol/server"],"2.3.1");
assert.match(server,/createMcpHandler\(createMotionMcpServer/);
assert.match(server,/new McpServer\(/);
for(const name of [
 "motion_studio_capabilities","motion_create_project","motion_promptence_cut",
 "motion_review_project","motion_preview_patch"
])assert.match(server,new RegExp('registerTool\\("'+name+'"'));
assert.equal((server.match(/annotations:readOnly/g)||[]).length,5);
assert.match(server,/remoteVideoRenderReady:false/);
assert.match(server,/rendered:false/);
assert.match(server,/canWriteProjectsToCloud:false/);
assert.doesNotMatch(server,/spawn\(|child_process|exec\(|OPENAI_API_KEY|fetch\("http|fs\.writeFile/);
assert.match(route,/MAX_BODY=32_000/);
assert.match(route,/CLIENT_ORIGINS/);
assert.ok(proxy.includes('path==="/api/motion/mcp"'));
assert.ok(proxy.includes('path==="/motion/mcp"'));
assert.ok(!proxy.includes('path.startsWith("/api/motion/")'));
assert.ok(connect.includes("distribution-web-production.up.railway.app/api/motion/mcp"));
assert.match(route,/safeOrigin\(request\)/);
assert.match(route,/motionMcpHandler\.fetch/);
assert.doesNotMatch(route,/process\.env\.(?:GITHUB_TOKEN|RESEND_API_KEY|OPENAI_API_KEY|DISTRIBUTION_BASIC_PASSWORD)/);
assert.equal(pkg.scripts["motion:test-native-mcp"],"node scripts/motion/test-native-mcp.mjs");
console.log("MOTION MCP: five first-party stateless read-only tools, real transport, origin/size boundaries — static contract PASS");

const endpoint=process.env.MOTION_MCP_TEST_URL;
if(endpoint){
 const rpc=async(msg,headers={})=>{
  const response=await fetch(endpoint,{method:"POST",headers:{
   "content-type":"application/json","accept":"application/json,text/event-stream",...headers},
   body:JSON.stringify(msg)});
  const text=await response.text();
  const events=text.split("\n").filter(x=>x.startsWith("data: ")).map(x=>JSON.parse(x.slice(6)));
  return {status:response.status,events,text};
 };
 const init=await rpc({jsonrpc:"2.0",id:1,method:"initialize",params:{
  protocolVersion:"2025-11-25",capabilities:{},clientInfo:{name:"qa",version:"1.0"}}});
 assert.equal(init.status,200);
 assert.equal(init.events[0]?.result?.serverInfo?.name,"margaryan-motion-studio");
 const tools=await rpc({jsonrpc:"2.0",id:2,method:"tools/list",params:{}});
 assert.equal(tools.status,200);
 const names=tools.events[0]?.result?.tools?.map(x=>x.name).sort();
 assert.deepEqual(names,["motion_create_project","motion_preview_patch","motion_promptence_cut",
  "motion_review_project","motion_studio_capabilities"].sort());
 const capabilities=await rpc({jsonrpc:"2.0",id:3,method:"tools/call",params:{
  name:"motion_studio_capabilities",arguments:{}}});
 assert.equal(capabilities.status,200);
 const meta=JSON.parse(capabilities.events[0].result.content[0].text);
 assert.equal(meta.remoteVideoRenderReady,false);
 const storyboard=await rpc({jsonrpc:"2.0",id:4,method:"tools/call",params:{
  name:"motion_promptence_cut",arguments:{cut:"campaign",language:"ru",format:"portrait"}}});
 assert.equal(storyboard.status,200);
 const result=JSON.parse(storyboard.events[0].result.content[0].text);
 assert.equal(result.rendered,false);
 assert.ok(result.project.scenes.length>2);
 const origin=await rpc({jsonrpc:"2.0",id:7,method:"tools/list",params:{}},{"origin":"https://untrusted.example"});
 assert.equal(origin.status,403);
 console.log("MOTION MCP: real initialize, tools/list, content generation, safe origin rejection — LIVE PASS");
}
