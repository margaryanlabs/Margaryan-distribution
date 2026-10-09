import type { MotionProject, MotionScene } from "./studio";

/** Branded illustrative UI compositions (no fabricated results, logos, market values, or customer metrics). */
function rounded(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}
function label(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size=19,color="#dbe6e8",weight=600) {
  ctx.font=weight+" "+size+"px Arial, sans-serif";ctx.textAlign="left";ctx.textBaseline="top";
  ctx.fillStyle=color;ctx.fillText(text,x,y);
}
function line(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,color:string,h=4) {
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
}
function softGlow(ctx:CanvasRenderingContext2D,x:number,y:number,accent:string,r=240) {
  const g=ctx.createRadialGradient(x,y,4,x,y,r);
  g.addColorStop(0,accent+"36");g.addColorStop(1,accent+"00");
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
}
function panel(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,accent:string) {
  ctx.shadowBlur=70;ctx.shadowColor="#000000b0";
  rounded(ctx,x,y,w,h,22,"#111b20ed",accent+"2f");
  ctx.shadowBlur=0;
  line(ctx,x+24,y+23,38,accent,4);
}
function promptence(ctx:CanvasRenderingContext2D,scene:MotionScene,x:number,y:number,w:number,accent:string,t:number){
  const h=290;softGlow(ctx,x+w*.63,y+h*.45,accent,260);
  panel(ctx,x,y,w,h,accent);
  label(ctx,"AI DISCOVERY / ILLUSTRATIVE",x+30,y+33,14,accent,800);
  rounded(ctx,x+30,y+81,w-60,50,11,"#1a282c","#385047");
  label(ctx,"Where can customers discover this brand?",x+48,y+97,19,"#f5f7f2",500);
  const channels=["ANSWER","SOURCES","ENTITY","ACTION"];
  const n=Math.max(0,Math.floor((t*1.2)%5));
  channels.forEach((tag,i)=>{
    rounded(ctx,x+30+i*(w-60)/4,y+156,(w-78)/4,39,8,i<=n?"#254a3c":"#19282c",i===n?accent+"9a":undefined);
    label(ctx,tag,x+42+i*(w-60)/4,y+168,13,i<=n?accent:"#798e8e",800);
  });
  line(ctx,x+30,y+226,(w-60)*(.26+.5*(.5+.5*Math.sin(t))),accent+"a8",7);
  label(ctx,"Inspect evidence. Never guess the outcome.",x+30,y+253,14,"#8fada5",500);
  void scene;
}
function veto(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  panel(ctx,x,y,w,275,accent);
  label(ctx,"DECISION CONTEXT / ILLUSTRATIVE",x+30,y+33,14,accent,800);
  const cells=[["REGIME","UNCERTAIN"],["RISK","REVIEW"],["ACTION","WAIT"]];
  cells.forEach(([name,val],i)=>{
    const px=x+30+i*(w-60)/3;
    rounded(ctx,px,y+88,(w-80)/3,113,12,"#20252bd9","#53586045");
    label(ctx,name,px+15,y+104,13,"#86939d",700);
    label(ctx,val,px+15,y+140,19,i===2?accent:"#ebedf1",800);
  });
  line(ctx,x+30,y+238,(w-60)*(.28+.43*(.5+.5*Math.sin(t*.68))),accent,4);
}
function raios(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  panel(ctx,x,y,w,285,accent);
  label(ctx,"RESTAURANT OPERATIONS / CONCEPT",x+30,y+30,14,accent,800);
  const cards=["CONNECT","DETECT","APPROVE","VERIFY"];
  cards.forEach((v,i)=>{
    const px=x+30+i*(w-65)/4;
    rounded(ctx,px,y+101,(w-90)/4,65,8,i<=Math.floor(t)%4?"#243c49":"#1b2630","#42607c55");
    label(ctx,v,px+11,y+126,13,"#c8d8e5",700);
    if(i<3)label(ctx,"›",px+(w-90)/4+3,y+127,25,accent,800);
  });
  label(ctx,"Evidence before and after an approved change",x+30,y+220,17,"#b6c7d2",500);
}
function suren(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  softGlow(ctx,x+w*.7,y+135,accent,290);
  ctx.save();ctx.strokeStyle=accent+"56";
  for(let i=0;i<21;i++){
    const xx=x+i*w/21, hh=55+(i*i*13%130)+Math.sin(i*.8+t*.15)*9;
    rounded(ctx,xx,y+265-hh,w/27,hh,2,"#ddd0c433");
    ctx.strokeRect(xx,y+265-hh,w/27,hh);
  }
  ctx.restore();
  label(ctx,"PRIVATE INVESTMENT PERSPECTIVE",x+16,y+38,17,accent,800);
  label(ctx,"DUBAI / ARCHITECTURE / CAPITAL",x+16,y+75,14,"#c4c2c0",500);
}
function ingu(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  const yy=y+20;
  ctx.save();ctx.translate(x+w*.55,yy+135);ctx.rotate(Math.sin(t*.3)*.04);
  ctx.strokeStyle=accent+"a3";ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-56,-83);ctx.quadraticCurveTo(-85,-80,-102,-41);ctx.lineTo(-161,15);ctx.lineTo(-120,90);ctx.lineTo(-82,64);ctx.lineTo(-78,153);ctx.lineTo(78,153);ctx.lineTo(82,64);ctx.lineTo(120,90);ctx.lineTo(161,15);ctx.lineTo(102,-41);ctx.quadraticCurveTo(85,-80,56,-83);ctx.quadraticCurveTo(0,-27,-56,-83);ctx.stroke();
  ctx.restore();
  label(ctx,"THE FASHION ARCHIVE",x+14,y+260,17,accent,800);
}
function vehicle(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  const mid=x+w*.53, yy=y+165;
  softGlow(ctx,mid,yy,accent,270);
  ctx.strokeStyle=accent;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(x+80,yy+70);ctx.lineTo(x+125,yy-5);ctx.lineTo(x+w*.38,yy-50);ctx.lineTo(x+w*.72,yy-50);ctx.lineTo(x+w-115,yy-5);ctx.lineTo(x+w-70,yy+70);ctx.closePath();ctx.stroke();
  [x+180,x+w-180].forEach(px=>{
    ctx.beginPath();ctx.arc(px,yy+70,44,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(px,yy+70,19,0,Math.PI*2);ctx.stroke();
  });
  for(let i=0;i<5;i++)line(ctx,x+50,yy+138+i*10,(w-100)*(.75-i*.09),accent+"3a",2);
  label(ctx,"NEXT-GENERATION AUTO DISCOVERY",x+35,y+32,17,accent,700);void t;
}
function privacy(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  panel(ctx,x,y,w,288,accent);
  label(ctx,"YOUR EXPERIENCE / CONTROLS",x+30,y+32,15,accent,800);
  const rows=["Connection visibility","Status awareness","Privacy settings"];
  rows.forEach((s,i)=>{
    const top=y+88+i*63;
    label(ctx,s,x+30,top,20,"#d4dee4",600);
    rounded(ctx,x+w-108,top-1,68,30,17,i===Math.floor(t)%3?"#315a4a":"#323944");
    rounded(ctx,x+w-101+(i===Math.floor(t)%3?33:2),top+3,22,22,11,i===Math.floor(t)%3?accent:"#98a1aa");
  });
}
function armat(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,accent:string,t:number){
  const cx=x+w/2, cy=y+155;softGlow(ctx,cx,cy,accent,270);
  ctx.strokeStyle=accent+"9c";ctx.lineWidth=2;
  for(let k=0;k<8;k++){
    const r=45+k*24, angle=t*.03+k*.37;
    ctx.beginPath();ctx.ellipse(cx,cy,r,r*.45,angle,0,Math.PI*2);ctx.stroke();
  }
  label(ctx,"CRAFTED AT ORIGIN / ARMENIA",x+22,y+265,17,accent,700);
}
/**
 * Decorative vector illustrations, not real customer analytics, licensed footage
 * or product screenshots. Every pseudo-dashboard is labeled ILLUSTRATIVE.
 */
export function drawProductComposition(ctx:CanvasRenderingContext2D,project:MotionProject,scene:MotionScene,t:number,W:number,H:number,accent:string){
  const landscape=H<810;
  const x=landscape?W*.48:95,y=landscape?H*.45:H*.65,w=landscape?W*.47:W-190;
  const availableHeight=Math.max(130,H-(landscape?92:140)-y);
  const scaleY=Math.min(1,availableHeight/315);
  ctx.save();ctx.globalAlpha*=.84;ctx.translate(x,y);ctx.scale(1,scaleY);ctx.translate(-x,-y);
  if(project.brand==="promptence")promptence(ctx,scene,x,y,w,accent,t);
  else if(project.brand==="veto"||project.brand==="veto_sport")veto(ctx,x,y,w,accent,t);
  else if(project.brand==="raios")raios(ctx,x,y,w,accent,t);
  else if(project.brand==="suren")suren(ctx,x,y,w,accent,t);
  else if(project.brand==="ingu")ingu(ctx,x,y,w,accent,t);
  else if(project.brand==="meqena")vehicle(ctx,x,y,w,accent,t);
  else if(project.brand==="veto_private")privacy(ctx,x,y,w,accent,t);
  else if(project.brand==="armat")armat(ctx,x,y,w,accent,t);
  ctx.restore();
}
