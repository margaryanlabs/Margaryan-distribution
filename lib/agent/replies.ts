import OpenAI from "openai";
import type { InboundReplyDecision, Language, Lead, MissionRecord, ProductRecord, ReplyIntent } from "@/lib/types";

const replySchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "summary", "confidence", "recommendedAction", "draftReply", "nextActionDelayHours", "urgency", "reasoning"],
  properties: {
    intent: { type: "string", enum: ["positive", "question", "negative", "ooo", "unsubscribe", "other"] },
    summary: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    recommendedAction: { type: "string", enum: ["reply", "meeting", "call", "wait", "stop", "review"] },
    draftReply: { type: "string" },
    nextActionDelayHours: { type: "number", minimum: 0, maximum: 720 },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    reasoning: { type: "string" }
  }
} as const;

function normalize(text: string) { return text.toLowerCase().replace(/\s+/g, " ").trim(); }

function heuristicIntent(text: string): ReplyIntent {
  const value = normalize(text);
  if (/unsubscribe|remove me|stop emailing|do not contact|opt out|отпис|не пишите|не связывайтесь/.test(value)) return "unsubscribe";
  if (/out of office|automatic reply|away until|vacation|автоответ|в отпуск|отсутствую/.test(value)) return "ooo";
  if (/not interested|no thanks|not relevant|неинтерес|не актуал|не нужно|нет, спасибо/.test(value)) return "negative";
  if (/book|calendar|meeting|demo|call me|let'?s talk|interested|sounds good|созвон|встреч|демо|интересно|давайте/.test(value)) return "positive";
  if (/\?|how |what |when |where |price|pricing|cost|сколько|как |что |когда |цена|стоимост/.test(value)) return "question";
  return "other";
}

function fallback(args: { text: string; language: Language; lead?: Lead; product?: ProductRecord }): InboundReplyDecision {
  const intent = heuristicIntent(args.text);
  const russian = args.language === "ru";
  const company = args.lead?.company || (russian ? "компания" : "the company");
  const product = args.product?.name || (russian ? "продукт" : "the product");
  if (intent === "unsubscribe") return { intent, summary: russian ? "Получатель попросил прекратить контакт." : "Recipient asked to stop contact.", confidence: 0.92, recommendedAction: "stop", draftReply: "", nextActionDelayHours: 0, urgency: "high", reasoning: "Explicit opt-out language." };
  if (intent === "negative") return { intent, summary: russian ? "Лид отказался или сообщил, что предложение неактуально." : "Lead declined or said the offer is not relevant.", confidence: 0.82, recommendedAction: "stop", draftReply: "", nextActionDelayHours: 0, urgency: "low", reasoning: "Negative-interest language detected." };
  if (intent === "ooo") return { intent, summary: russian ? "Автоответ / временное отсутствие." : "Out-of-office or temporary absence reply.", confidence: 0.85, recommendedAction: "wait", draftReply: "", nextActionDelayHours: 120, urgency: "low", reasoning: "Out-of-office language detected." };
  if (intent === "positive") return { intent, summary: russian ? "Есть позитивный интерес к продолжению разговора." : "There is positive interest in continuing the conversation.", confidence: 0.78, recommendedAction: "meeting", draftReply: russian ? `Спасибо. Предлагаю коротко созвониться и показать, как ${product} может применяться к ${company}. Какое время вам удобно?` : `Thanks. A short call is probably the easiest next step to see whether ${product} fits ${company}. What time works for you?`, nextActionDelayHours: 0, urgency: "high", reasoning: "Positive-intent language detected." };
  if (intent === "question") return { intent, summary: russian ? "Лид задал уточняющий вопрос." : "Lead asked a follow-up question.", confidence: 0.75, recommendedAction: "reply", draftReply: russian ? "Спасибо за вопрос. Я отвечу только по подтверждённым данным о продукте и, если нужно, предложу короткий созвон." : "Thanks for the question. I’ll answer using only verified product information and, if useful, suggest a short call.", nextActionDelayHours: 0, urgency: "medium", reasoning: "Question language detected." };
  return { intent, summary: russian ? "Ответ требует ручной проверки." : "Reply needs human review.", confidence: 0.45, recommendedAction: "review", draftReply: "", nextActionDelayHours: 0, urgency: "medium", reasoning: "No strong intent pattern detected." };
}

export async function classifyInboundReply(args: { from: string; subject: string; text: string; language: Language; lead?: Lead; mission?: MissionRecord; product?: ProductRecord }): Promise<InboundReplyDecision> {
  if (!process.env.OPENAI_API_KEY) return fallback(args);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_CONTENT_MODEL || "gpt-5.6-luna",
    reasoning: { effort: "low" },
    instructions: [
      "You are the reply-intelligence layer of a governed B2B sales agent.",
      "Classify only the supplied message. Never infer facts that are not present.",
      "An explicit unsubscribe or do-not-contact request must always map to intent=unsubscribe and recommendedAction=stop.",
      "A clear rejection maps to negative/stop. An out-of-office reply maps to ooo/wait.",
      "For positive interest or a factual question, draft a concise response using only verified product context supplied below.",
      "Do not invent pricing, ROI, customers, integrations, availability, meeting times or product capabilities.",
      "The draft must not pressure the recipient. Keep it under 100 words.",
      `Write summary, reasoning and draftReply in ${args.language === "ru" ? "Russian" : "English"}.`
    ].join(" "),
    input: JSON.stringify({ message: { from: args.from, subject: args.subject, text: args.text }, lead: args.lead || null, mission: args.mission?.input || null, product: args.product || null }),
    text: { format: { type: "json_schema", name: "inbound_reply_decision", strict: true, schema: replySchema } }
  });
  const parsed = JSON.parse(response.output_text) as InboundReplyDecision;
  return { ...parsed, confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0))), nextActionDelayHours: Math.max(0, Math.min(720, Number(parsed.nextActionDelayHours || 0))) };
}
