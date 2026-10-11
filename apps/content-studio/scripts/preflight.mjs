#!/usr/bin/env node
// Standalone Vercel prebuild tests: the root GitHub Actions runners currently
// sometimes fail before executing any steps. Refuse to deploy a broken MCP
// protocol, widget script or local film vault even when CI is unavailable.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "@typescript/typescript6";

const root = new URL("../../../", import.meta.url);
function load(path,deps={}){
  const js=ts.transpileModule(readFileSync(new URL(path,root),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  const mod={exports:{}};
  new Function("module","exports","require",js)(mod,mod.exports,key=>{
    if(Object.hasOwn(deps,key))return deps[key];
    throw Error("Unreviewed module imported from test: "+key);
  });
  return mod.exports;
}
const timing=load("lib/motion/timeline-edit.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":timing});
const chat=load("lib/motion/chat-operator.ts",{"./studio":studio});
const bridge=load("lib/motion/plugin-bridge.ts",{"./studio":studio,"./chat-operator":chat});
const widget=load("lib/motion/content-studio-widget.ts");
const vault=load("lib/motion/local-project-vault.ts",{"./studio":studio});
const route=load("apps/content-studio/app/api/mcp/route.ts",{
  "@/lib/motion/plugin-bridge":bridge,
  "@/lib/motion/content-studio-widget":widget
});
const origin=process.env.CONTENT_STUDIO_PUBLIC_URL || "https://studio.promptence.tech";
const scenes=[
  {kind:"opener",eyebrow:"ACT ONE",headline:"HELLO MOTION.",support:"A genuine local storyboard.",seconds:4},
  {kind:"network",eyebrow:"THE SYSTEM",headline:"BUILDING AN EDITABLE FILM.",support:"No provider inference billed.",seconds:4},
  {kind:"closer",eyebrow:"NEXT",headline:"CREATE WITH CHATGPT.",support:"A browser rendered project.",seconds:4}
];
const film=bridge.runContentStudioTool("create_motion_film",{
  title:"RELEASE PREVIEW",brand:"labs",format:"portrait",language:"en",
  client_brand_name:"NORTH STAR",client_brand_caption:"BETTER MOVING IMAGES",
  client_brand_accent:"#B7C5E9",scenes
});
assert.equal(film.previewProject.clientBrand.name,"NORTH STAR");
assert.equal(film.scenes,3);
assert.equal(film.videoFileCreated,false);
const revised=bridge.runContentStudioTool("revise_motion_film",{
  current_project:film.previewProject,
  changes:[{target:"scene",index:1,set:{headline:"A TRUE NEW HEADING."}}]
});
assert.equal(revised.previewProject.scenes[1].headline,"A TRUE NEW HEADING.");
const shots=Array.from({length:16},(_,i)=>({
  kind:i===0?"opener":i===15?"closer":"statement",
  eyebrow:"FILM",headline:"SHOT "+(i+1),support:"Sample",seconds:7.5
}));
const feature=bridge.runContentStudioTool("create_motion_feature_film",{
  title:"LONG FILM",brand:"labs",format:"portrait",language:"en",
  client_brand_name:"NORTH STAR",scenes:shots
});
assert.equal(feature.durationSeconds,120);
assert.equal(feature.chapters,2);
const encoded=feature.editorUrl.split("#motion-sequence-v1=")[1];
assert.ok(encoded,"Long film should link to real Sequence Studio review");
const manifest=JSON.parse(Buffer.from(encoded,"base64url").toString("utf8"));
assert.ok(manifest.chapters.every(x=>x.project.clientBrand.name==="NORTH STAR"));
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  title:"INVALID GPU",brand:"labs",format:"portrait",language:"en",
  scenes:shots.map((s,i)=>i===4?{...s,kind:"spatial"}:s)
}),/Spatial 3D scenes require workstation Master/);

const data=new Map();
const storage={getItem:key=>data.get(key)||null,
  setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
const snapshot=vault.saveLocalFilmSnapshot(storage,film.previewProject,"CLIENT DRAFT");
assert.equal(vault.readLocalFilmVault(storage)[0].id,snapshot.id);
assert.equal(vault.readLocalFilmVault(storage).length,1);
vault.replaceLocalFilmSnapshot(storage,snapshot.id,revised.previewProject);
assert.equal(vault.readLocalFilmVault(storage)[0].project.scenes[1].headline,"A TRUE NEW HEADING.");
vault.deleteLocalFilmSnapshot(storage,snapshot.id);
assert.equal(vault.readLocalFilmVault(storage).length,0);

async function rpc(method,params={},id=1){
  const response=await route.POST(new Request(origin+"/api/mcp",{
    method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json, text/event-stream"},
    body:JSON.stringify({jsonrpc:"2.0",id,method,params})
  }));
  assert.equal(response.status,200,method+" should be accepted");
  const body=await response.json();
  assert.equal(body.jsonrpc,"2.0");
  assert.equal(body.error,undefined,method+" must not produce an MCP error");
  return body.result;
}
const initialized=await rpc("initialize",{
  protocolVersion:"2025-06-18",clientInfo:{name:"Vercel Offline Preflight",version:"0.4.0"},capabilities:{}
});
assert.equal(initialized.serverInfo.name,"margaryan-content-studio");
assert.ok(initialized.instructions.includes("not model-rendered photoreal video"));
const tools=(await rpc("tools/list")).tools;
assert.deepEqual(tools.map(x=>x.name),[
  "create_motion_film","revise_motion_film","create_motion_feature_film"
]);
assert.ok(tools.every(t=>t.outputSchema?.properties?.editorUrl));
assert.ok(tools.every(t=>t.outputSchema?.required?.includes("videoFileCreated")));
const resource=(await rpc("resources/list")).resources[0];
assert.equal(resource.mimeType,"text/html;profile=mcp-app");
const first=(await rpc("resources/read",{uri:resource.uri})).contents[0];
assert.equal(first.mimeType,"text/html;profile=mcp-app");
assert.ok(first.text.includes("/motion/chat-preview"));
assert.ok(first._meta.ui.csp.frameDomains.includes(new URL(origin).origin));
const script=/<script>([\s\S]*?)<\/script>/.exec(first.text)?.[1];
assert.ok(script && script.includes("ui/initialize"));
new vm.Script(script);
const shortResult=await rpc("tools/call",{name:"create_motion_film",arguments:{
  title:"RELEASE PREVIEW",brand:"labs",format:"portrait",language:"en",scenes
}});
assert.equal(shortResult.structuredContent.videoFileCreated,false);
const longResult=await rpc("tools/call",{name:"create_motion_feature_film",arguments:{
  title:"RELEASE FEATURE",brand:"labs",format:"portrait",language:"en",scenes:shots
}});
assert.equal(longResult.structuredContent.durationSeconds,120);
assert.ok(longResult.structuredContent.editorUrl.startsWith(origin+"/motion?"));
console.log("Content Studio standalone release preflight: MCP discovery, output schemas, widget JS, short + 120s film, customer kit, local vault PASS");
