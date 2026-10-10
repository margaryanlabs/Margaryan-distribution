import { BRAND_INFO } from "./studio";
import { getLoadedMotionLogo } from "./brand-assets";
import { type QuickProject, quickShotAt, quickDuration } from "./quick-project";

export type QuickMediaAsset = {
  url:string; file:File; type:"image"|"video"; element:HTMLImageElement|HTMLVideoElement;
};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const x=clamp(n);return x*x*(3-2*x);};
function cover(ctx:CanvasRenderingContext2D,element:CanvasImageSource,w:number,h:number,
  sourceW:number,sourceH:number,mode:"fill"|"contain",zoom:number) {
  const scale=(mode==="contain"?Math.min(w/sourceW,h/sourceH):Math.max(w/sourceW,h/sourceH))*zoom;
  const dw=sourceW*scale,dh=sourceH*scale;
  ctx.drawImage(element,(w-dw)/2,(h-dh)/2,dw,dh);
}
function family(language:QuickProject["language"],weight=800,size=10){
  const face=language==="hy"?'"Noto Sans Armenian", "DejaVu Sans", sans-serif':
    '"Noto Sans", Arial, sans-serif';
  return String(weight)+" "+String(size)+"px "+face;
}
function lines(ctx:CanvasRenderingContext2D,content:string,maxWidth:number,maxLines:number,fontSize:number,language:QuickProject["language"],weight:number){
  const words=content.trim().split(/\s+/u);
  const result:string[]=[];
  let line="";
  ctx.font=family(language,weight,fontSize);
  for(const word of words){
    const join=line?line+" "+word:word;
    if(ctx.measureText(join).width<=maxWidth){line=join;continue;}
    if(line)result.push(line);
    line=word;
    if(result.length>maxLines+2)break;
  }
  if(line)result.push(line);
  return result;
}
function fittingTitle(ctx:CanvasRenderingContext2D,title:string,width:number,minSize:number,maxSize:number,language:QuickProject["language"]){
  for(let size=maxSize;size>=minSize;size-=2){
    const wrapped=lines(ctx,title,width,3,size,language,800);
    if(wrapped.length<=3 && wrapped.every(row=>ctx.measureText(row).width<=width))return {size,wrapped};
  }
  return {size:minSize,wrapped:lines(ctx,title,width,3,minSize,language,800)};
}
function drawMultiline(ctx:CanvasRenderingContext2D,rows:string[],x:number,y:number,size:number,spacing=1.13){
  rows.forEach((row,i)=>ctx.fillText(row,x,y+i*size*spacing));
}
/**
 * Real operator-supplied video/photo + source-language typography.
 * No invented UI, stock media fetching, generative effects or external provider.
 */
