import type { MotionProject } from "./studio";
import { getLoadedMotionLogo } from "./brand-assets";

const TAU=Math.PI*2, MINT="#4EE6A1";
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-(1-clamp(n))**3;
function line(ctx:CanvasRenderingContext2D,x:number,y:number,x2:number,y2:number,color:string,width=1){
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function tag(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size=16,color="#B8CECA",weight=650){
  ctx.font=weight+" "+size+'px "Noto Sans Armenian", "Noto Sans", Arial, sans-serif';
  ctx.textBaseline="top";ctx.textAlign="left";ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function glass(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r=20){
  ctx.fillStyle="#091914D9";ctx.strokeStyle="#5C918054";
  ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();
}
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,alpha=.2){
  const g=ctx.createRadialGradient(x,y,5,x,y,r);
  g.addColorStop(0,"rgba(78,230,161,"+alpha+")");
  g.addColorStop(1,"rgba(78,230,161,0)");
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
}
function reticle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,t:number,opacity=1){
  ctx.save();ctx.globalAlpha*=opacity;
  for(let i=0;i<4;i++){
    const radius=r*(.4+i*.32);
    ctx.beginPath();ctx.ellipse(x,y,radius,radius*.44,-.15+t*.035,0,TAU);
    ctx.strokeStyle=i===0?"#4EE6A1A8":"#D6FFF52A";ctx.lineWidth=i===0?1.9:1.0;ctx.stroke();
  }
  for(let i=0;i<16;i++){
    const a=i*TAU/16+t*.24,radius=r*(.8+(i%3)*.24);
    ctx.fillStyle=i%5===0?"#4EE6A1":"#AACBCB50";
    ctx.beginPath();ctx.arc(x+Math.cos(a)*radius,y+Math.sin(a)*radius*.47,1.3+i%2,0,TAU);ctx.fill();
  }
  ctx.restore();
}
function micro(ctx:CanvasRenderingContext2D,value:string,x:number,y:number){
  tag(ctx,value,x,y,12,"#729E8D",600);
}
function rays(ctx:CanvasRenderingContext2D,x:number,y:number,t:number,length:number){
  ctx.save();
  for(let i=0;i<38;i++){
    const a=i*TAU/38+t*.018;
    const start=45+(i%4)*19,finish=length*(.48+i%8*.075);
    line(ctx,x+Math.cos(a)*start,y+Math.sin(a)*start*.47,
      x+Math.cos(a)*finish,y+Math.sin(a)*finish*.47,
      i%7===0?"#4EE6A136":"#A5D4CA17",1);
  }
  ctx.restore();
}
function progress(ctx:CanvasRenderingContext2D,p:number,x:number,y:number,w:number){
  line(ctx,x,y,x+w,y,"#FFFFFF29",2);line(ctx,x,y,x+w*clamp(p),y,MINT,3);
}
function panelPosition(W:number,H:number){
  const wide=H<810,square=H<1250&&!wide;
  return wide
    ?{x:W*.54,y:H*.19,w:W*.39,h:H*.62,wide}
    :{x:88,y:square?H*.69:H*.68,w:W-176,h:square?H*.20:H*.245,wide};
}
function drawQuestion(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h,wide}=panelPosition(W,H);
  const yy=y+Math.sin(t*1.4)*6;
  glow(ctx,x+w*.5,yy+h*.55,w*.75,.27);
  glass(ctx,x,yy,w,h);
  micro(ctx,"01 / BUYER INTENT  •  CONCEPT VISUAL",x+23,yy+19);
  tag(ctx,wide?"WHAT SHOULD I CHOOSE?":"What should I choose?",x+25,yy+h*.34,wide?29:37,"#E7F3EF",780);
  line(ctx,x+25,yy+h*.59,x+w-25,yy+h*.59,"#4EE6A16C",1);
  const xArrow=x+w-65,yArrow=yy+h-53;
  ctx.strokeStyle=MINT;ctx.lineWidth=3;ctx.beginPath();
  ctx.moveTo(xArrow-15,yArrow);ctx.lineTo(xArrow+4,yArrow);ctx.moveTo(xArrow-4,yArrow-10);
  ctx.lineTo(xArrow+6,yArrow);ctx.lineTo(xArrow-4,yArrow+10);ctx.stroke();
  progress(ctx,ease(p),x+25,yy+h-39,w*.45);
}
function drawAbsent(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h,wide}=panelPosition(W,H);
  glow(ctx,x+w*.48,y+h*.5,w*.9,.18);
  glass(ctx,x,y,w,h);
  micro(ctx,"OBSERVED ANSWER / ILLUSTRATIVE ONLY",x+22,y+18);
  const rowH=wide?44:39;
  for(let i=0;i<3;i++){
    const py=y+h*.38+i*rowH;
    if(py>y+h-30)break;
    ctx.fillStyle=i===1?"#303936":"#1B2E29";
    ctx.beginPath();ctx.roundRect(x+23,py,w-46,rowH-11,9);ctx.fill();
    ctx.fillStyle=i===1?"#779D8E":MINT;
    ctx.fillRect(x+35,py+13,16,3);
    ctx.fillStyle=i===1?"#4EE6A144":"#96C5B468";
    ctx.fillRect(x+63,py+12,w*.36,5);
  }
  const cx=x+w*.79,cy=y+h*.63;
  ctx.beginPath();ctx.arc(cx,cy,wide?31:35,0,TAU);
  ctx.strokeStyle=MINT;ctx.lineWidth=2;ctx.setLineDash([7,8]);ctx.stroke();ctx.setLineDash([]);
  line(ctx,cx-13,cy+13,cx+14,cy-14,MINT,3);
  if(p>.58)tag(ctx,"NOT A LIVE RESULT",x+21,y+h-35,12,"#8FB3A2");
}
function drawTrace(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=panelPosition(W,H);
  const center=x+w*.5,cy=y+h*.57;
  rays(ctx,center,cy,t,w*.72);reticle(ctx,center,cy,Math.min(w*.37,h*.42),t);
  const pts=13;
  for(let i=0;i<pts;i++){
    const angle=i*2.4+t*.1,r=36+i*14;
    const px=center+Math.cos(angle)*r,py=cy+Math.sin(angle)*r*.55;
    glow(ctx,px,py,i%4===0?22:11,.21);
    ctx.fillStyle=i%3===0?MINT:"#B5DBD0A0";
    ctx.beginPath();ctx.arc(px,py,i%3===0?3.6:2.1,0,TAU);ctx.fill();
  }
  micro(ctx,"DISCOVERY / SOURCE EVIDENCE / CONCEPTUAL",x+11,y+h-21);
}
function drawMethod(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h,wide}=panelPosition(W,H);
  const items=["DISCOVER","MEASURE","DIAGNOSE"];
  const gap=wide?10:14,cardW=(w-gap*2)/3;
  const height=Math.min(h*.72,170);
  glow(ctx,x+w*.48,y+h*.52,w*.65,.15);
  items.forEach((item,i)=>{
    const cx=x+i*(cardW+gap),py=y+(1-ease(p))*30+Math.sin(t*.65+i)*3;
    glass(ctx,cx,py,cardW,height,10);
    tag(ctx,"0"+(i+1),cx+12,py+14,wide?12:18,MINT,830);
    const size=Math.max(11,Math.min(wide?12:20,cardW/7.7));
    tag(ctx,item,cx+12,py+height*.46,size,"#E2F4EE",800);
    progress(ctx,ease((p-i*.13)*1.4),cx+12,py+height-22,cardW-24);
  });
  micro(ctx,"A WORKFLOW, NOT A CLAIM OF GUARANTEED RANKINGS",x+3,y+h-15);
}
function drawPriority(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=panelPosition(W,H);
  glass(ctx,x,y,w,h);
  micro(ctx,"MEASUREMENT → REVIEW → ACTION / CONCEPT VISUAL",x+18,y+19);
  const labels=["EVIDENCE","PRIORITY","VERIFY"];
  for(let i=0;i<3;i++){
    const yy=y+62+i*(h-76)/3;
    if(yy+26>y+h)break;
    const active=p*3>i+.1;
    ctx.beginPath();ctx.arc(x+28,yy+9,9,0,TAU);
    ctx.strokeStyle=active?MINT:"#6D91837A";ctx.lineWidth=2;ctx.stroke();
    if(active){ctx.beginPath();ctx.arc(x+28,yy+9,3.5,0,TAU);ctx.fillStyle=MINT;ctx.fill();}
    tag(ctx,labels[i],x+52,yy-2,Math.max(12,Math.min(21,h*.095)),"#DAF3E8",750);
    line(ctx,x+52,yy+23,x+w-28,yy+23,"#67968827",1);
  }
}
function drawRemeasure(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=panelPosition(W,H);
  glass(ctx,x,y,w,h);micro(ctx,"BEFORE & AFTER / NO INVENTED PERFORMANCE DATA",x+16,y+16);
  const pad=32,baseline=y+h*.71,amp=h*.27;
  line(ctx,x+pad,baseline,x+w-pad,baseline,"#B0F2D66A",1);
  for(let k=0;k<2;k++){
    ctx.beginPath();
    for(let i=0;i<80;i++){
      const xx=x+pad+i/79*(w-2*pad);
      const phase=i/79*TAU*1.55+t*.18;
      const yy=baseline-amp*(.33+k*.12)+Math.sin(phase+k*.65)*amp*(.20+k*.1);
      if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
    }
    ctx.strokeStyle=k?"#4EE6A1":"#819E918D";ctx.lineWidth=k?3:1.8;
    if(!k)ctx.setLineDash([5,6]);ctx.stroke();ctx.setLineDash([]);
  }
  tag(ctx,"REMEASURE",x+pad,y+h-36,14,MINT,750);
  ctx.fillStyle=MINT;ctx.beginPath();ctx.arc(x+pad+(w-2*pad)*p,baseline-amp*.5,3,0,TAU);ctx.fill();
}
function drawCloser(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,p:number){
  const {x,y,w,h}=panelPosition(W,H);
  const center=x+w*.5,cy=y+h*.46;
  glow(ctx,center,cy,Math.min(w,540),.45);
  reticle(ctx,center,cy,Math.min(w*.42,h*.39),t,.65);
  const logo=getLoadedMotionLogo("promptence");
  if(logo){
    const size=Math.min(w*.24,h*.49);
    ctx.drawImage(logo,center-size*.5,cy-size*.5,size,size);
  }
  const below=y+h*.83;
  tag(ctx,"PROMPTENCE.TECH",x+Math.max(0,w*.32),below,Math.max(14,Math.min(25,w/23)),"#EFFCF6",820);
  progress(ctx,ease(p),x+w*.2,y+h-12,w*.6);
}
/**
 * Film-specific composition only for the explicitly authored signature film.
 * All screenlike motifs are clearly marked as illustrative, never actual scans.
 */
