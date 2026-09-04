import { NextResponse } from "next/server";
import OpenAI from "openai";
import { distributionStore } from "@/lib/store";
import type { ContentDraft, Language } from "@/lib/types";

function fallback(topic: string, language: Language): Omit<ContentDraft, "id" | "createdAt">[] {
  const ru = language === "ru";
  return [
    { channel: "x", language, title: "Market insight", body: ru ? `${topic}: короткий тезис о проблеме рынка, конкретный вывод и один вопрос аудитории.` : `${topic}: one sharp market observation, one concrete takeaway, and one question for the audience.`, status: "draft" },
    { channel: "linkedin", language, title: "Founder perspective", body: ru ? `Почему ${topic} имеет значение для бизнеса сейчас. Проблема → наблюдение → практический вывод → спокойный CTA.` : `Why ${topic} matters for operators now. Problem → observation → practical takeaway → low-friction CTA.`, status: "draft" },
    { channel: "instagram", language, title: "Visual proof", body: ru ? `${topic}. Визуальная демонстрация результата, короткая подпись и один следующий шаг.` : `${topic}. Visual proof of the result, concise caption, one next step.`, status: "draft" }
  ];
}

export async function POST(req: Request) {
  const body = await req.json() as { topic?: string; language?: Language; missionId?: string };
  const topic = body.topic?.trim();
  if (!topic) return NextResponse.json({ error: "topic is required" }, { status: 400 });
  const language: Language = body.language === "ru" ? "ru" : "en";

  let drafts = fallback(topic, language);
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_CONTENT_MODEL || "gpt-5.6-luna",
      instructions: "Create channel-native B2B distribution content. No fake claims, no invented metrics, no engagement bait. Return valid JSON array only with channel, title, body, callToAction. Channels: x, linkedin, instagram.",
      input: `Language: ${language}. Topic/mission: ${topic}`
    });
    try {
      const parsed = JSON.parse(response.output_text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as Array<{ channel: "x" | "linkedin" | "instagram"; title: string; body: string; callToAction?: string }>;
      if (Array.isArray(parsed) && parsed.length) drafts = parsed.map((item) => ({ ...item, language, missionId: body.missionId, status: "draft" as const }));
    } catch {
      // Fallback remains available if the model output is not parseable.
    }
  }

  const saved = distributionStore.addContent(drafts.map((draft) => ({ ...draft, missionId: body.missionId })));
  return NextResponse.json({ drafts: saved });
}
