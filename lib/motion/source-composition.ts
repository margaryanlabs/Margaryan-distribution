/** Deterministic crop geometry for real screenshots and decoded video frames.
 * Geometry depends only on the source/target dimensions and authored camera
 * controls, so preview and frame-exact offline mastering share identical pixels.
 * Source content is never re-synthesized or secretly replaced.
 */
export type SourceLayout="card"|"theater"|"split"|"immersive";
export interface SourceDirection{
  sourceLayout:SourceLayout;
  sourceFocusX:number;
  sourceFocusY:number;
  sourceZoomStart:number;
  sourceZoomEnd:number;
}
export const DEFAULT_SOURCE_DIRECTION:SourceDirection={
  sourceLayout:"card",sourceFocusX:.5,sourceFocusY:.5,
  sourceZoomStart:1,sourceZoomEnd:1.075
};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const finite=(v:unknown,fallback:number,min:number,max:number)=>
  typeof v==="number"&&Number.isFinite(v)?clamp(Number(v.toFixed(3)),min,max):fallback;
export function sanitizeSourceDirection(raw:unknown):SourceDirection{
  const o=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
  return {
    sourceLayout:["card","theater","split","immersive"].includes(String(o.sourceLayout))
      ?o.sourceLayout as SourceLayout:"card",
    sourceFocusX:finite(o.sourceFocusX,.5,0,1),
    sourceFocusY:finite(o.sourceFocusY,.5,0,1),
    sourceZoomStart:finite(o.sourceZoomStart,1,1,2),
    sourceZoomEnd:finite(o.sourceZoomEnd,1.075,1,2)
  };
}
export interface CropRect{sx:number;sy:number;sw:number;sh:number}
/** Pure cover-crop with smooth optical zoom, supports extreme source ratios. */
export function sourceCrop(sourceW:number,sourceH:number,targetW:number,targetH:number,
  focusX:number,focusY:number,zoom:number):CropRect{
  if(![sourceW,sourceH,targetW,targetH].every(x=>Number.isFinite(x)&&x>0))
    throw Error("Real media crop requires positive decoded source and canvas dimensions");
  const ratio=targetW/targetH,actual=sourceW/sourceH;
  let sw=actual>ratio?sourceH*ratio:sourceW;
  let sh=actual>ratio?sourceH:sourceW/ratio;
  const z=clamp(Number.isFinite(zoom)?zoom:1,1,2);
  sw/=z;sh/=z;
  return {
    sx:clamp(Number.isFinite(focusX)?focusX:.5,0,1)*(sourceW-sw),
    sy:clamp(Number.isFinite(focusY)?focusY:.5,0,1)*(sourceH-sh),
    sw,sh
  };
}
export function sourceZoom(direction:SourceDirection,progress:number):number{
  const t=clamp(Number.isFinite(progress)?progress:0,0,1);
  const ease=t*t*(3-2*t);
  return direction.sourceZoomStart+(direction.sourceZoomEnd-direction.sourceZoomStart)*ease;
}
export interface StageRect{x:number;y:number;w:number;h:number;r:number;angle:number}
export function sourceStage(layout:SourceLayout,W:number,H:number):StageRect{
  const landscape=H<810;
  const square=H>=810&&H<1250;
  if(layout==="immersive")return{x:0,y:0,w:W,h:H,r:0,angle:0};
  if(layout==="split"){
    return landscape
      ?{x:W*.455,y:H*.16,w:W*.46,h:H*.73,r:15,angle:0}
      :{x:W*.10,y:square?H*.65:H*.675,w:W*.8,h:square?H*.26:H*.25,r:20,angle:0};
  }
  if(layout==="theater"){
    return landscape
      ?{x:W*.48,y:H*.11,w:W*.46,h:H*.78,r:14,angle:-.007}
      :{x:W*.09,y:square?H*.61:H*.675,w:W*.82,h:square?H*.31:H*.25,r:21,angle:-.008};
  }
  const width=landscape?W*.46:W*.84;
  const h=landscape?H*.57:square?H*.21:H*.25;
  const cx=landscape?W*.74:W*.5;
  const cy=landscape?H*.55:square?H*.72:H*.775;
  return{x:cx-width/2,y:cy-h/2,w:width,h,r:landscape?17:24,angle:-.021};
}
