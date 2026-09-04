import OpenAI from "openai";
import type { CallSummary } from "@/lib/types";

const summarySchema={
  type:"object",additionalProperties:false,
  required:["language","outcome","summary","needs","objections","commitments","nextAction","nextActionAt","decisionMaker","budgetSignal","urgency"],
  properties:{
    language:{type:"string",enum:["en","ru"]},
    outcome:{type:"string",enum:["no_answer","not_interested","follow_up","qualified","meeting","do_not_contact"]},
    summary:{type:"string"},needs:{type:"array",items:{type:"string"}},objections:{type:"array",items:{type:"string"}},commitments:{type:"array",items:{type:"string"}},nextAction:{type:"string"},nextActionAt:{type:"string"},decisionMaker:{type:"string"},budgetSignal:{type:"string"},urgency:{type:"string",enum:["low","medium","high"]}
  }
} as const;

function emptyNoAnswer():CallSummary{return{language:"en",outcome:"no_answer",summary:"No meaningful prospect speech was captured.",needs:[],objections:[],commitments:[],nextAction:"Review call delivery before retrying.",urgency:"low"};}

export async function summarizeSalesConversation(transcript:string):Promise<CallSummary>{
  const clean=transcript.trim();if(!clean)return emptyNoAnswer();if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is required to summarize a real sales call");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({
    model:process.env.OPENAI_RESEARCH_MODEL||"gpt-5.6-terra",reasoning:{effort:"low"},
    instructions:[
      "Extract a terse CRM-ready B2B sales call summary using only the transcript.",
      "Never invent needs, objections, budget, decision-maker status, commitments, dates or outcomes.",
      "Use outcome=meeting only when the prospect explicitly agreed to a meeting or a concrete meeting time in the transcript.",
      "Use outcome=do_not_contact only when the prospect explicitly asks not to be contacted again. Use not_interested for an ordinary rejection.",
      "Use qualified only when the transcript contains concrete need/fit evidence. Otherwise use follow_up.",
      "nextActionAt must be an ISO timestamp only when a concrete follow-up time/date is supported by the transcript; otherwise return an empty string.",
      "For unknown decisionMaker or budgetSignal return an empty string."
    ].join(" "),
    input:clean.slice(0,30000),
    text:{format:{type:"json_schema",name:"sales_call_summary",strict:true,schema:summarySchema}}
  });
  const parsed=JSON.parse(response.output_text) as CallSummary&{nextActionAt?:string;decisionMaker?:string;budgetSignal?:string};
  return{...parsed,nextActionAt:parsed.nextActionAt||undefined,decisionMaker:parsed.decisionMaker||undefined,budgetSignal:parsed.budgetSignal||undefined};
}
