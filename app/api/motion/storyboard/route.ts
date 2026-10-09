import { NextResponse } from "next/server";
import { createKeylessStoryboard, type DirectorBrief } from "@/lib/motion/director";

export const runtime = "nodejs";
/**
 * Stateless, bounded and intentionally public keyless endpoint for automation clients.
 * Uses zero environment variables and no external APIs; never touches Distribution CRM.
 * The Studio UI calls the exact same director locally without a request.
 */
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 5000) {
      return NextResponse.json({ error: "Brief is too large." }, { status: 413 });
    }
    const bodyText = await request.text();
    if (bodyText.length > 5000) return NextResponse.json({ error: "Brief is too large." }, { status: 413 });
    let body: DirectorBrief;
    try { body = JSON.parse(bodyText) as DirectorBrief; }
    catch { return NextResponse.json({ error: "Expected a JSON request body." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid storyboard request." }, { status: 400 });
    }
    if (!body.brand || !body.format) {
      return NextResponse.json({ error: "Both brand and format are required." }, { status: 400 });
    }
    const project = createKeylessStoryboard(body);
    return NextResponse.json(
      { project, engine: "keyless-procedural-v2", requiresApiKey: false, creditsUsed: 0, rendered: false },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid brief" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
