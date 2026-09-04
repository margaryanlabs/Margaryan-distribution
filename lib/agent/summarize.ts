import OpenAI from "openai";
import type { CallSummary } from "@/lib/types";

export async function summarizeSalesConversation(transcript: string): Promise<CallSummary> {
  const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response = await client.responses.create({
    model:"gpt-5.6-terra",
    input:[
      {role:"system",content:[{type:"input_text",text:"Extract a terse CRM-ready B2B sales summary. Return JSON only with: language, outcome, summary, needs[], objections[], commitments[], nextAction, nextActionAt?, decisionMaker?, budgetSignal?, urgency. outcome must be one of no_answer, not_interested, follow_up, qualified, meeting, do_not_contact. urgency low|medium|high."}]},
      {role:"user",content:[{type:"input_text",text:transcript}]}
    ]
  });
  return JSON.parse(response.output_text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"")) as CallSummary;
}
