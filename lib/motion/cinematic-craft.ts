import { BRAND_INFO, type MotionBrand, type MotionProject, type MotionScene } from "./studio";
import { getLoadedMotionLogo } from "./brand-assets";

const PI2 = Math.PI * 2;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 3);
const smooth = (n: number) => { const t = clamp(n); return t*t*(3-2*t); };
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,width:number,angle=0) {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,PI2);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function spot(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,c:string,amount=.2) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,c+Math.round(amount*255).toString(16).padStart(2,"0"));
  g.addColorStop(1,c+"00");
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function mono(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,color:string) {
  ctx.font="700 "+size+'px "Noto Sans Armenian", ui-monospace, monospace';
  ctx.fillStyle=color;ctx.textAlign="left";ctx.textBaseline="top";ctx.fillText(text,x,y);
}
function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,accent:string,t:number,index:number) {
  ctx.save();ctx.translate(x,y);ctx.rotate(t*.055*(index%2?-1:1));
  ellipse(ctx,0,0,r,r*.52,accent+"55",1.4,(index*17)*.023);
  ellipse(ctx,0,0,r*.83,r*.22,"#ffffff1a",1,index*.29);
  const a=t*(.3+index*.035)+index*2.31;
  const px=r*Math.cos(a),py=r*.52*Math.sin(a);
  spot(ctx,px,py,50,accent,.28);
  ctx.fillStyle=accent;ctx.beginPath();ctx.arc(px,py,3.5,0,PI2);ctx.fill();
  ctx.restore();
}
function vanishingRays(ctx:CanvasRenderingContext2D,W:number,H:number,accent:string,t:number,focusY:number,seed:number) {
  ctx.save();
  const centerX=W*.53+Math.sin(t*.2+seed)*50;
  const horizon=focusY;
  ctx.translate(centerX,horizon);
  for(let i=0;i<30;i++){
    const a=PI2*i/30+t*.026;
    const near=60,far=Math.max(H,W)*1.7;
    const x=Math.cos(a),y=Math.sin(a)*.58;
    ctx.beginPath();ctx.moveTo(x*near,y*near);ctx.lineTo(x*far,y*far);
    ctx.strokeStyle=i%7===0?accent+"46":"#b6d2df15";
    ctx.lineWidth=i%7===0?1.8:.7;ctx.stroke();
  }
  ctx.restore();
}
function editorials(ctx:CanvasRenderingContext2D,W:number,H:number,accent:string,t:number,index:number) {
  const landscape=H<810;
  const centerY=H*(landscape?.63:.77);
  const baseline=Math.min(H*.26,250);
  ctx.save();
  ctx.translate(W*.5,centerY);
  ctx.rotate(-.19 + Math.sin(t*.1)*.015);
  for(let i=0;i<14;i++){
    const y=(i-7)*24;
    const wave=Math.sin((i+t*.53+index)*.6);
    const start=-W*.51 + 28*Math.sin(t+i);
    const w=W*(.4+.25*Math.abs(wave));
    ctx.fillStyle=i%5===0?accent+"ca":i%2?"#ffffff12":"#a3b2be30";
    ctx.fillRect(start+t*4*((i%3)-1),y,w,i%5===0?4.5:1.5);
  }
  ctx.restore();
  spot(ctx,W*.62,centerY,baseline*1.4,accent,.15);
}
function networkConstellation(ctx:CanvasRenderingContext2D,W:number,H:number,accent:string,t:number,seed:number) {
  const landscape=H<810;
  const midY=H*(landscape?.59:.77);
  const span=landscape?W*.46:W*.84;
  const points:Array<{x:number;y:number;z:number}>=[];
  for(let i=0;i<29;i++){
    const a=i*2.3999632+t*(.03+(i%3)*.006);
    const radial=Math.sqrt((i+.5)/29);
    const x=W*.52+Math.cos(a)*radial*span*.52;
    const y=midY+Math.sin(a)*radial*(landscape?H*.26:H*.14);
    points.push({x,y,z:i%3+1});
  }
  ctx.save();
  points.forEach((p,i)=>{
    for(let j=i+1;j<points.length;j++){
      const q=points[j],d=Math.hypot(p.x-q.x,p.y-q.y);
      if(d>span*.2||d<span*.046)continue;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
      ctx.strokeStyle=i%5===0?accent+"4f":"#cbe1ed1b";ctx.lineWidth=.8;ctx.stroke();
    }
  });
  points.forEach((p,i)=>{
    if(i%5===0)spot(ctx,p.x,p.y,31,accent,.25);
    ctx.fillStyle=(i+seed)%6===0?accent:"#dde7e8a8";
    ctx.beginPath();ctx.arc(p.x,p.y,1.4+p.z*.6,0,PI2);ctx.fill();
  });
  ctx.restore();
}
const PROCESS:Record<MotionBrand,string[]> = {
  promptence:["DISCOVER","MEASURE","DIAGNOSE","VERIFY"],
  veto:["OBSERVE","ASSESS","DECIDE","REVIEW"],
  raios:["CONNECT","DETECT","APPROVE","PROVE"],
  labs:["RESEARCH","DESIGN","BUILD","PROVE"],
  ingu:["CURATE","DISCOVER","EXPLORE","CHOOSE"],
  meqena:["EXPLORE","COMPARE","CHECK","CHOOSE"],
  suren:["DISCOVER","ASSESS","STRATEGY","DECIDE"],
  veto_private:["EXPLORE","UNDERSTAND","ENABLE","CONTROL"],
  veto_sport:["OBSERVE","PRICE","TEST","REVIEW"],
  armat:["DISCOVER","CONNECT","EXPORT","GROW"],
  tun:["GOAL","OPTIONS","RISKS","DECIDE"],
  hay_engine:["SPEAK","WRITE","CREATE","PUBLISH"],
  reality_engine:["MODEL","SIMULATE","STRESS","DECIDE"]
};
function processRibbon(ctx:CanvasRenderingContext2D,project:MotionProject,W:number,H:number,accent:string,t:number,progress:number) {
  const landscape=H<810,labels=PROCESS[project.brand];
  const x=landscape?W*.54:85;
  const y=H*(landscape?.58:.75);
  const width=landscape?W*.41:W-170;
  ctx.save();ctx.globalAlpha*=.78;
  const n=labels.length,cellW=width/n;
  ctx.font='700 '+(landscape?12:16)+'px "Noto Sans Armenian", Arial, sans-serif';
  for(let i=0;i<n;i++){
    const xx=x+cellW*i,active=i<=Math.floor(progress*n);
    ctx.fillStyle=active?accent+"25":"#ffffff09";
    ctx.strokeStyle=active?accent+"b5":"#ffffff2b";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(xx+3,y,cellW-9,landscape?57:76,8);ctx.fill();ctx.stroke();
    ctx.fillStyle=active?accent:"#bec9ca";ctx.textBaseline="middle";ctx.textAlign="center";
    ctx.fillText(labels[i],xx+(cellW-9)/2+3,y+(landscape?28:39));
  }
  const scan=x+width*clamp(progress);spot(ctx,scan,y+20,120,accent,.18);
  ctx.restore();void t;
}
function brandReveal(ctx:CanvasRenderingContext2D,project:MotionProject,W:number,H:number,accent:string,t:number,progress:number,isClose:boolean) {
  const landscape=H<810;
  const cx=W*(landscape?.73:.53);
  const cy=H*(landscape?.54:.74);
  const size=landscape?Math.min(160,H*.27):Math.min(230,W*.26);
  ctx.save();
  spot(ctx,cx,cy,size*2.9,accent,.26);
  const p=easeOut(progress*3);
  const n=project.seed||1;
  for(let i=0;i<5;i++)ring(ctx,cx,cy,size*(1.05+i*.27),accent,t+i*.3+n*.0001,i);
  const mark=getLoadedMotionLogo(project.brand);
  ctx.save();ctx.globalAlpha*=p;
  if(mark){
    const f=Math.min(size/mark.naturalWidth,size/mark.naturalHeight);
    const w=mark.naturalWidth*f,h=mark.naturalHeight*f;
    ctx.translate(cx,cy);ctx.scale(.7+.3*p,.7+.3*p);
    ctx.shadowColor=accent;ctx.shadowBlur=isClose?25:15;
    ctx.drawImage(mark,-w/2,-h/2,w,h);
  } else {
    // Correct wordmark is preferable to invented icon art.
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillStyle="#fafcfc";ctx.font="800 "+(landscape?36:46)+'px "Noto Sans Armenian","Noto Sans",Arial,sans-serif';
    const text=BRAND_INFO[project.brand].name;
    const metric=ctx.measureText(text).width;
    const factor=Math.min(1,(landscape?260:640)/Math.max(1,metric));
    ctx.translate(cx,cy);ctx.scale(factor,factor);ctx.fillText(text,0,0);
  }
  ctx.restore();ctx.restore();
}
function grade(ctx:CanvasRenderingContext2D,W:number,H:number,accent:string,index:number){
  const y=H*.5;
  ctx.save();
  const stripes=7;
  for(let i=0;i<stripes;i++){
    const wid=(W*.72)*(1-i*.08);
    const yy=y+i*16;
    ctx.beginPath();ctx.moveTo((W-wid)/2,yy);ctx.lineTo((W+wid)/2,yy);
    ctx.strokeStyle=i===index%stripes?accent+"b0":"#ffffff24";ctx.lineWidth=i%3===0?2.5:1;ctx.stroke();
  }
  ctx.restore();
}
/** Shot art direction: cinematic device changes with shot type and purpose,
 * rather than putting the same diagram under every headline. */
