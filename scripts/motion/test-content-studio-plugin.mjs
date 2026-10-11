#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "@typescript/typescript6";
import vm from "node:vm";

function load(path, deps = {}) {
  const js = ts.transpileModule(readFileSync(new URL("../../" + path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, key => {
    if (Object.hasOwn(deps, key)) return deps[key];
    throw Error("Unexpected module import " + key);
  });
  return mod.exports;
}
const timeline = load("lib/motion/timeline-edit.ts");
const studio = load("lib/motion/studio.ts", { "./timeline-edit": timeline });
const chat = load("lib/motion/chat-operator.ts", { "./studio": studio });
const bridge = load("lib/motion/plugin-bridge.ts", { "./studio": studio, "./chat-operator": chat });
const widget = load("lib/motion/content-studio-widget.ts");
const vault = load("lib/motion/local-project-vault.ts", { "./studio": studio });
const route = load("app/api/mcp/route.ts", {
  "@/lib/motion/plugin-bridge": bridge,
  "@/lib/motion/content-studio-widget": widget
});
const data = {
  title: "RESTAURANT / THE NEW EXPERIENCE", brand: "labs", format: "portrait",
  language: "ru", style: "cinematic", qualityMode: "signature",
  scenes: [
    { kind: "kinetic", eyebrow: "ВЕЧЕР", headline: "НЕ ПРОСТО УЖИН.", support: "Встреча, которую хочется повторить.", seconds: 4, titleTreatment: "mask" },
    { kind: "network", eyebrow: "НАШ ПОДХОД", headline: "АТМОСФЕРА В ДЕТАЛЯХ.", support: "Музыка. Меню. Люди.", seconds: 5, transition: "slide" },
    { kind: "closer", eyebrow: "ЗАБРОНИРУЙ СТОЛ", headline: "ТВОЙ ВЕЧЕР НАЧИНАЕТСЯ ЗДЕСЬ.", support: "Посмотри меню.", seconds: 4 }
  ]
};
const created = bridge.runContentStudioTool("create_motion_film", data);
assert.equal(created.chatPack.protocol, "motion-chat-v1");
assert.equal(created.chatPack.action, "create");
assert.equal(created.videoFileCreated, false);
assert.equal(created.voiceFileCreated, false);
assert.equal(created.durationSeconds, 13);

const slots = new Map();
const localStorage = {
  getItem(key){return slots.get(key)||null;},
  setItem(key,value){slots.set(key,value);},
  removeItem(key){slots.delete(key);}
};
assert.equal(vault.readLocalFilmVault(localStorage).length,0);
const first = vault.saveLocalFilmSnapshot(localStorage,created.chatPack.project,"PRIVATE CUSTOMER FILM");
assert.equal(first.name,"PRIVATE CUSTOMER FILM");
assert.equal(vault.readLocalFilmVault(localStorage).length,1);
assert.equal(vault.readLocalFilmVault(localStorage)[0].project.title,created.title);
assert.equal(slots.get(vault.VAULT_KEY).includes("audioFile"),false);
const second=vault.saveLocalFilmSnapshot(localStorage,created.chatPack.project,"SECOND EDITION");
assert.notEqual(first.id,second.id);
assert.equal(vault.readLocalFilmVault(localStorage).length,2);
const replacement=vault.replaceLocalFilmSnapshot(localStorage,first.id,{
  ...created.chatPack.project,title:"NEW VERSION OF CUSTOMER FILM"
});
assert.equal(replacement.project.title,"NEW VERSION OF CUSTOMER FILM");
assert.equal(vault.readLocalFilmVault(localStorage).find(x=>x.id===first.id).project.title,"NEW VERSION OF CUSTOMER FILM");
assert.equal(vault.readLocalFilmVault(localStorage).find(x=>x.id===second.id).name,"SECOND EDITION");
assert.throws(()=>vault.replaceLocalFilmSnapshot(localStorage,"missing-project",created.chatPack.project),/not found/);
vault.deleteLocalFilmSnapshot(localStorage,second.id);
assert.equal(vault.readLocalFilmVault(localStorage).length,1);
assert.throws(()=>vault.deleteLocalFilmSnapshot(localStorage,second.id),/not found/);
for(let n=1;n<vault.VAULT_LIMIT;n++)vault.saveLocalFilmSnapshot(localStorage,created.chatPack.project,"ADDITIONAL "+n);
assert.equal(vault.readLocalFilmVault(localStorage).length,vault.VAULT_LIMIT);
assert.throws(()=>vault.saveLocalFilmSnapshot(localStorage,created.chatPack.project,"FULL"),/holds 18 films/);
localStorage.setItem(vault.VAULT_KEY,JSON.stringify([{...first,id:"a-bad-uid",project:{scenes:new Array(90)}}]));
assert.equal(vault.readLocalFilmVault(localStorage).length,0,"Corrupt vault must fail closed and never load invalid film");
vault.clearLocalFilmVault(localStorage);
assert.equal(localStorage.getItem(vault.VAULT_KEY),null);


const clientFilm = bridge.runContentStudioTool("create_motion_film", {
  ...data, brand:"labs",
  client_brand_name:"BLUE ROOM",
  client_brand_caption:"A NEW KIND OF NIGHT",
  client_brand_accent:"#C0D9FA"
});
assert.equal(clientFilm.previewProject.clientBrand.name,"BLUE ROOM");
assert.equal(clientFilm.previewProject.clientBrand.caption,"A NEW KIND OF NIGHT");
assert.equal(studio.clientBrandInfo(clientFilm.previewProject).name,"BLUE ROOM");
assert.equal(studio.clientBrandInfo(clientFilm.previewProject).accent,"#C0D9FA");
const brandRestyle=bridge.runContentStudioTool("revise_motion_film",{
  current_project:clientFilm.previewProject,
  changes:[{target:"project",set:{clientBrand:{accent:"#D8C4F9"}}}]
});
assert.equal(brandRestyle.previewProject.clientBrand.name,"BLUE ROOM");
assert.equal(brandRestyle.previewProject.clientBrand.accent,"#D8C4F9");
assert.equal(brandRestyle.previewProject.clientBrand.caption,"A NEW KIND OF NIGHT");
assert.throws(()=>bridge.runContentStudioTool("revise_motion_film",{
  current_project:created.chatPack.project,
  changes:[{target:"project",set:{clientBrand:{unexpected:"not allowed"}}}]
}),/name, caption and accent only/);

assert.ok(clientFilm.chatPack.project.clientBrand);
assert.throws(()=>bridge.runContentStudioTool("create_motion_film", {
  ...data,brand:"veto",client_brand_name:"FAKE VETO"
}),/only supported with brand=labs/);
assert.throws(()=>bridge.runContentStudioTool("create_motion_film",{
  ...data,brand:"labs",client_brand_name:"CLIENT",client_brand_accent:"red; background: url(https://evil.com)"
}),/Invalid client_brand_accent|must be #RRGGBB/);
const fallback=studio.sanitizeMotionProject({
  ...clientFilm.previewProject,clientBrand:{name:"BLUE ROOM",caption:"A NEW KIND OF NIGHT",accent:"#000000"}
});
assert.equal(fallback.clientBrand.accent,"#C4D9F4","Unusable dark text accents must be corrected to a visible color");
assert.equal(studio.clientBrandInfo(studio.sanitizeMotionProject({
  ...clientFilm.previewProject,brand:"veto"
})).name,studio.BRAND_INFO.veto.name,
"Official brand logos and captions must never be overwritten with client kits");

assert.ok(created.editorUrl.startsWith("https://"));
const fragment = created.editorUrl.split("#motion-chat-v1=")[1];
assert.deepEqual(JSON.parse(Buffer.from(fragment, "base64url").toString("utf8")), created.chatPack);
assert.equal(chat.previewChatMotionPack(created.chatPack, studio.makeMotionPreset()).next.title, data.title);
assert.ok(created.chatPack.project.scenes.every(s => !s.mediaId));
assert.throws(() => bridge.runContentStudioTool("create_motion_film", { ...data, scenes: [{ ...data.scenes[0], seconds: 80 }] }), /2–8/);
assert.throws(() => bridge.runContentStudioTool("create_motion_film", { ...data, scenes: new Array(9).fill(data.scenes[0]) }), /1–8/);
assert.throws(() => bridge.runContentStudioTool("create_motion_film", { ...data, title: "X".repeat(101) }), /Invalid title/);
assert.throws(() => bridge.runContentStudioTool("create_motion_film", { ...data, brand: "custom-unverified-brand" }), /Invalid brand/);
assert.throws(() => bridge.runContentStudioTool("revise_motion_film", {
  current_project: created.chatPack.project, changes: [{ target: "scene", index: 0, set: { mediaId: "privateAsset123" } }]
}), /cannot attach/);
const edited = bridge.runContentStudioTool("revise_motion_film", {
  current_project: created.chatPack.project,
  changes: [{ target: "scene", index: 1, set: { headline: "В КАЖДОЙ ДЕТАЛИ." } }]
});
assert.equal(edited.chatPack.action, "patch");
assert.equal(edited.scenes, 3);
assert.equal(chat.previewChatMotionPack(edited.chatPack, created.chatPack.project).next.scenes[1].headline, "В КАЖДОЙ ДЕТАЛИ.");
assert.throws(() => bridge.runContentStudioTool("revise_motion_film", {
  current_project: created.chatPack.project,
  changes: [{ target: "scene", index: 0, set: { headline: "НЕ ПРОСТО УЖИН." } }]
}), /changes nothing/);
// Feature film is assembled by ChatGPT in one call without external LLM/video API.
const featureBrief={
  title:"PROMPTENCE / THE ANSWER IS CHANGING",
  brand:"promptence",format:"portrait",language:"en",style:"cinematic",
  chapter_titles:["THE SHIFT","THE RESPONSE"],
  scenes:Array.from({length:16},(_,i)=>({
    kind:i===0?"opener":i===15?"closer":"statement",
    eyebrow:"ACT "+(i<8?"I":"II"),
    headline:"A NEW SEARCH MOMENT "+(i+1),
    support:"Concept storyboard only: no invented customer evidence.",
    seconds:7.5,
    voiceCue:"Narration script for scene "+(i+1)
  }))
};
const feature=bridge.runContentStudioTool("create_motion_feature_film",featureBrief);
assert.equal(feature.durationSeconds,120);
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,scenes:featureBrief.scenes.map((s,i)=>i===4?{...s,kind:"spatial"}:s)
}),/Spatial 3D scenes require workstation Master/);

