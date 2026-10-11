import { sanitizeMotionProject, type MotionFormat, type MotionProject, type PromptenceBeat } from "./studio";

/** A library of ten visually distinct commercial story *concepts*.
 * No invented AI-provider answers, customer names, dashboard statistics, or
 * fabricated screenshots are ever inserted into their graphics.
 */
export const BEAT_LABELS: Record<PromptenceBeat,string> = {
  question:"01 / THE QUESTION",
  answer:"02 / THE ANSWER",
  gap:"03 / VISIBILITY GAP",
  sources:"04 / SOURCE EVIDENCE",
  diagnose:"05 / DIAGNOSIS",
  priority:"06 / PRIORITIES",
  approve:"07 / HUMAN APPROVAL",
  implement:"08 / IMPLEMENTATION",
  remeasure:"09 / REMEASUREMENT",
  close:"10 / BRAND CLOSURE"
};

type Language = "en"|"ru"|"hy";
type Copy = readonly [string,string,string];
const COPY:Record<Language,Record<PromptenceBeat,Copy>>={
  en:{
    question:["BUYER INTENT","THE CUSTOMER ASKS AI.","Discovery begins with a question."],
    answer:["THE NEW FRONT PAGE","THE ANSWER TAKES SHAPE.","Not every brand is mentioned."],
    gap:["A CRITICAL BLIND SPOT","ARE YOU VISIBLE?","You cannot improve what you do not measure."],
    sources:["CITATION INTELLIGENCE","FOLLOW THE SOURCES.","Understand which evidence is referenced."],
    diagnose:["FROM SIGNAL TO CONTEXT","DIAGNOSE THE GAP.","Find the causes worth investigating."],
    priority:["ACTION PLAN","FOCUS ON WHAT MATTERS.","Rank next steps using evidence."],
    approve:["HUMAN CONTROL","REVIEW BEFORE ACTION.","Critical changes deserve approval."],
    implement:["FROM PLAN TO CHANGE","IMPLEMENT DELIBERATELY.","Connect. Apply. Verify."],
    remeasure:["THE PROOF LOOP","MEASURE AGAIN.","Compare observations, without invented uplift."],
    close:["INTRODUCING PROMPTENCE","BE PRESENT IN THE ANSWER.","AI Search Intelligence · promptence.tech"]
  },
  ru:{
    question:["ВОПРОС ПОКУПАТЕЛЯ","КЛИЕНТ СПРАШИВАЕТ ИИ.","Поиск начинается с вопроса."],
    answer:["НОВАЯ ПЕРВАЯ СТРАНИЦА","ПОЯВЛЯЕТСЯ ОТВЕТ.","В нём упоминают не все бренды."],
    gap:["СЛЕПАЯ ЗОНА","ВАС ВООБЩЕ ВИДНО?","Невозможно улучшать то, что не измерено."],
    sources:["ИСТОЧНИКИ","ИССЛЕДУЙ ИСТОЧНИКИ.","Пойми, на какие данные опирается ответ."],
    diagnose:["ОТ СИГНАЛА К ПРИЧИНЕ","НАЙДИ ПРОБЛЕМУ.","Отделяй факты от предположений."],
    priority:["ПЛАН ДЕЙСТВИЙ","ВЫБЕРИ ГЛАВНОЕ.","Приоритеты на основе наблюдений."],
    approve:["КОНТРОЛЬ ЧЕЛОВЕКА","СНАЧАЛА ПРОВЕРЬ.","Изменения требуют согласования."],
    implement:["ОТ ПЛАНА К РАБОТЕ","ВНЕДРЯЙ ОСМЫСЛЕННО.","Подключай. Меняй. Проверяй."],
    remeasure:["ЦИКЛ ДОКАЗАТЕЛЬСТВ","ИЗМЕРЬ ЕЩЁ РАЗ.","Сравни наблюдения без выдуманного роста."],
    close:["ПРЕДСТАВЛЯЕМ PROMPTENCE","БУДЬ В ОТВЕТЕ ИИ.","AI Search Intelligence · promptence.tech"]
  },
  hy:{
    question:["ԳՆՈՐԴԻ ՀԱՐՑԸ","ՀԱՃԱԽՈՐԴԸ ՀԱՐՑՆՈՒՄ Է AI-ԻՆ։","Որոնումը սկսվում է հարցից։"],
    answer:["ՆՈՐ ԱՌԱՋԻՆ ԷՋԸ","ՁԵՎԱՎՈՐՎՈՒՄ Է ՊԱՏԱՍԽԱՆԸ։","Ոչ բոլոր բրենդներն են հիշատակվում։"],
    gap:["ԱՆՏԵՍԱՆԵԼԻ ԽՆԴԻՐ","ՁԵԶ ՏԵՍՆՈ՞ՒՄ ԵՆ։","Սկզբում պետք է չափել։"],
    sources:["ԱՂԲՅՈՒՐՆԵՐ","ՀԵՏԵՎԵՔ ԱՂԲՅՈՒՐՆԵՐԻՆ։","Հասկացեք տվյալների ծագումը։"],
    diagnose:["ՊԱՏՃԱՌՆԵՐ","ԲԱՑԱՀԱՅՏԵՔ ԽՆԴԻՐԸ։","Տարբերակեք փաստերն ու ենթադրությունները։"],
    priority:["ՀԱՋՈՐԴ ՔԱՅԼԵՐԸ","ԸՆՏՐԵՔ ԿԱՐԵՎՈՐԸ։","Սահմանեք առաջնահերթությունները։"],
    approve:["ՄԱՐԴՈՒ ՎԵՐԱՀՍԿՈՒՄ","ՆԱԽ ՍՏՈՒԳԵՔ։","Փոփոխությունները պետք է հաստատել։"],
    implement:["ՓՈՓՈԽՈՒԹՅՈՒՆ","ԳՈՐԾԵՔ ԳԻՏԱԿՑՎԱԾ։","Միացրեք։ Փոխեք։ Ստուգեք։"],
    remeasure:["ԱՊԱՑՈՒՅՑ","ՉԱՓԵՔ ԿՐԿԻՆ։","Համեմատեք իրական դիտարկումները։"],
    close:["ՆԵՐԿԱՅԱՑՆՈՒՄ ԵՆՔ PROMPTENCE","ԵՂԵՔ AI-Ի ՊԱՏԱՍԽԱՆՈՒՄ։","AI Search Intelligence · promptence.tech"]
  }
};
const DEFAULT_BEATS:PromptenceBeat[]=[
  "question","answer","gap","sources","diagnose","priority","remeasure","close"
];
const DURATIONS=[4.2,4.2,4.4,4.6,4.6,4.3,4.4,5.2];
/** 8-shot starter plus 10 individually selectable compositions in Director Desk. */
export function createPromptenceProductStory(
  language:Language="ru",format:MotionFormat="portrait"
):MotionProject {
  const scenes=DEFAULT_BEATS.map((beat,index)=>{
    const [eyebrow,headline,support]=COPY[language][beat];
    return {
      id:"scene-"+(index+1),
      kind:(beat==="close"?"closer":index===0?"kinetic":"statement") as "closer"|"kinetic"|"statement",
      productBeat:beat,eyebrow,headline,support,seconds:DURATIONS[index],
      typographyScale:language==="hy"?.86:language==="ru"?.94:1,
      camera:("locked" as const),
      titleTreatment:(index===0?"kinetic":beat==="close"?"minimal":index%3===0?"editorial":"mask") as "kinetic"|"minimal"|"editorial"|"mask",
      transition:(beat==="answer"?"slide":beat==="gap"?"flash":beat==="close"?"dissolve":"auto") as "slide"|"flash"|"dissolve"|"auto"
    };
  });
  return sanitizeMotionProject({
    version:1,brand:"promptence",format,language,qualityMode:"signature",
    title:"PROMPTENCE / PRODUCT STORY / SOURCE-HONEST 8 SHOTS",
    style:"cinematic",seed:20261011,scenes
  });
}

