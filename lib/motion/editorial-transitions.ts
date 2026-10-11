import type { MotionQualityMode, MotionTransitionCue } from "./studio";

const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** Explicit, time-addressable transition grammar, selected by a human creative mode. */
export function chooseTransition(
  selected:MotionTransitionCue|undefined,
  mode:MotionQualityMode|undefined,
  shot:number
): Exclude<MotionTransitionCue,"auto"> {
  if(selected&&selected!=="auto")return selected;
  if(mode==="signature"){
    // Visually forceful cuts are *occasional*: do not flash on every shot.
    return (["dissolve","slide","cut","grid","dissolve","zoom","cut","dissolve"] as const)[shot%8];
  }
  if(mode==="premium")return (["dissolve","slide","cut","dissolve","wipe"] as const)[shot%5];
  return (["dissolve","wipe","slash"] as const)[shot%3];
}
export function editorialTransition(
  ctx:CanvasRenderingContext2D,method:Exclude<MotionTransitionCue,"auto">,
  amount:number,W:number,H:number,accent:string,
  paint:(opacity:number)=>void
){
  const p=ease(amount);
  if(method==="cut")return;
  ctx.save();
  if(method==="wipe"){
    const top=H*(1-p);
    ctx.beginPath();ctx.rect(0,top,W,H-top);ctx.clip();paint(1);
  } else if(method==="slash"){
    const span=W*1.7;
    ctx.beginPath();ctx.moveTo(-W+p*span,0);ctx.lineTo(p*span,0);
    ctx.lineTo(p*span-W*.6,H);ctx.lineTo(-W+p*span-W*.6,H);
    ctx.closePath();ctx.clip();paint(1);
  } else if(method==="slide"){
    // Next shot enters across frame; full output is not prematurely faded to black.
    ctx.beginPath();ctx.rect(W*(1-p),0,W*p,H);ctx.clip();
    ctx.translate(W*(1-p)*.48,0);
    paint(1);
  } else if(method==="zoom"){
    const scale=1.13-.13*p;
    ctx.translate(W/2,H/2);ctx.scale(scale,scale);ctx.translate(-W/2,-H/2);
    paint(p);
  } else if(method==="grid"){
    // Deterministic staggered exposure, no costly pixel readback and no flicker.
    const columns=5,rows=5;
    ctx.beginPath();
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const start=((row*3+column*7)%9)/14;
      const show=clamp((p-start)*2.7);
      if(show<=0)continue;
      const bw=W/columns,bh=H/rows;
      ctx.rect(column*bw,row*bh,bw*show,bh);
    }
    ctx.clip();paint(1);
  } else if(method==="flash"){
    // Editorial light pass, peak luminance capped and lasts within the cut only.
    paint(p);
    const intensity=Math.pow(Math.sin(Math.PI*p),8)*.26;
    ctx.fillStyle=accent;
    ctx.globalAlpha=intensity;
    ctx.fillRect(0,0,W,H);
  } else {
    paint(p);
  }
  ctx.restore();
}