assert.equal(feature.chapters,2);
assert.equal(feature.scenes,16);
assert.equal(feature.videoFileCreated,false);
assert.equal(feature.voiceFileCreated,false);
assert.equal(feature.requiresUserApproval,true);
const fragmentSequence=feature.editorUrl.split("#motion-sequence-v1=")[1];
assert.ok(fragmentSequence && fragmentSequence.length>100);
const manifest=JSON.parse(Buffer.from(fragmentSequence,"base64url").toString("utf8"));
assert.equal(manifest.type,"motion-sequence-v1");
assert.equal(manifest.chapters.length,2);
assert.equal(manifest.expectedDurationSeconds,120);
const brandedFeature=bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,brand:"labs",client_brand_name:"NORTH STAR",client_brand_caption:"BRAND FILM",
  client_brand_accent:"#C0D9FA"
});
assert.equal(brandedFeature.durationSeconds,120);
const brandedLink=brandedFeature.editorUrl.split("#motion-sequence-v1=")[1];
const brandedManifest=JSON.parse(Buffer.from(brandedLink,"base64url").toString("utf8"));
assert.ok(brandedManifest.chapters.every(chapter=>chapter.project.clientBrand?.name==="NORTH STAR"));
assert.ok(brandedManifest.chapters.every(chapter=>chapter.project.clientBrand?.accent==="#C0D9FA"));
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,brand:"veto",client_brand_name:"SPOOFED OWNER"
}),/only supported with brand=labs/);
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,brand:"labs",client_brand_name:"USER",client_brand_accent:"not-a-color"
}),/must be #RRGGBB|Invalid client_brand_accent/);

