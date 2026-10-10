import type { MotionBrand } from "./studio";
/**
 * Source-faithful product screenshot media. Assets remain only in current
 * browser memory and never upload to the server, localStorage, or JSON projects.
 * Saved projects containing screen scenes must be paired with the screenshot
 * again on another device or in the offline render CLI --screen argument.
 */
const loaded=new Map<MotionBrand,HTMLImageElement>();
const MAX_BYTES=12_000_000;
const MIMES=new Set(["image/png","image/jpeg","image/webp"]);
async function decode(brand:MotionBrand,src:string):Promise<void>{
  const img=new Image();
  img.decoding="async";
  img.src=src;
  try{
    await img.decode();
    if(img.naturalWidth<300||img.naturalHeight<240||img.naturalWidth>8000||img.naturalHeight>8000){
      throw new Error("Product image dimensions must be 300x240 to 8000x8000");
    }
    loaded.set(brand,img);
  }catch(error){
    throw error instanceof Error?error:new Error("Product screenshot cannot be decoded");
  }
}
export async function setLocalProductScreen(brand:MotionBrand,file:File):Promise<void>{
  if(!MIMES.has(file.type))throw new Error("Screenshot must be PNG, JPEG or WebP");
  if(file.size<100||file.size>MAX_BYTES)throw new Error("Screenshot must be 100B–12MB");
  const src=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("Cannot read screenshot"));
    reader.readAsDataURL(file);
  });
  await decode(brand,src);
}
/**
 * Called only by operator Chromium offline render bridge, not by the public
 * REST endpoint. Blob data must originate from an explicitly supplied file.
 */
export async function installOfflineScreen(brand:MotionBrand,mime:string,base64:string):Promise<void>{
  if(!MIMES.has(mime))throw new Error("Unsupported image type");
  if(base64.length>MAX_BYTES*1.4 || !/^[A-Za-z0-9+/=\r\n]+$/.test(base64))throw new Error("Untrusted or oversized media");
  await decode(brand,"data:"+mime+";base64,"+base64.replace(/\s/g,""));
}
export function hasProductScreen(brand:MotionBrand):boolean{return loaded.has(brand);}
export function getProductScreen(brand:MotionBrand):HTMLImageElement|undefined{return loaded.get(brand);}
/** Director's source-faithful screenshot card, with gentle depth and clean crop. */
export function drawProductScreen(
  ctx:CanvasRenderingContext2D,brand:MotionBrand,W:number,H:number,time:number,progress:number,accent:string
) {
  const img=loaded.get(brand);
  if(!img)return;
  const landscape=H<810;
  const width=landscape?W*.46:W*.84;
  const height=landscape?H*.70:H*.25;
  const cx=landscape?W*.74:W*.50;
  const cy=landscape?H*.57:H*.775;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate((landscape?-.024:-.021)+Math.sin(time*.13)*.009);
  const scale=1.01+.035*Math.max(0,Math.min(1,progress));
  ctx.scale(scale,scale);
  const left=-width/2,top=-height/2;
  const r=landscape?17:24;
  ctx.shadowColor="#000000bb";ctx.shadowBlur=80;ctx.shadowOffsetY=38;
  ctx.fillStyle="#0b1014";ctx.beginPath();ctx.roundRect(left-9,top-26,width+18,height+35,r);ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();
  ctx.beginPath();ctx.roundRect(left,top,width,height,Math.max(8,r-4));ctx.clip();
  const desired=width/height,actual=img.naturalWidth/img.naturalHeight;
  let drawW=width,drawH=height;
  if(actual>desired)drawW=height*actual;
  else drawH=width/actual;
  // Small vertical dolly only when image is taller than the card: never warp real UI.
  const limit=Math.max(0,(drawH-height)/2);
  const drift=limit*Math.sin(time*.32);
  ctx.drawImage(img,-drawW/2,-drawH/2+drift,drawW,drawH);
  const light=ctx.createLinearGradient(left,top,left+width,top+height);
  light.addColorStop(0,"#ffffff09");light.addColorStop(.5,"#00000000");light.addColorStop(1,"#00000039");
  ctx.fillStyle=light;ctx.fillRect(left,top,width,height);
  ctx.restore();
  ctx.lineWidth=1.5;ctx.strokeStyle=accent+"aa";
  ctx.beginPath();ctx.roundRect(left,top,width,height,Math.max(8,r-4));ctx.stroke();
  // A verified screenshot is visibly labeled, not passed off as a synthetic UI.
  ctx.font='700 '+(landscape?10:14)+'px Arial,sans-serif';
  ctx.fillStyle=accent;ctx.textAlign="left";ctx.textBaseline="middle";
  ctx.fillText("PRODUCT SCREEN / SOURCE IMAGE",left+8,top-14);
  ctx.restore();
}