export function drawPromptenceSignatureArt(ctx:CanvasRenderingContext2D,project:MotionProject,index:number,
  t:number,progressValue:number,W:number,H:number) {
  if(project.signatureFilm!=="promptence-answer"||project.brand!=="promptence")return;
  const p=clamp(progressValue);
  ctx.save();
  ctx.globalAlpha*=Math.min(1,.35+p*4);
  if(index===0){
    const {x,y,w,h}=panelPosition(W,H);
    glow(ctx,x+w*.51,y+h*.58,w*.77,.43);
    reticle(ctx,x+w*.52,y+h*.53,Math.min(w*.47,h*.48),t);
    rays(ctx,x+w*.52,y+h*.53,t,w*.6);
    micro(ctx,"THE NEW DISCOVERY SURFACE",x+9,y+h-13);
  }else if(index===1)drawQuestion(ctx,W,H,t,p);
  else if(index===2)drawAbsent(ctx,W,H,t,p);
  else if(index===3)drawTrace(ctx,W,H,t,p);
  else if(index===4)drawMethod(ctx,W,H,t,p);
  else if(index===5)drawPriority(ctx,W,H,t,p);
  else if(index===6)drawRemeasure(ctx,W,H,t,p);
  else drawCloser(ctx,W,H,t,p);
  ctx.restore();
}