assert.deepEqual(manifest.chapters.map(x=>x.project.scenes.length),[8,8]);
assert.equal(manifest.chapters[0].project.language,"en");
assert.equal(manifest.chapters[1].title,"THE RESPONSE");
assert.ok(manifest.chapters.every(x=>x.project.scenes.every(y=>!y.mediaId)));
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,scenes:featureBrief.scenes.slice(0,8)
}),/9–24/);
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,scenes:Array.from({length:9},(_,i)=>({...featureBrief.scenes[i],seconds:2}))
}),/exceed 64/);
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,scenes:featureBrief.scenes.concat(featureBrief.scenes.slice(0,9))
}),/9–24/);
assert.throws(()=>bridge.runContentStudioTool("create_motion_feature_film",{
  ...featureBrief,scenes:[{...featureBrief.scenes[0],seconds:19},...featureBrief.scenes.slice(1)]
}),/2–8/);
async function send(payload, origin) {
  const response = await route.POST(new Request("https://margaryan-distribution.vercel.app/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(payload)
  }));
  return { response, json: response.status === 200 ? await response.json() : null };
}
const init = await send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
assert.equal(init.json.result.serverInfo.name, "margaryan-content-studio");
assert.ok(init.json.result.instructions.includes("at most 64 seconds"));
assert.ok(init.json.result.instructions.includes("65–192 seconds"));
assert.ok(init.json.result.instructions.includes("not model-rendered photoreal video"));
const listed = await send({ jsonrpc: "2.0", id: "tools", method: "tools/list" });
assert.equal(listed.json.result.tools.length, 3);
for(const tool of listed.json.result.tools){
  assert.equal(tool.outputSchema.type,"object","Each MCP tool must declare inspectable structured output");
  assert.ok(tool.outputSchema.required.includes("videoFileCreated"));
  assert.ok(tool.outputSchema.properties.editorUrl);
}
const featureListing=listed.json.result.tools.find(tool=>tool.name==="create_motion_feature_film");
assert.equal(featureListing.outputSchema.properties.protocol.enum[0],"motion-sequence-v1");
const studioTool=listed.json.result.tools.find(t=>t.name==="create_motion_film");
assert.equal(studioTool._meta.ui.resourceUri,bridge.CONTENT_STUDIO_WIDGET_URI);
const resources=await send({jsonrpc:"2.0",id:"res-list",method:"resources/list"});
assert.ok(resources.json.result.resources.some(x=>x.uri===bridge.CONTENT_STUDIO_WIDGET_URI));
const resource=await send({jsonrpc:"2.0",id:"res-read",method:"resources/read",params:{uri:bridge.CONTENT_STUDIO_WIDGET_URI}});
const body=resource.json.result.contents[0];
assert.equal(body.mimeType,"text/html;profile=mcp-app");
assert.ok(body.text.includes('ui/initialize'));
assert.ok(body.text.includes('ui/notifications/tool-result'));
assert.ok(body.text.includes('/motion/chat-preview'));
assert.ok(body._meta.ui.csp.frameDomains.includes("https://margaryan-distribution.vercel.app"));
assert.equal(resource.json.result.contents.length,1);
const badResource=await send({jsonrpc:"2.0",id:"bad-res",method:"resources/read",params:{uri:"ui://unknown"}});
assert.equal(badResource.json.error.code,-32002);
assert.equal(created.previewProject.title,created.title);
assert.ok(!created.previewProject.scenes.some(x=>x.mediaId));
const tool = await send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "create_motion_film", arguments: data } });
assert.equal(tool.json.result.structuredContent.videoFileCreated, false);
assert.equal(tool.json.result.structuredContent.scenes, 3);
const blocked = await send({ jsonrpc: "2.0", id: 4, method: "tools/list" }, "https://evil.example");
assert.equal(blocked.response.status, 403);
const featureTool=await send({ jsonrpc:"2.0",id:5,method:"tools/call",params:{name:"create_motion_feature_film",arguments:featureBrief} });
assert.equal(featureTool.json.result.structuredContent.durationSeconds,120);
assert.ok(featureTool.json.result.structuredContent.editorUrl.includes("#motion-sequence-v1="));
// Exercise the REAL MCP Apps HTML script, not only its static metadata.
// Simulated host supports ChatGPT file storage. Generated file must only
// upload when the embedded player has explicitly requested it, with a strict
// same-origin child and per-file size/type gate.
const script=/\<script\>([\s\S]*?)\<\/script\>/.exec(body.text)?.[1];
assert.ok(script,"MCP widget HTML should contain an executable script");
new vm.Script(script); // syntax check against Node's JS parser
const playerFrame={
  postMessage(message,targetOrigin){assert.equal(targetOrigin,"https://margaryan-distribution.vercel.app");this.lastReply=message;},
  lastReply:null
};
const player={
  contentWindow:playerFrame,
  addEventListener(){},
  src:""
};
const controls=new Map();
const element=(id)=>{
  if(id==="player")return player;
  if(!controls.has(id))controls.set(id,{
    textContent:"",hidden:false,href:"",
    replaceChildren(){},appendChild(){}
  });
  return controls.get(id);
};
const listeners=[];
const uploads=[];
const hostParent={postMessage(){}};
const windowMock={
  parent:hostParent,
  openai:{
    async uploadFile(file,opts){uploads.push({name:file.name,size:file.size,type:file.type,opts});return {fileId:"file_test_motion"};}
  },
  addEventListener(name,callback){if(name==="message")listeners.push(callback);}
};
const frame=vm.createContext({
  window:windowMock,
  document:{getElementById:element,createElement:()=>({textContent:"",className:"",append(){}})},
  setTimeout(){},
  File,
  ArrayBuffer,
  URL
});
new vm.Script(script).runInContext(frame);
const dispatch=(source,origin,data)=>listeners.forEach(fn=>fn({source,origin,data}));
dispatch(playerFrame,"https://evil.example",{
  kind:"margaryan-motion-export-file-v1",
  fileName:"fake.mp4",mimeType:"video/mp4",bytes:new ArrayBuffer(512)
});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(uploads.length,0,"Never accept files from an unexpected frame origin");
dispatch(playerFrame,"https://margaryan-distribution.vercel.app",{
  kind:"margaryan-motion-export-file-v1",
  fileName:"fake.exe",mimeType:"application/x-msdownload",bytes:new ArrayBuffer(512)
});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(uploads.length,0,"Unknown file types cannot be uploaded");
dispatch(playerFrame,"https://margaryan-distribution.vercel.app",{
  kind:"margaryan-motion-export-file-v1",
  fileName:"motion-export.mp4",mimeType:"video/mp4",bytes:new ArrayBuffer(512)
});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(uploads.length,1,"Valid user-approved video must be forwarded to ChatGPT only once");
assert.equal(uploads[0].opts.library,true);
assert.equal(uploads[0].size,512);
assert.ok(controls.get("status").textContent.includes("saved to ChatGPT"));
console.log("Content Studio plugin: JSON-RPC, video widget, optional consent-based ChatGPT upload, safe handoff, 120s feature film PASS");
