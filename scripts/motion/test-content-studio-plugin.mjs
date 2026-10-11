#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

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
const route = load("app/api/mcp/route.ts", { "@/lib/motion/plugin-bridge": bridge });
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
const listed = await send({ jsonrpc: "2.0", id: "tools", method: "tools/list" });
assert.equal(listed.json.result.tools.length, 2);
const tool = await send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "create_motion_film", arguments: data } });
assert.equal(tool.json.result.structuredContent.videoFileCreated, false);
assert.equal(tool.json.result.structuredContent.scenes, 3);
const blocked = await send({ jsonrpc: "2.0", id: 4, method: "tools/list" }, "https://evil.example");
assert.equal(blocked.response.status, 403);
console.log("Content Studio plugin: JSON-RPC, 2 tools, safe handoff, patch guards and validation PASS");