export function drawQuickFrame(ctx:CanvasRenderingContext2D,p:QuickProject,atSeconds:number,
  W:number,H:number,media:Map<string,QuickMediaAsset>) {
  const total=quickDuration(p);
  const {index,shot,elapsed}=quickShotAt(p,Math.min(total-.001,Math.max(0,atSeconds)));
  const progress=clamp(elapsed/shot.seconds);
  const accent=p.brand==="meqena"?"#E32C48":BRAND_INFO[p.brand].accent;
  ctx.save();ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#080b10";ctx.fillRect(0,0,W,H);
  const source=media.get(shot.id);
  if(source){
    const element=source.element;
    let sw=0,sh=0;
    if(source.type==="image"){
      const img=element as HTMLImageElement;sw=img.naturalWidth;sh=img.naturalHeight;
    }else{
      const video=element as HTMLVideoElement;
      if(video.readyState>=2){sw=video.videoWidth;sh=video.videoHeight;}
    }
    if(sw>1&&sh>1){
      const factor=source.type==="image"?1+progress*.045:1;
      cover(ctx,element,W,H,sw,sh,shot.visual,factor);
    }
  }else{
    const bg=ctx.createRadialGradient(W*.55,H*.45,0,W*.55,H*.45,W*.9);
    bg.addColorStop(0,accent+"25");bg.addColorStop(1,"#080b10");
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  }
  const portrait=H>W*1.15;
  const fade=ctx.createLinearGradient(0,0,0,H);
  fade.addColorStop(0,"rgba(3,5,9,.84)");
  fade.addColorStop(portrait?.4:.34,"rgba(3,5,9,.57)");
  fade.addColorStop(portrait?.66:.57,"rgba(3,5,9,.09)");
  fade.addColorStop(1,"rgba(3,5,9,.93)");
  ctx.fillStyle=fade;ctx.fillRect(0,0,W,H);
  const safe=Math.round(W*.067),width=W-2*safe,unit=Math.min(W,H);
  const top=H*(portrait?.16:.21);
  const copyScale=unit/720;
  const titleSize=Math.round((portrait?71:67)*copyScale);
  const minSize=Math.round(30*copyScale);
  const pad=Math.round(30*copyScale);
  const reveal=ease(elapsed/.35),outro=ease((shot.seconds-elapsed)/.26);
  const opacity=Math.min(reveal,outro);
  ctx.save();ctx.globalAlpha=opacity;
  ctx.textBaseline="top";ctx.textAlign="left";
  const title=fittingTitle(ctx,shot.title,width,minSize,titleSize,p.language);
  const startY=top+Math.round((1-reveal)*21*copyScale);
  ctx.fillStyle="#FAF9F4";ctx.font=family(p.language,800,title.size);
  drawMultiline(ctx,title.wrapped,safe,startY,title.size,1.12);
  const titleEnd=startY+title.wrapped.length*title.size*1.12;
  ctx.fillStyle=accent;
  ctx.fillRect(safe,titleEnd+pad,width*.21,Math.max(3,5*copyScale));
  const bodyMax=Math.round(25*copyScale);
  const body=lines(ctx,shot.subtitle||"",width,3,bodyMax,p.language,550);
  ctx.fillStyle="#D7DEDF";ctx.font=family(p.language,550,bodyMax);
  const bottom=H-Math.round((portrait?178:92)*copyScale);
  const bodyY=Math.max(titleEnd+pad*2,bottom-body.length*bodyMax*1.4);
  drawMultiline(ctx,body,safe,bodyY,bodyMax,1.28);
  ctx.restore();
  const logo=getLoadedMotionLogo(p.brand);
  ctx.save();
  const brandTop=Math.round((portrait?66:36)*copyScale),brandHeight=Math.round(48*copyScale);
  const mark=Math.round(39*copyScale);
  if(logo)ctx.drawImage(logo,safe,brandTop,mark,mark);
  ctx.fillStyle="#F8F9F7";ctx.textBaseline="middle";ctx.textAlign="left";
  ctx.font="800 "+String(Math.round(21*copyScale))+'px "Noto Sans", Arial, sans-serif';
  ctx.fillText(BRAND_INFO[p.brand].name,safe+(logo?mark+11*copyScale:0),brandTop+brandHeight/2);
  ctx.fillStyle="#B8C5CC";
  ctx.font="650 "+String(Math.round(13*copyScale))+'px "Noto Sans", Arial, sans-serif';
  ctx.textAlign="right";
  const label=(index+1).toString().padStart(2,"0")+" / "+p.shots.length.toString().padStart(2,"0");
  ctx.fillText(label,W-safe,brandTop+brandHeight/2);
  const progressY=H-Math.round(70*copyScale);
  ctx.fillStyle="#FFFFFF40";ctx.fillRect(safe,progressY,width,2*copyScale);
  ctx.fillStyle=accent;ctx.fillRect(safe,progressY,width*clamp(atSeconds/total),3*copyScale);
  ctx.restore();ctx.restore();
}
export function quickSourceStatus(project:QuickProject,media:Map<string,QuickMediaAsset>){
  const missing=project.shots.filter(s=>!media.get(s.id)).map(s=>s.id);
  return {ready:missing.length===0,missing};
}
