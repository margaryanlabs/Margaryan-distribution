import OpenAI from "openai";
import { NextResponse } from "next/server";
import { sanitizeMotionProject, type MotionBrand, type MotionFormat } from "@/lib/motion/studio";

export const runtime = "nodejs";

const motionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "scenes"],
  properties: {
    title: { type: "string" },
    scenes: {
      type: "array", minItems: 3, maxItems: 6,
      items: {
        type: "object", additionalProperties: false,
        required: ["kind", "eyebrow", "headline", "support", "seconds"],
        properties: {
          kind: { type: "string", enum: ["opener", "statement", "network", "closer"] },
          eyebrow: { type: "string" },
          headline: { type: "string" },
          support: { type: "string" },
          seconds: { type: "number", minimum: 2, maximum: 8 }
        }
      }
    }
  }
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 12 || prompt.length > 2000) {
      return NextResponse.json({ error: "Describe the video in 12–2000 characters." }, { status: 400 });
    }
    if (!["veto", "promptence", "raios", "labs"].includes(String(body.brand)) ||
        !["portrait", "square", "landscape"].includes(String(body.format))) {
      return NextResponse.json({ error: "Unsupported brand or format." }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AI storyboarding is not configured. Add OPENAI_API_KEY to the server. Brand templates and manual editing work without it." }, { status: 503 });
    }
    const brand = body.brand as MotionBrand;
    const format = body.format as MotionFormat;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const result = await client.responses.create({
      model: process.env.OPENAI_MOTION_MODEL || process.env.OPENAI_PLANNER_MODEL || "gpt-5.6-terra",
      instructions: [
        "You are Motion Director for Margaryan Labs, writing a structured motion-graphics storyboard.",
        "Make 3–6 cinematic, concise scenes suitable for 9:16, 1:1 or 16:9 programmatic typography animation.",
        "Opening hook, escalating insight, visual network/signal motif, and a strong closing call to action.",
        "Copy must be usable as on-screen text. Headline ideally 2–8 words, eyebrow 2–5 words, support 3–12 words.",
        "Use concise compelling visual language. Avoid emoji, overly long sentences and typography clutter.",
        "Never fabricate trading results, product customers, audit measurements, social proof, ROI or guarantees.",
        "If the user asks for real metrics and provides none, keep the words qualitative.",
        "The output is a plan, not a claim that media was generated or published.",
        "This is static text animation: no stock-footage references, unsupported image or 3D promises."
      ].join(" "),
      input: JSON.stringify({ brief: prompt, brand, format }),
      max_output_tokens: 1700,
      text: { format: { type: "json_schema", name: "motion_storyboard", strict: true, schema: motionSchema } }
    });
    if (!result.output_text) throw new Error("Empty storyboard response");
    const generated = JSON.parse(result.output_text) as Record<string, unknown>;
    const project = sanitizeMotionProject({ ...generated, brand, format });
    return NextResponse.json({ project, engine: "openai-storyboard", rendered: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[motion] Storyboard generation failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Storyboard generation failed. Retry or use a built-in template." }, { status: 502 });
  }
}
