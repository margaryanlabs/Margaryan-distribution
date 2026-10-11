import type { MotionBrand, MotionFilmChrome } from "./studio";
import { getMotionSceneSource } from "./scene-source";
import { sanitizeSourceDirection, sourceCrop, sourceStage, sourceZoom, type SourceDirection } from "./source-composition";
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
/** Production source footage with a deliberately simple cinematic camera.
 * Rendering is source-faithful: all pixels originate in approved image/video
 * elements. Moving footage timing/seek is handled by scene-source.
 */
export function drawProductScreen(
  ctx:CanvasRenderingContext2D,brand:MotionBrand,W:number,H:number,time:number,
  progress:number,accent:string,mediaId?:string,direction?:Partial<SourceDirection>,
  filmChrome:MotionFilmChrome="brand"
) {
  const local=getMotionSceneSource(mediaId);
  const image=local?.element||loaded.get(brand);
  if(!image)return;
  if(local?.type==="video"&&(image as HTMLVideoElement).readyState<2)return;
  const sourceW=local?.width||(image as HTMLImageElement).naturalWidth;
  const sourceH=local?.height||(image as HTMLImageElement).naturalHeight;
  if(!sourceW||!sourceH)return;
  const d=sanitizeSourceDirection(direction);
  const st=sourceStage(d.sourceLayout,W,H);
  const zoom=sourceZoom(d,progress);
  const crop=sourceCrop(sourceW,sourceH,st.w,st.h,d.sourceFocusX,d.sourceFocusY,zoom);
  const immersive=d.sourceLayout==="immersive";
  ctx.save();
  ctx.translate(st.x+st.w/2,st.y+st.h/2);
  ctx.rotate(st.angle+(immersive?0:Math.sin(time*.12)*.0025));
  const left=-st.w/2,top=-st.h/2;
  if(!immersive){
    // Product screens are treated as a real object on a branded editorial
    // stage, not a fake dashboard assembled from synthetic numbers.
    ctx.shadowColor="#000000a3";ctx.shadowBlur=64;ctx.shadowOffsetY=25;
    ctx.fillStyle="#090e12";
    ctx.beginPath();ctx.roundRect(left-10,top-16,st.w+20,st.h+26,st.r);ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  }
  ctx.save();
  ctx.beginPath();ctx.roundRect(left,top,st.w,st.h,st.r);ctx.clip();
  ctx.drawImage(image,crop.sx,crop.sy,crop.sw,crop.sh,left,top,st.w,st.h);
  if(immersive){
    // An optical scrim preserves high-contrast overlaid titles; it is not
    // a claim about or alteration of the underlying source's data.
    const scrim=ctx.createLinearGradient(
      0,top,0,top+st.h);
    scrim.addColorStop(0,"#050b10d9");
    scrim.addColorStop(.32,"#071217a3");
    scrim.addColorStop(.7,"#030a0f95");
    scrim.addColorStop(1,"#030b10e8");
    ctx.fillStyle=scrim;ctx.fillRect(left,top,st.w,st.h);
  }else{
    const light=ctx.createLinearGradient(left,top,left+st.w,top+st.h);
    light.addColorStop(0,"#ffffff0c");
    light.addColorStop(.5,"#00000000");
    light.addColorStop(1,"#00000032");
    ctx.fillStyle=light;ctx.fillRect(left,top,st.w,st.h);
  }
  ctx.restore();
  if(!immersive){
    ctx.lineWidth=1.5;ctx.strokeStyle=accent+"b0";
    ctx.beginPath();ctx.roundRect(left,top,st.w,st.h,Math.max(5,st.r-3));ctx.stroke();
  }
  // Source provenance belongs in the reviewed manifest, NOT client footage.
  // Preserve the diagnostic caption only for internal EDITOR-mode workprints.
  if(filmChrome==="editor"){
    ctx.font='700 '+(H<810?10:14)+'px Arial,sans-serif';
    ctx.fillStyle=immersive?"#e7f7eb":accent;
    ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText(local?.type==="video"?"REAL SOURCE VIDEO / REVIEW REQUIRED":
      "REAL SOURCE IMAGE / REVIEW REQUIRED",left+(immersive?85:9),
      immersive?top+st.h-54:top-13);
  }
  ctx.restore();
}
