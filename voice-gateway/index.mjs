import http from "node:http";
import {WebSocketServer,WebSocket} from "ws";

const port=Number(process.env.PORT||8080);
const model=process.env.OPENAI_REALTIME_MODEL||"gpt-realtime-2.1-mini";
const transcribeModel=process.env.OPENAI_TRANSCRIBE_MODEL||"gpt-live-transcribe";
const key=process.env.OPENAI_API_KEY;
if(!key)throw new Error("OPENAI_API_KEY required");

const server=http.createServer((req,res)=>{res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify({ok:true,service:"margaryan-distribution-voice",model,transcribeModel}));});
const wss=new WebSocketServer({server,path:"/twilio"});

wss.on("connection",twilio=>{
  let streamSid=null,callSid=null,startedAt=null,configured=false,openingSent=false,finalized=false,stopTimer=null;
  let metadata={};const transcript=[];const pendingAudio=[];
  const ai=new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,{headers:{Authorization:`Bearer ${key}`}});

  function safe(value,max=800){return typeof value==="string"?value.replace(/[\r\n]+/g," ").trim().slice(0,max):"";}
  function instructions(){
    const leadName=safe(metadata.leadName,160),objective=safe(metadata.objective,1200),language=metadata.language==="ru"?"Russian":"English";
    return [
      "You are an AI sales representative conducting a short B2B outbound qualification call.",
      "At the beginning identify yourself clearly as an AI representative and state the business purpose of the call.",
      `Preferred conversation language: ${language}. Switch naturally if the prospect uses the other supported language.`,
      leadName?`Prospect/company label: ${leadName}.`:"",
      objective?`Approved opening/objective: ${objective}`:"",
      "Ask one question at a time. Listen more than you speak. Keep turns concise and conversational.",
      "Use only information contained in the approved objective and what the prospect says. Never invent customers, metrics, pricing, integrations, ROI, availability or authority.",
      "Never claim a calendar meeting is booked unless an external booking system has actually confirmed it. You may verbally agree on a proposed next step or time.",
      "Never take payment or make a binding commitment. If the prospect asks not to be contacted again, acknowledge once, stop selling immediately and end politely."
    ].filter(Boolean).join(" ");
  }
  function flushAudio(){while(configured&&ai.readyState===WebSocket.OPEN&&pendingAudio.length)ai.send(JSON.stringify({type:"input_audio_buffer.append",audio:pendingAudio.shift()}));}
  function configure(){
    if(configured||!callSid||ai.readyState!==WebSocket.OPEN)return;
    configured=true;
    ai.send(JSON.stringify({type:"session.update",session:{type:"realtime",output_modalities:["audio"],instructions:instructions(),audio:{input:{format:{type:"audio/pcmu"},transcription:{model:transcribeModel},turn_detection:{type:"server_vad"}},output:{format:{type:"audio/pcmu"},voice:process.env.OPENAI_VOICE||"marin"}}}}));
    flushAudio();
    if(!openingSent){openingSent=true;ai.send(JSON.stringify({type:"response.create",response:{instructions:"Open the call now with a brief AI disclosure, business purpose, and the approved opening. Then ask one short qualification question."}}));}
  }
  async function postCompletion(){
    if(finalized||!callSid)return;finalized=true;if(stopTimer)clearTimeout(stopTimer);
    const base=process.env.VOICE_CALLBACK_URL||(process.env.APP_BASE_URL?`${process.env.APP_BASE_URL.replace(/\/$/,"")}/api/voice/complete`:"");
    const payload={callSid,streamSid,metadata,transcript,startedAt,completedAt:new Date().toISOString()};
    console.log(JSON.stringify({event:"call_completed",callSid,streamSid,turns:transcript.length,metadata}));
    if(!base)return console.warn("VOICE_CALLBACK_URL or APP_BASE_URL is not configured; transcript was not posted back");
    try{const res=await fetch(base,{method:"POST",headers:{"content-type":"application/json",...(process.env.VOICE_CALLBACK_SECRET?{"x-voice-secret":process.env.VOICE_CALLBACK_SECRET}:{})},body:JSON.stringify(payload)});if(!res.ok)console.error("voice completion callback failed",res.status,await res.text());}
    catch(error){console.error("voice completion callback error",error);}
    finally{if(ai.readyState===WebSocket.OPEN||ai.readyState===WebSocket.CONNECTING)ai.close();}
  }

  ai.on("open",configure);
  twilio.on("message",raw=>{
    const msg=JSON.parse(raw.toString());
    if(msg.event==="start"){
      streamSid=msg.start?.streamSid||null;callSid=msg.start?.callSid||null;metadata=msg.start?.customParameters||{};startedAt=new Date().toISOString();configure();
    }else if(msg.event==="media"){
      const audio=msg.media?.payload;if(!audio)return;
      if(configured&&ai.readyState===WebSocket.OPEN)ai.send(JSON.stringify({type:"input_audio_buffer.append",audio}));
      else{pendingAudio.push(audio);if(pendingAudio.length>150)pendingAudio.shift();}
    }else if(msg.event==="stop"){
      stopTimer=setTimeout(()=>void postCompletion(),800);
    }
  });
  ai.on("message",raw=>{
    const e=JSON.parse(raw.toString());
    if(e.type==="response.output_audio.delta"&&streamSid&&twilio.readyState===WebSocket.OPEN)twilio.send(JSON.stringify({event:"media",streamSid,media:{payload:e.delta}}));
    if(e.type==="response.output_audio_transcript.done"&&typeof e.transcript==="string"&&e.transcript.trim())transcript.push({speaker:"agent",text:e.transcript.trim(),at:new Date().toISOString()});
    if(e.type==="conversation.item.input_audio_transcription.completed"&&typeof e.transcript==="string"&&e.transcript.trim())transcript.push({speaker:"prospect",text:e.transcript.trim(),at:new Date().toISOString()});
    if(e.type==="input_audio_buffer.speech_started"&&streamSid&&twilio.readyState===WebSocket.OPEN){twilio.send(JSON.stringify({event:"clear",streamSid}));ai.send(JSON.stringify({type:"response.cancel"}));}
    if(e.type==="error")console.error("openai realtime event error",e.error||e);
  });
  twilio.on("close",()=>{if(!finalized)setTimeout(()=>void postCompletion(),250);});
  twilio.on("error",error=>{console.error("twilio websocket error",error);if(!finalized)setTimeout(()=>void postCompletion(),250);});
  ai.on("error",error=>console.error("openai realtime websocket error",error));
});

server.listen(port,()=>console.log(`voice gateway listening on :${port}`));
