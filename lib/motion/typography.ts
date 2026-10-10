/**
 * Screen-reader- and multilingual-safe text fitting for deterministic Canvas2D.
 *
 * The old film renderer silently omitted headline lines beyond 2–4 rows.
 * This implementation never drops copy: if copy cannot fit, it reports a
 * measurable overflow warning so the director can revise the shot.
 * Always paint using browser text (never fake letters in generated pictures).
 */
export interface FittedText {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
  fits: boolean;
  reason?: string;
}

export const FILM_FONT = '"Noto Sans Armenian", "Noto Sans", "DejaVu Sans", Arial, sans-serif';

function wrapText(ctx:CanvasRenderingContext2D,text:string,maxWidth:number):string[]{
  const words=text.trim().split(/\s+/u).filter(Boolean);
  if(!words.length)return [];
  const lines:string[]=[];
  let current="";
  for(const word of words){
    const joined=current?current+" "+word:word;
    if(ctx.measureText(joined).width<=maxWidth){current=joined;continue;}
    if(current){lines.push(current);current="";}
    if(ctx.measureText(word).width<=maxWidth){current=word;continue;}
    let fragment="";
    for(const character of Array.from(word)){
      const candidate=fragment+character;
      if(fragment&&ctx.measureText(candidate).width>maxWidth){lines.push(fragment);fragment=character;}
      else fragment=candidate;
    }
    current=fragment;
  }
  if(current)lines.push(current);
  return lines;
}

export function fitCanvasTitle(
  ctx:CanvasRenderingContext2D,
  text:string,
  availableWidth:number,
  availableHeight:number,
  maxLines:number,
  startSize=116,
  minSize=26
):FittedText {
  if(!Number.isFinite(availableWidth)||!Number.isFinite(availableHeight)||availableWidth<90||availableHeight<48){
    return {lines:[],fontSize:minSize,lineHeight:minSize*1.06,totalHeight:0,fits:false,reason:"Text bounds unavailable"};
  }
  const original=ctx.font;
  let fallback:FittedText|null=null;
  for(let size=Math.floor(startSize);size>=minSize;size-=2){
    ctx.font='850 '+size+'px '+FILM_FONT;
    const lines=wrapText(ctx,text,availableWidth);
    const height=lines.length*size*1.065;
    const result={lines,fontSize:size,lineHeight:size*1.065,totalHeight:height,fits:lines.length<=maxLines&&height<=availableHeight};
    if(result.fits){ctx.font=original;return result;}
    fallback={...result,reason:lines.length>maxLines?"Too many lines for safe area":"Headline exceeds available height"};
  }
  ctx.font=original;
  return fallback||{lines:[],fontSize:minSize,lineHeight:minSize,totalHeight:0,fits:false,reason:"Empty headline"};
}

export interface ShotGeometry {
  x:number; titleY:number; eyebrowY:number; width:number;
  headlineMaxHeight:number; maxLines:number; titleSize:number;
  supportSize:number; supportGap:number; supportMaxLines:number;
  bottomLimit:number;
}
export function shotTextGeometry(W:number,H:number):ShotGeometry {
  const landscape=H<810;
  const square=H>=810&&H<1250;
  const x=landscape?82:88;
  const titleY=H*(landscape?.235:square?.265:.29);
  const width=landscape?W*.42:W-2*x;
  const titleSize=landscape?82:square?100:116;
  const headlineMaxHeight=landscape?H*.29:square?H*.285:H*.285;
  const supportSize=landscape?19:square?23:27;
  const supportGap=landscape?16:square?25:38;
  const bottomLimit=landscape?H*.91:square?H*.67:H*.645;
  return{
    x,titleY,eyebrowY:titleY-(landscape?42:73),
    width,headlineMaxHeight,maxLines:landscape?3:square?4:4,
    titleSize,supportSize,supportGap,supportMaxLines:landscape?2:3,
    bottomLimit
  };
}

export function fitShotCopy(ctx:CanvasRenderingContext2D,headline:string,support:string,W:number,H:number,scale=1){
  const raw=shotTextGeometry(W,H);
  const safeScale=Math.max(.72,Math.min(1,Number.isFinite(scale)?scale:1));
  const g={...raw,titleSize:Math.round(raw.titleSize*safeScale),supportSize:Math.round(raw.supportSize*safeScale),supportGap:Math.round(raw.supportGap*safeScale)};
  const title=fitCanvasTitle(ctx,headline,g.width,g.headlineMaxHeight,g.maxLines,g.titleSize,26);
  ctx.save();
  ctx.font='400 '+g.supportSize+'px '+FILM_FONT;
  const supportLines=wrapText(ctx,support,g.width);
  ctx.restore();
  const usedSupport=supportLines.length>g.supportMaxLines
    ?supportLines.length*g.supportSize*1.3
    :supportLines.length*(g.supportSize+10);
  const combinedBottom=g.titleY+title.totalHeight+g.supportGap+usedSupport+15;
  const reasons:string[]=[];
  if(!title.fits)reasons.push(title.reason||"Headline overflows");
  if(supportLines.length>g.supportMaxLines)reasons.push("Support copy spans "+supportLines.length+" lines");
  if(combinedBottom>g.bottomLimit)reasons.push("Title/support overlap cinematic safe area");
  return{...g,title,supportLines,combinedBottom,valid:reasons.length===0,reasons};
}
