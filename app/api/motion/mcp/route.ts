import { NextResponse } from "next/server";
import { motionMcpDispatch } from "@/lib/motion/chatgpt-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 24_000;
const HEADERS = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/**
 * MCP Streamable HTTP (stateless JSON-response mode).
 * Public read-only tools operate only on bounded text. No authentication is
 * appropriate for this LIMITED demo; account state, files, jobs, billing and
 * publishing MUST NOT be added without OAuth, authorization and rate limits.
 */
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
      return NextResponse.json({ error: "application/json required" }, { status: 415, headers: HEADERS });
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES)
      return NextResponse.json({ error: "Request too large" }, { status: 413, headers: HEADERS });
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES)
      return NextResponse.json({ error: "Request too large" }, { status: 413, headers: HEADERS });
    let rpc: unknown;
    try { rpc = JSON.parse(body); }
    catch { return NextResponse.json({ jsonrpc: "2.0", id: null,
      error: { code: -32700, message: "Invalid JSON" } }, { status: 400, headers: HEADERS }); }
    if (Array.isArray(rpc)) return NextResponse.json({ jsonrpc: "2.0", id: null,
      error: { code: -32600, message: "JSON-RPC batches are not supported" } },
      { status: 400, headers: HEADERS });
    const result = motionMcpDispatch(rpc, new URL(request.url).origin);
    if (result === null) return new Response(null, { status: 202, headers: HEADERS });
    return NextResponse.json(result, { headers: HEADERS });
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null,
      error: { code: -32603, message: "Motion MCP transport error" } },
      { status: 500, headers: HEADERS });
  }
}
export async function GET() {
  return new Response("This stateless MCP server does not expose an SSE stream.", {
    status: 405, headers: { ...HEADERS, Allow: "POST" }
  });
}
