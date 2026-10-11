/**
 * MCP Apps HTML resource. The app uses the standard postMessage bridge and
 * presents the existing Motion canvas through our first-party mini player.
 * Rendering happens in the isolated browser (no server GPU, no AI API).
 * The iframe is deliberately first-party; production approval needs a branded,
 * owned domain and CSP verification, not a vercel.app shared-host exception.
 */
export function motionStudioWidgetHtml(studioOrigin: string): string {
  const url = new URL(studioOrigin);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw Error("Content Studio requires a clean HTTPS origin");
  const config = JSON.stringify(url.origin).replace(/</g, "\\u003c");
  return String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Margaryan Content Studio</title>
<style>
:root{color-scheme:dark;--bg:#0a0b0e;--line:#30323a;--ink:#ecedf0;--muted:#a6aab5;--accent:#b4c9ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px system-ui,-apple-system,Segoe UI,sans-serif}
.wrap{padding:15px;max-width:900px;margin:auto}.head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--line)}
.logo{letter-spacing:.12em;font-size:11px;font-weight:800}.tag{font-size:11px;color:var(--muted);letter-spacing:.05em}.title{font-size:20px;line-height:1.2;font-weight:650;letter-spacing:-.03em;margin:18px 0 6px}
.subtitle{color:var(--muted);margin:0 0 16px;font-size:12px}.layout{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(200px,.85fr);gap:16px}
.player{border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#07090d;min-height:315px;position:relative}
.player iframe{border:0;width:100%;height:400px;display:block}
.shots{overflow-y:auto;max-height:400px;border:1px solid var(--line);border-radius:12px;padding:12px;background:#101217}
.shots h2{font-size:11px;letter-spacing:.1em;font-weight:700;margin:0 0 12px;color:var(--muted)}
.shot{padding:10px 0;border-top:1px solid #282b32}.shot:first-of-type{border:0}.shot .number{font-size:10px;color:var(--accent)}.shot strong{display:block;font-size:12px;margin:4px 0;line-height:1.35}.shot small{color:var(--muted)}
.actions{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
.btn{appearance:none;border:1px solid #6d7f9b;border-radius:9px;background:#1e293d;color:var(--ink);font-weight:700;font-size:12px;padding:10px 14px;cursor:pointer;text-decoration:none}.btn:hover{background:#34435c}
.note{font-size:11px;line-height:1.5;color:var(--muted)}#status{color:#b7cdff}
@media(max-width:600px){.layout{grid-template-columns:1fr}.player iframe{height:390px}.shots{max-height:230px}.title{font-size:18px}}
</style></head>
<body><main class="wrap">
<div class="head"><div><div class="logo">MARGARYAN / CONTENT STUDIO</div><div class="tag">MOTION ENGINE · CHATGPT NATIVE PREVIEW</div></div><div class="tag">KEYLESS BETA</div></div>
<h1 id="title" class="title">Your film workspace</h1>
<p class="subtitle" id="subtitle">Waiting for an editable storyboard from ChatGPT.</p>
<div class="layout"><div class="player"><iframe id="player" title="Live motion canvas" sandbox="allow-scripts allow-same-origin allow-downloads"></iframe></div>
<div class="shots" id="shots"><h2>SHOT LIST / DIRECTOR</h2><p class="note">Ask ChatGPT to create a motion film. Its actual Canvas preview will appear here.</p></div></div>
<div class="actions"><a id="openEditor" class="btn" href="#" target="_blank" rel="noopener noreferrer" hidden>OPEN FULL EDITOR ↗</a><span class="note" id="status" role="status">Preview only; video has not been exported.</span></div>
<p class="note">This player uses browser motion graphics, not AI-generated live-action footage. Export is a device-local video recording; format depends on browser support. User media is not uploaded.</p>
</main><script>
(() => {
  "use strict";
  const origin=${config};
  const player = document.getElementById("player");
  const shots = document.getElementById("shots");
  const title = document.getElementById("title");
  const subtitle = document.getElementById("subtitle");
  const status = document.getElementById("status");
  const editor = document.getElementById("openEditor");
  let latest = null;
  let ready = false;
  let appInitialized = false;
  let nextId = 0;
  const waiting = new Map();
  const safe = (x) => String(x || "").slice(0,250);
  function setResult(envelope) {
    const data = envelope && envelope.structuredContent ? envelope.structuredContent : envelope;
    if (!data || data.protocol !== "motion-chat-v1" || !data.previewProject) return;
    const film = data.previewProject;
    if (!Array.isArray(film.scenes) || film.scenes.length < 1 || film.scenes.length > 8) return;
    latest = data;
    title.textContent = safe(film.title);
    subtitle.textContent = film.scenes.length + " SCENES · " + Number(data.durationSeconds).toFixed(1) + " SEC · " + safe(film.format).toUpperCase();
    shots.replaceChildren();
    const h = document.createElement("h2"); h.textContent = "SHOT LIST / DIRECTOR"; shots.appendChild(h);
    film.scenes.forEach((shot, i) => {
      const div = document.createElement("div");div.className = "shot";
      const number = document.createElement("span");number.className = "number";number.textContent = "SHOT " + String(i + 1).padStart(2, "0") + " / " + Number(shot.seconds).toFixed(1) + "S";
      const strong = document.createElement("strong");strong.textContent = safe(shot.headline);
      const small = document.createElement("small");small.textContent = safe(shot.kind);
      div.append(number,strong,small);shots.appendChild(div);
    });
    if (typeof data.editorUrl === "string" && data.editorUrl.startsWith(origin + "/motion?")) {
      editor.href = data.editorUrl; editor.hidden = false;
    }
    status.textContent = "Editable motion draft loaded. Click play, or export from the preview.";
    sendToPlayer();
  }
  function sendToPlayer() {
    if (!ready || !latest || !player.contentWindow) return;
    player.contentWindow.postMessage({kind:"margaryan-motion-preview-v1",project:latest.previewProject},origin);
  }
  player.addEventListener("load", () => { ready = true; sendToPlayer(); });
  player.src = origin + "/motion/chat-preview";
  window.addEventListener("message", event => {
    if (event.source === player.contentWindow && event.origin === origin && event.data && event.data.kind === "margaryan-motion-preview-ready-v1") {
      ready = true; sendToPlayer(); return;
    }
    if (event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || msg.jsonrpc !== "2.0") return;
    if (msg.id !== undefined && waiting.has(msg.id)) {
      const fn = waiting.get(msg.id);waiting.delete(msg.id);
      if (msg.error) fn.reject(msg.error); else fn.resolve(msg.result);
    } else if (msg.method === "ui/notifications/tool-result") setResult(msg.params);
  });
  function rpc(method,params) {
    const id = ++nextId;
    return new Promise((resolve,reject) => {
      waiting.set(id,{resolve,reject});
      window.parent.postMessage({jsonrpc:"2.0",id,method,params},"*");
      setTimeout(()=>{if(waiting.has(id)){waiting.delete(id);reject(Error("MCP Apps host unavailable"));}},10000);
    });
  }
  rpc("ui/initialize", {
    appInfo:{name:"margaryan-content-studio",version:"0.2.0"},
    appCapabilities:{},
    protocolVersion:"2026-01-26"
  }).then(()=>{
    appInitialized = true;
    window.parent.postMessage({jsonrpc:"2.0",method:"ui/notifications/initialized",params:{}},"*");
    const current = window.openai && window.openai.toolOutput;
    if (current) setResult(current);
  }).catch(()=>{
    status.textContent="MCP Apps host has not initialized the preview.";
  });
  // Hosts may supply tool output before initialization in compatibility mode.
  const initial = window.openai && window.openai.toolOutput;
  if (initial) setResult(initial);
})();
</script></body></html>`;
}