import { CONTENT_STUDIO_TOOLS, CONTENT_STUDIO_VERSION, CONTENT_STUDIO_WIDGET_URI, runContentStudioTool } from "@/lib/motion/plugin-bridge";
import { motionStudioWidgetHtml } from "@/lib/motion/content-studio-widget";

/**
 * Public, stateless MCP adapter for the keyless Motion concept-film tools.
 * No user/account data, database, AI provider, file upload, render compute,
 * or paid capability is accessible through this endpoint.
 *
 * Production paid/tenant tools MUST move behind per-user OAuth with quotas.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MCP_PROTOCOL = "2025-06-18";
const MAX_BODY = 32_000;
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff"
};
type Rpc = { jsonrpc: "2.0"; id?: unknown; method?: unknown; params?: unknown };
function rpc(id: unknown, result: unknown, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { status, headers });
}
function error(id: unknown, code: number, message: string, status = 200) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { status, headers });
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
export async function POST(request: Request) {
  // Guard browser-based DNS-rebinding/cross-origin attempts; direct remote MCP
  // clients normally omit Origin. Do not enable wildcard browser CORS.
  const origin = request.headers.get("origin");
  if (origin) {
    const own = new URL(request.url).origin;
    if (origin !== own && origin !== "https://chatgpt.com" && origin !== "https://chat.openai.com")
      return new Response("Forbidden Origin", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const stated = Number(request.headers.get("content-length") || 0);
  if (stated > MAX_BODY) return new Response("Request too large", { status: 413, headers });
  let payload: Rpc;
  try {
    const body = await request.text();
    if (body.length > MAX_BODY) return new Response("Request too large", { status: 413, headers });
    const parsed: unknown = JSON.parse(body);
    if (!isRecord(parsed) || parsed.jsonrpc !== "2.0" || typeof parsed.method !== "string")
      return error(null, -32600, "Invalid JSON-RPC request", 400);
    payload = parsed as Rpc;
  } catch { return error(null, -32700, "Invalid JSON", 400); }
  if (payload.method === "notifications/initialized" || payload.method === "notifications/cancelled")
    return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
  if (payload.id === undefined || !(typeof payload.id === "number" || typeof payload.id === "string"))
    return error(null, -32600, "Request id required", 400);
  if (payload.method === "initialize") {
    const params = isRecord(payload.params) ? payload.params : {};
    const negotiated = params.protocolVersion === "2025-03-26" ? "2025-03-26" : MCP_PROTOCOL;
    return rpc(payload.id, {
      protocolVersion: negotiated,
      capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
      serverInfo: { name: "margaryan-content-studio", version: CONTENT_STUDIO_VERSION, description: "Keyless procedural Motion Studio storyboard bridge" }
    });
  }
  if (payload.method === "ping") return rpc(payload.id, {});
  if (payload.method === "tools/list") return rpc(payload.id, { tools: CONTENT_STUDIO_TOOLS });
  if (payload.method === "resources/list") return rpc(payload.id, {
    resources: [{
      name: "Margaryan Content Studio film player",
      uri: CONTENT_STUDIO_WIDGET_URI,
      description: "Playable procedural film canvas, shot list and local browser export inside ChatGPT",
      mimeType: "text/html;profile=mcp-app"
    }]
  });
  if (payload.method === "resources/read") {
    const params = isRecord(payload.params) ? payload.params : {};
    if (params.uri !== CONTENT_STUDIO_WIDGET_URI)
      return error(payload.id, -32002, "Unknown UI resource");
    // Use the hosting origin so the UI frame and Canvas renderer are first-party.
    // Public release requires a dedicated owned origin, not Vercel preview hosts.
    const studioOrigin = process.env.CONTENT_STUDIO_PUBLIC_URL || new URL(request.url).origin;
    let html: string;
    try {html = motionStudioWidgetHtml(studioOrigin);}
    catch {return error(payload.id, -32603, "Invalid studio origin configuration");}
    return rpc(payload.id, {
      contents: [{
        uri: CONTENT_STUDIO_WIDGET_URI,
        mimeType: "text/html;profile=mcp-app",
        text: html,
        _meta: {
          ui: {
            prefersBorder: false,
            csp: {
              connectDomains: [],
              resourceDomains: [],
              frameDomains: [new URL(studioOrigin).origin]
            }
          },
          "openai/ui": {availableDisplayModes: ["inline", "fullscreen"]},
          "openai/widgetDescription": "Live playback and browser-based render of a ChatGPT-authored motion graphics draft."
        }
      }]
    });
  }
  if (payload.method !== "tools/call") return error(payload.id, -32601, "Unknown MCP method");
  const params = isRecord(payload.params) ? payload.params : {};
  const name = typeof params.name === "string" ? params.name : "";
  if (!CONTENT_STUDIO_TOOLS.some(tool => tool.name === name))
    return error(payload.id, -32602, "Unknown tool");
  try {
    const result = runContentStudioTool(name, params.arguments, new URL(request.url).origin);
    return rpc(payload.id, {
      content: [
        { type: "text", text: "Motion Studio draft created (NOT an exported video). Open this preview link: " + result.editorUrl },
        { type: "text", text: result.nextStep }
      ],
      structuredContent: result,
      isError: false
    });
  } catch (e) {
    return rpc(payload.id, {
      content: [{ type: "text", text: e instanceof Error ? e.message : "Invalid Motion Studio tool arguments" }],
      isError: true
    });
  }
}
export async function GET() {
  return new Response("MCP transport requires POST", { status: 405, headers: { "Cache-Control": "no-store", Allow: "POST" } });
}
export async function DELETE() {
  return new Response("Stateless MCP transport has no session to delete", { status: 405, headers: { "Cache-Control": "no-store", Allow: "POST" } });
}