const mint="#4EE6A1";
const pale="#E4F7EF";
const muted="#83A798";
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};

function round(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r=13,
  fill="#14221e",stroke="#557b6855"){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();
}
function line(ctx:CanvasRenderingContext2D,x:number,y:number,xx:number,yy:number,color=mint,width=2){
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function dot(ctx:CanvasRenderingContext2D,x:number,y:number,r=4,color=mint){
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill();
}
function label(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size=15,color=pale){
  ctx.fillStyle=color;ctx.font=`750 ${size}px "Noto Sans Armenian","Noto Sans",Arial,sans-serif`;
  ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText(text,x,y);
}
function frame(ctx:CanvasRenderingContext2D,W:number,H:number){
  const wide=H<810;
  const w=wide?W*.42:W*.8;
  const square=H>=810&&H<1250;
  const h=wide?H*.64:square?H*.2:Math.min(H*.28,410);
  const x=wide?W*.55:(W-w)/2;
  const y=wide?H*.2:square?H*.68:H*.72-h*.1;
  return {x,y,w,h,wide};
}
function board(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,title:string){
  ctx.shadowBlur=34;ctx.shadowColor="#00000090";
  round(ctx,x,y,w,h,16,"#0e1917","#598b7066");
  ctx.shadowBlur=0;
  round(ctx,x+12,y+12,w-24,28,7,"#20302a","#ffffff15");
  label(ctx,title,x+24,y+18,Math.min(14,w/36),pale);
  dot(ctx,x+w-30,y+26,3,mint);
}
function bars(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,rows:number,t:number,accent=mint){
  for(let i=0;i<rows;i++){
    const p=ease(t*2.6-i*.09);
    round(ctx,x,y+i*29,Math.max(3,w*p*(.36+.48*Math.abs(Math.sin(i*1.91)))),8,4,
      i%4===0?accent+"a6":"#81a89a49","#00000000");
  }
}
function caption(ctx:CanvasRenderingContext2D,W:number,H:number,code:string){
  // The upper brand-safe footer is drawn by render-engine after these shots.
  // Place provenance below its progress rule, not over real product footage.
  label(ctx,code,H<810?W*.57:W*.12,H<810?H-35:H-57,12,muted);
}
function question(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"QUESTION / CONCEPT");
  const cx=x+w*.15,cy=y+h*.46;
  dot(ctx,cx,cy,Math.min(w*.07,24),mint);
  round(ctx,x+w*.24,y+h*.32,w*.66,h*.3,14,"#1c3329","#6aab8588");
  bars(ctx,x+w*.28,y+h*.37,w*.53,3,p);
  const cursorX=x+w*.28+w*.5*ease(p);
  line(ctx,cursorX,y+h*.37,cursorX,y+h*.52,mint,3);
  caption(ctx,W,H,"BUYER INTENT / ILLUSTRATIVE");
  void t;
}
function answer(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"ANSWER / SCHEMATIC");
  const reveal=ease(p);
  bars(ctx,x+25,y+61,w-70,Math.min(6,Math.floor((h-80)/29)),p*1.25);
  round(ctx,x+22,y+h*.65,w*.45*reveal,12,5,"#54db9a66","#00000000");
  const h2=Math.min(36,h*.14);
  round(ctx,x+22,y+h-h2-16,w*.6*reveal,h2,7,"#1a4633","#4EE6A159");
  label(ctx,"BRAND PRESENCE ?",x+30,y+h-h2-9,Math.min(13,w/31),pale);
  caption(ctx,W,H,"ILLUSTRATIVE / NOT AN AI PROVIDER RESPONSE");
  void t;
}
function gap(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"VISIBILITY / UNKNOWN");
  const split=x+w*.5;
  line(ctx,split,y+57,split,y+h-28,"#91b3a353");
  bars(ctx,x+20,y+76,w*.38,Math.min(4,Math.floor((h-70)/33)),1,mint);
  for(let i=0;i<3;i++)round(ctx,split+17,y+78+i*34,w*.32,10,5,"#5c726d44","#ffffff10");
  const pulse=.5+.5*Math.sin(t*1.6);
  ctx.strokeStyle=mint;ctx.lineWidth=2.5;ctx.setLineDash([6,7]);
  ctx.beginPath();ctx.roundRect(split+w*.13,y+h*.54,Math.min(w*.23,95),Math.min(43,h*.13),9);ctx.stroke();
  ctx.setLineDash([]);
  dot(ctx,split+w*.25,y+h*.6,5+3*pulse,mint);
  caption(ctx,W,H,"EXAMPLE QUESTION / NO MEASURED RANKINGS");
  void p;
}
function sources(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  const cx=x+w*.48,cy=y+h*.54;
  ctx.strokeStyle=mint+"55";ctx.lineWidth=1.5;
  for(let i=0;i<8;i++){
    const a=i/8*TAU+t*.09;
    const r=Math.min(w*.4,h*.33);
    const px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r*.69;
    line(ctx,cx,cy,px,py,mint+"4a");
    round(ctx,px-17,py-15,34,30,6,i%2?"#294737":"#162a22","#72c69866");
    dot(ctx,px,py,3+2*ease(p-i*.07));
  }
  round(ctx,cx-40,cy-31,80,62,12,"#123a28","#80d6ab99");
  label(ctx,"?",cx-7,cy-20,32,pale);
  caption(ctx,W,H,"SOURCE GRAPH / ABSTRACT CONNECTIONS");
}
function diagnose(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"DIAGNOSE / HYPOTHESES");
  const max=Math.min(5,Math.floor((h-72)/40));
  for(let i=0;i<max;i++){
    const yy=y+56+i*40,active=i===2;
    round(ctx,x+20,yy,w-40,30,7,active?"#294936":"#192c26",active?mint+"9a":"#62877545");
    dot(ctx,x+40,yy+15,5,active?mint:muted);
    round(ctx,x+56,yy+11,(w-95)*ease(p*1.6-i*.08)*(.45+i*.07),7,3,
      active?mint+"9a":"#88aea456","#00000000");
  }
  caption(ctx,W,H,"REQUIRES VALIDATION / NO AUTOMATED CONCLUSIONS");
  void t;
}
function priority(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"PRIORITY / DECISION BOARD");
  const count=Math.min(3,Math.floor((h-72)/64));
  for(let i=0;i<count;i++){
    const yy=y+55+i*65;
    round(ctx,x+20,yy,w-40,56,8,"#192923","#4d826656");
    round(ctx,x+30,yy+9,39,38,8,"#234f35","#5ba87b66");
    label(ctx,String(i+1).padStart(2,"0"),x+38,yy+16,17,pale);
    bars(ctx,x+86,yy+14,w-150,2,ease(p*1.5-i*.09));
  }
  caption(ctx,W,H,"EDITORIAL SORTING / NO REAL PRIORITY SCORES");
  void t;
}
function approve(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"APPROVAL / HUMAN GATE");
  const cx=x+w/2,cy=y+h*.56,r=Math.min(w,h)*.17;
  ctx.strokeStyle="#5caf8588";ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(cx,cy,r,Math.PI*.9,Math.PI*(.9+1.7*ease(p)));ctx.stroke();
  dot(ctx,cx,cy,10,mint);
  line(ctx,cx-r*.38,cy,cx-r*.06,cy+r*.27,pale,5);
  line(ctx,cx-r*.06,cy+r*.27,cx+r*.48,cy-r*.38,pale,5);
  caption(ctx,W,H,"EXPLICIT APPROVAL / CONCEPT ONLY");
  void t;
}
function implement(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  const n=4,y0=y+h*.54;
  for(let i=0;i<n;i++){
    const cx=x+w*(i+.5)/n;
    round(ctx,cx-w*.105,y0-25,w*.21,70,9,"#182e25",i<=p*(n+.5)?mint+"ae":"#728b7e56");
    label(ctx,["01","02","03","04"][i],cx-w*.052,y0-5,Math.max(12,Math.min(19,w/28)),p>i/n?mint:muted);
    if(i<n-1)line(ctx,cx+w*.1,y0+10,cx+w*.14,y0+10,mint+"83",3);
  }
  caption(ctx,W,H,"CONNECT → APPLY → VERIFY / DIAGRAM ONLY");
  void t;
}
function remeasure(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  board(ctx,x,y,w,h,"BASELINE / REMEASURE");
  const left=x+25,right=x+w-25,top=y+62,bottom=y+h-30;
  line(ctx,left,bottom,right,bottom,muted+"65");
  const mid=(left+right)/2;
  line(ctx,mid,top,mid,bottom,"#bce7d43b");
  for(let lane=0;lane<2;lane++){
    const x0=lane===0?left:mid+10,x1=lane===0?mid-10:right;
    ctx.beginPath();
    for(let i=0;i<42;i++){
      const xx=x0+(x1-x0)*i/41;
      const yy=bottom-(bottom-top)*(.37+.16*Math.sin(i*.19+lane*.35+t*.06));
      if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.strokeStyle=lane===0?"#789889aa":mint+"bb";
    ctx.lineWidth=lane===0?2:3;
    if(lane===0)ctx.setLineDash([6,7]);
    ctx.stroke();ctx.setLineDash([]);
  }
  line(ctx,x+w*(.08+.82*ease(p)),top,x+w*(.08+.82*ease(p)),bottom,mint+"88",1.5);
  caption(ctx,W,H,"ILLUSTRATIVE SHAPES / NOT PERFORMANCE DELTA");
}
function close(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=frame(ctx,W,H);
  const cx=x+w*.5,cy=y+h*.51;
  const r=Math.min(w*.36,h*.47);
  ctx.strokeStyle=mint+"8a";ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(cx,cy,r,Math.PI*.9,Math.PI*(.9+1.85*ease(p)));ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,r*.62,0,TAU);ctx.strokeStyle="#b4eed166";ctx.stroke();
  dot(ctx,cx,cy,14,mint);
  caption(ctx,W,H,"PROMPTENCE / CONCEPTUAL BRAND FILM");
  void t;
}
const DRAW:Record<PromptenceBeat,(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number)=>void>={
  question,answer,gap,sources,diagnose,priority,approve,implement,remeasure,close
};
/** All ten shots have independent compositions, none show actual vendor answers. */
export function drawPromptenceBeat(ctx:CanvasRenderingContext2D,beat:PromptenceBeat,
  W:number,H:number,time:number,progress:number){
  ctx.save();
  const enter=ease(progress*3.2);
  ctx.globalAlpha*=enter*ease((1-progress)*9);
  const offset=(1-enter)*Math.min(46,H*.07);
  ctx.translate(0,offset);
  DRAW[beat](ctx,W,H,time,progress);
  ctx.restore();
}
