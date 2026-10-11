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
.player iframe{border:0;width:100%;height:510px;display:block;transition:height .18s ease}
.shots{overflow-y:auto;max-height:400px;border:1px solid var(--line);border-radius:12px;padding:12px;background:#101217}
.shots h2{font-size:11px;letter-spacing:.1em;font-weight:700;margin:0 0 12px;color:var(--muted)}
.shot{display:block;width:100%;appearance:none;text-align:left;cursor:pointer;background:transparent;color:inherit;padding:10px 6px;border:0;border-top:1px solid #282b32;border-radius:4px}.shot:first-of-type{border:0}.shot:hover,.shot[aria-pressed="true"]{background:#1b2b45;outline:1px solid #405a83}.shot:focus-visible{outline:2px solid #b4c9ff;outline-offset:2px}.shot .number{font-size:10px;color:var(--accent)}.shot strong{display:block;font-size:12px;margin:4px 0;line-height:1.35}.shot small{color:var(--muted)}
.actions{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap}
.btn{appearance:none;border:1px solid #6d7f9b;border-radius:9px;background:#1e293d;color:var(--ink);font-weight:700;font-size:12px;padding:10px 14px;cursor:pointer;text-decoration:none}.btn:hover{background:#34435c}
.note{font-size:11px;line-height:1.5;color:var(--muted)}#status{color:#b7cdff}
@media(max-width:600px){.layout{grid-template-columns:1fr}.player iframe{height:530px}.shots{max-height:230px}.title{font-size:18px}}
</style></head>
<body><main class="wrap">
<div class="head"><div><div class="logo">MARGARYAN / CONTENT STUDIO</div><div class="tag">MOTION ENGINE · CHATGPT NATIVE PREVIEW</div></div><div class="tag">KEYLESS BETA</div></div>
<h1 id="title" class="title">Your film workspace</h1>
<p class="subtitle" id="subtitle">Waiting for an editable storyboard from ChatGPT.</p>
<div class="layout"><div class="player"><iframe id="player" title="Live motion canvas" sandbox="allow-scripts allow-same-origin allow-downloads"></iframe></div>
<div class="shots" id="shots"><h2>SHOT LIST / DIRECTOR</h2><p class="note">Ask ChatGPT to create a motion film. Its actual Canvas preview will appear here.</p></div></div>
<div class="actions"><a id="openEditor" class="btn" href="#" target="_blank" rel="noopener noreferrer" hidden>OPEN FULL EDITOR ↗</a><span class="note" id="status" role="status">Preview only; video has not been exported.</span></div>
<p class="note">This player uses browser motion graphics, not AI-generated live-action footage. Export runs in your browser. Use your own local brand logo, voiceover and licensed music without uploading them to our servers. Video format depends on browser support.</p>
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
  let selectedIndex = 0;
  let lastFilmTitle = "";
  // A selected shot is UI state, NOT authoritative film storage. In ChatGPT
  // widget state belongs to this specific instance and may not be available.
  const existingState = window.openai && window.openai.widgetState;
  if (existingState && Number.isInteger(existingState.selectedShot) &&
      existingState.selectedShot>=0 && existingState.selectedShot<8)
    selectedIndex = existingState.selectedShot;
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
    if(lastFilmTitle && lastFilmTitle!==film.title) selectedIndex=0;
    lastFilmTitle=film.title;
    selectedIndex=Math.min(selectedIndex,film.scenes.length-1);
    latest = data;
    title.textContent = safe(film.title);
    subtitle.textContent = film.scenes.length + " SCENES · " + Number(data.durationSeconds).toFixed(1) + " SEC · " + safe(film.format).toUpperCase();
    shots.replaceChildren();
    const h = document.createElement("h2"); h.textContent = "SHOT LIST / DIRECTOR"; shots.appendChild(h);
    film.scenes.forEach((shot, i) => {
      const div = document.createElement("button");
      div.type="button";div.className="shot";
      div.setAttribute("aria-label","Jump to shot "+(i+1)+": "+safe(shot.headline));
      div.setAttribute("aria-pressed",String(i===selectedIndex));
      div.addEventListener("click",()=>focusShot(i));
      const number = document.createElement("span");number.className = "number";number.textContent = "SHOT " + String(i + 1).padStart(2, "0") + " / " + Number(shot.seconds).toFixed(1) + "S";
      const strong = document.createElement("strong");strong.textContent = safe(shot.headline);
      const small = document.createElement("small");small.textContent = safe(shot.kind);
      div.append(number,strong,small);shots.appendChild(div);
    });
    if (typeof data.editorUrl === "string" && data.editorUrl.startsWith(origin + "/motion?")) {
      editor.href = data.editorUrl; editor.hidden = false;
    }
    status.textContent = "Editable motion draft loaded. Choose a shot, play, or export.";
    sendToPlayer();
  }
  function currentShotTime() {
    if(!latest || !Array.isArray(latest.previewProject.scenes))return 0;
    const scenes=latest.previewProject.scenes;
    const elapsed=scenes.slice(0,selectedIndex)
      .reduce((sum,shot)=>sum+(Number(shot.seconds)||0),0);
    return elapsed+Math.min(0.5,Math.max(0,Number(scenes[selectedIndex]?.seconds)||0)/2);
  }
  function focusShot(index) {
    if(!latest || !Number.isInteger(index) ||
       index<0 || index>=latest.previewProject.scenes.length)return;
    selectedIndex=index;
    shots.querySelectorAll(".shot").forEach((element,i)=>{
      element.setAttribute("aria-pressed",String(i===index));
    });
    // The host owns this optional ephemeral widget state. Do not persist
    // client scripts, original image/audio bytes, or business data here.
    if(window.openai && typeof window.openai.setWidgetState==="function")
      window.openai.setWidgetState({selectedShot:index});
    if(ready&&player.contentWindow){
      player.contentWindow.postMessage({
        kind:"margaryan-motion-seek-v1",time:currentShotTime()
      },origin);
    }
    status.textContent="Shot "+String(index+1).padStart(2,"0")+" selected in the live film player.";
  }
  function sendToPlayer() {
    if (!ready || !latest || !player.contentWindow) return;
    player.contentWindow.postMessage({
      kind:"margaryan-motion-preview-v1",project:latest.previewProject,
      seekToSeconds:currentShotTime()
    },origin);
  }
  player.addEventListener("load", () => { ready = true; sendToPlayer(); });
  player.src = origin + "/motion/chat-preview";
  // ChatGPT opens links through the host-approved external navigation API.
  // Normal links may be blocked or silently ignored in its sandbox.
  editor.addEventListener("click", async event => {
    const href = editor.href;
    if (!latest || !href.startsWith(origin + "/motion?")) {
      event.preventDefault();
      return;
    }
    if (window.openai && typeof window.openai.openExternal === "function") {
      event.preventDefault();
      try {
        await window.openai.openExternal({href,redirectUrl:false});
      } catch(err) {
        status.textContent = "External editor could not be opened: " +
          String(err && err.message || err).slice(0,110);
      }
    }
    // Ordinary browser host: <a target=_blank rel=noopener> handles it.
  });
  // A user explicitly clicks SAVE TO CHATGPT in the nested film player.
  // Only browser-rendered exports can reach this bridge, never arbitrary URLs.
  let uploadBusy = false;
  async function importBrowserVideo(packet) {
    if (uploadBusy) return;
    const reply = (message) => {
      status.textContent = message;
      if (player.contentWindow) player.contentWindow.postMessage({
        kind:"margaryan-motion-upload-status-v1",message
      },origin);
    };
    const bytes = packet && packet.bytes;
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 100 || bytes.byteLength > 25_000_000 ||
        !/^[a-z0-9-]{1,80}\.(mp4|webm)$/i.test(packet.fileName || "") ||
        !["video/mp4","video/webm"].includes(packet.mimeType)) {
      reply("ChatGPT upload rejected: unsupported file or larger than 25 MB.");
      return;
    }
    if (!window.openai || typeof window.openai.uploadFile !== "function") {
      reply("ChatGPT file storage unavailable in this host. Your local video download still works.");
      return;
    }
    uploadBusy = true;
    try {
      reply("Uploading your exported video to ChatGPT…");
      const file = new File([bytes],packet.fileName,{type:packet.mimeType});
      const result = await window.openai.uploadFile(file,{library:true});
      if (!result || typeof result.fileId !== "string" || !result.fileId) {
        throw Error("No file confirmation was returned by ChatGPT");
      }
      reply("Video saved to ChatGPT. Check your files/library; keep your local copy.");
    } catch(error) {
      reply("Could not save to ChatGPT: " + String(error && error.message || error).slice(0,140) +
        ". The local export is unaffected.");
    } finally {
      uploadBusy = false;
    }
  }
  window.addEventListener("message", event => {
    if (event.source === player.contentWindow && event.origin === origin) {
      if (event.data && event.data.kind === "margaryan-motion-resize-v1") {
        const pixels=Number(event.data.height);
        if(Number.isFinite(pixels)&&pixels>320&&pixels<1500){
          player.style.height=Math.round(Math.min(1150,Math.max(440,pixels)))+"px";
          if(window.openai&&typeof window.openai.notifyIntrinsicHeight==="function")
            window.openai.notifyIntrinsicHeight();
        }
        return;
      }
      if (event.data && event.data.kind === "margaryan-motion-preview-ready-v1") {
        ready = true; sendToPlayer(); return;
      }
      if (event.data && event.data.kind === "margaryan-motion-export-file-v1") {
        void importBrowserVideo(event.data); return;
      }
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
    appInfo:{name:"margaryan-content-studio",version:"0.5.0"},
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