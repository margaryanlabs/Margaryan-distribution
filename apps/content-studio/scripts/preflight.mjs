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
const composition=load("lib/motion/source-composition.ts");
const overlay=load("lib/motion/image-overlay.ts");
const studio=load("lib/motion/studio.ts",{"./timeline-edit":timing,
  "./source-composition":composition,"./image-overlay":overlay});
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
assert.deepEqual(first._meta["openai/widgetCSP"].redirect_domains,[new URL(origin).origin]);
assert.ok(first.text.includes("window.openai.openExternal({href,redirectUrl:false})"));

assert.ok(first.text.includes('kind:"margaryan-motion-seek-v1"'),
  "MCP Apps widget must let users inspect shots by jumping the real Canvas player");
assert.ok(first.text.includes("window.openai.setWidgetState"),
  "Widget must preserve safe UI-only selected-shot state when host supports it");
assert.ok(first.text.includes("window.openai.sendFollowUpMessage({prompt,scrollToBottom:true})"),
  "ChatGPT edit button must request a real natural-language follow-up instead of faking film edits");
assert.ok(first.text.includes("askEdit.disabled=false")&&
  first.text.includes("selectedIndex=index"),
  "ChatGPT embedded director must allow a user to select and revise a specific scene");

const publicEditor=readFileSync(new URL("apps/content-studio/app/motion/page.tsx",root),"utf8");
const publicCSS=readFileSync(new URL("apps/content-studio/app/motion/motion.module.css",root),"utf8");
const child=readFileSync(new URL("apps/content-studio/app/motion/chat-preview/page.tsx",root),"utf8");
assert.ok(publicEditor.includes("editorProjectBar")&&publicEditor.includes("editorRail")&&
  publicEditor.includes("LocalFilmVaultPanel")&&publicEditor.includes("clientBrandInfo(project)"),
  "V2 professional editor must retain seven workspaces, saved films and custom customer brand kit");
assert.ok(publicEditor.includes('window.location.hash.startsWith("#motion-sequence-v1=")')&&
  publicEditor.includes("setFeatureOpen(true)"),
  "Critical: long-form ChatGPT film review links must automatically open Sequence Studio in Editor V2");
assert.ok(publicCSS.includes(".editorRail")&&publicCSS.includes(".editorProjectBar"),
  "New public Motion Studio must include latest V2 editor layout styles");
assert.ok(!publicEditor.includes('href="/motion/commission"')&&
  !publicEditor.includes('href="/smm"'),
  "Isolated public Content Studio must not link to protected private Distribution routes");
assert.ok(child.includes('incoming?.kind==="margaryan-motion-seek-v1"')&&
  child.includes("projectRef.current=safe"),
  "Nested video player must seek selected user scenes against the current, not stale, film");

const script=/<script>([\s\S]*?)<\/script>/.exec(first.text)?.[1];
assert.ok(script && script.includes("ui/initialize"));
new vm.Script(script);
const shortResult=await rpc("tools/call",{name:"create_motion_film",arguments:{
  title:"RELEASE PREVIEW",brand:"labs",format:"portrait",language:"en",scenes
}});
assert.equal(shortResult.structuredContent.videoFileCreated,false);

const widgetShots=[], widgetNodes=new Map(), uiMessages=[], followUps=[], uiStates=[];
const nativePlayer={
  contentWindow:{sent:[],postMessage(message,target){
    assert.equal(target,new URL(origin).origin);this.sent.push(message);
  }},
  handlers:{},addEventListener(name,cb){this.handlers[name]=cb;}
};
const getWidgetNode=(id)=>{
  if(id==="player")return nativePlayer;
  if(!widgetNodes.has(id))widgetNodes.set(id,{
    textContent:"",value:"",href:"",hidden:false,disabled:false,handlers:{},
    addEventListener(name,cb){this.handlers[name]=cb;},
    replaceChildren(){if(id==="shots")widgetShots.length=0;},
    appendChild(){},
    querySelectorAll(){return widgetShots;}
  });
  return widgetNodes.get(id);
};
const widgetHost={postMessage(){}};
const widgetScope=vm.createContext({
  window:{
    parent:widgetHost,
    openai:{
      widgetState:{selectedShot:1},
      setWidgetState(value){uiStates.push(value);},
      async sendFollowUpMessage(value){followUps.push(value);}
    },
    addEventListener(name,callback){if(name==="message")uiMessages.push(callback);}
  },
  document:{
    getElementById:getWidgetNode,
    createElement(type){
      const node={textContent:"",className:"",type:"",handlers:{},attrs:{},
        append(){},setAttribute(name,value){this.attrs[name]=value;},
        addEventListener(name,cb){this.handlers[name]=cb;}};
      if(type==="button")widgetShots.push(node);
      return node;
    }
  },
  setTimeout(){},URL,File,ArrayBuffer
});
new vm.Script(script).runInContext(widgetScope);
nativePlayer.handlers.load();
for(const callback of uiMessages)callback({
  source:widgetHost,origin:"https://chatgpt.com",
  data:{jsonrpc:"2.0",method:"ui/notifications/tool-result",params:shortResult}
});
assert.equal(widgetShots.length,3,"Actual widget must create one selectable button per scene");
assert.equal(widgetShots[1].attrs["aria-pressed"],"true",
  "Host widget state must restore the previously selected storyboard shot");
widgetShots[2].handlers.click();
assert.equal(uiStates.at(-1).selectedShot,2,"Scene selection must persist only safe widget UI state");
assert.deepEqual(Object.keys(uiStates.at(-1)),["selectedShot"]);
assert.equal(nativePlayer.contentWindow.sent.at(-1).kind,"margaryan-motion-seek-v1");
assert.ok(nativePlayer.contentWindow.sent.at(-1).time>scenes[0].seconds+scenes[1].seconds);
getWidgetNode("editPrompt").value="Use bigger typography and a stronger product proof";
await getWidgetNode("askEdit").handlers.click();
assert.equal(followUps.length,1,"Natural-language film changes must be sent to ChatGPT, not simulated");
assert.ok(followUps[0].prompt.includes("scene 3")&&
  followUps[0].prompt.includes("revise_motion_film"));
assert.equal(getWidgetNode("editPrompt").value,"","Text field should clear after accepted follow-up");

const longResult=await rpc("tools/call",{name:"create_motion_feature_film",arguments:{
  title:"RELEASE FEATURE",brand:"labs",format:"portrait",language:"en",scenes:shots
}});
assert.equal(longResult.structuredContent.durationSeconds,120);
assert.ok(longResult.structuredContent.editorUrl.startsWith(origin+"/motion?"));
console.log("Content Studio standalone release preflight: MCP discovery, output schemas, widget JS, short + 120s film, customer kit, Editor V2, live shot selection, GPT edit follow-up and local vault PASS");
