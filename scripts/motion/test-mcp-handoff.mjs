#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, deps = {}) {
  const code = readFileSync(new URL("../../" + path, import.meta.url), "utf8");
  const js = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022
  }}).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, key => {
    if (Object.hasOwn(deps, key)) return deps[key];
    throw Error("Unexpected import: " + path + ": " + key);
  });
  return mod.exports;
}
const audio = load("lib/motion/timeline-edit.ts");
const studio = load("lib/motion/studio.ts", { "./timeline-edit": audio });
const chat = load("lib/motion/chat-operator.ts", { "./studio": studio });
const director = { createKeylessStoryboard: ({brand,format}) => studio.makeMotionPreset(brand,format) };
const bridge = load("lib/motion/chatgpt-bridge.ts", {
  "./studio": studio, "./chat-operator": chat, "./director": director
});
const call = (method, params, id=9) => bridge.motionMcpDispatch({
  jsonrpc:"2.0", id, method, params
}, "https://motion.example.test");
const result = (name,args) => {
  const response=call("tools/call",{name,arguments:args});
  assert.equal(response.result.isError,undefined,JSON.stringify(response.result));
  return response.result.structuredContent;
};
const unpack = url => {
  const u=new URL(url);
  assert.equal(u.origin,"https://motion.example.test");
  assert.equal(u.pathname,"/motion");
  assert.equal(u.searchParams.get("mode"),"cinematic");
  assert.match(u.hash,/^#motion-chat=[A-Za-z0-9_-]+$/);
  return JSON.parse(Buffer.from(u.hash.slice("#motion-chat=".length),"base64url").toString("utf8"));
};
assert.equal(call("initialize",{}).result.serverInfo.name,"margaryan-motion");
const names=call("tools/list",{}).result.tools.map(x=>x.name);
assert.deepEqual(names,["motion_capabilities","motion_create_storyboard","motion_open_project","motion_edit_project"]);
assert.equal(result("motion_capabilities",{}).scenes.max,8);
const created=result("motion_create_storyboard",{brand:"veto",format:"portrait",prompt:"Explain market risk."});
assert.equal(created.rendered,false);
const pack=unpack(created.openInStudio);
assert.equal(pack.protocol,"motion-chat-v1");
assert.equal(pack.action,"create");
assert.equal(pack.project.brand,"veto");
assert.deepEqual(chat.previewChatMotionPack(pack,studio.makeMotionPreset("labs")).next,created.project);
const editable=studio.makeMotionPreset("veto");
const open=result("motion_open_project",{project:editable});
assert.equal(unpack(open.openInStudio).project.scenes.length,editable.scenes.length);
const patch=result("motion_edit_project",{project:editable,changes:[
  {target:"scene",index:0,set:{headline:"RISK FIRST."}}
]});
assert.equal(unpack(patch.openInStudio).action,"patch");
assert.equal(patch.previewProject.scenes[0].headline,"RISK FIRST.");
const fail=(name,args,pattern)=>{
  const response=call("tools/call",{name,arguments:args});
  assert.equal(response.result.isError,true);
  assert.match(response.result.content[0].text,pattern);
};
fail("motion_create_storyboard",{brand:"arbitrary",prompt:"Some meaningful prompt"},/Invalid brand/);
fail("motion_open_project",{project:{...editable,scenes:[
  {...editable.scenes[0],mediaId:"clip-remote-1",kind:"screen"}]}},/External\/user media/);
fail("motion_open_project",{project:{...editable,scenes:Array(9).fill(editable.scenes[0])}},/1–8/);
fail("motion_edit_project",{project:editable,changes:[
  {target:"scene",index:99,set:{headline:"NO"}}
]},/scene index/);
assert.equal(bridge.motionMcpDispatch({jsonrpc:"2.0",method:"notifications/initialized"},"https://motion.example.test"),null);
assert.equal(call("not-a-method",{}).error.code,-32601);
assert.equal(bridge.motionMcpDispatch({}, "https://motion.example.test").error.code,-32600);
console.log("Motion MCP: JSON-RPC negotiation, safe tools, keyless storyboard, deep-link create/patch, reject gates PASS");
