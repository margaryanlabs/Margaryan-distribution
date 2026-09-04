import { NextResponse } from "next/server";
import { buildProductBrain } from "@/lib/agent/product-brain";
import { distributionStore } from "@/lib/store";
import type { Language } from "@/lib/types";

export function GET() { return NextResponse.json({ products: distributionStore.listProducts() }); }

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name?: string; sourceUrl?: string; notes?: string; language?: Language };
    if (!body.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
    const brain = await buildProductBrain({ name: body.name.trim(), sourceUrl: body.sourceUrl?.trim() || undefined, notes: body.notes?.trim() || undefined, language: body.language === "ru" ? "ru" : "en" });
    const product = distributionStore.addProduct(brain);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Product brain failed" }, { status: 500 });
  }
}