export function drawCinematicSet(
  ctx:CanvasRenderingContext2D,project:MotionProject,scene:MotionScene,
  index:number,elapsed:number,progress:number,W:number,H:number
) {
  const accent=BRAND_INFO[project.brand].accent;
  const landscape=H<810;
  ctx.save();
  const local=Math.max(0,elapsed);
  if(scene.kind==="kinetic") {
    editorials(ctx,W,H,accent,local,index);
    grade(ctx,W,H,accent,index);
  } else if(scene.kind==="opener") {
    vanishingRays(ctx,W,H,accent,local,H*(landscape?.68:.76),index*.2);
    ring(ctx,W*(landscape?.73:.56),H*(landscape?.61:.78),W*.26,accent,local,index);
  } else if(scene.kind==="network") {
    networkConstellation(ctx,W,H,accent,local,index+Number(project.seed||0));
    spot(ctx,W*.62,H*(landscape?.68:.76),W*.4,accent,.16);
  } else if(scene.kind==="statement") {
    processRibbon(ctx,project,W,H,accent,local,progress);
    networkConstellation(ctx,W,H,accent,local,index);
  } else if(scene.kind==="orbit" || scene.kind==="closer") {
    brandReveal(ctx,project,W,H,accent,local,progress,scene.kind==="closer");
  }
  ctx.restore();
}
