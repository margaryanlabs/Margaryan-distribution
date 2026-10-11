/** One genuine owner-approved image overlay per Cinematic shot.
 * This is the first independent compositing layer of Advanced Editor:
 * source pixels only, no text-to-image provider, URL fetching or code eval.
 */
export type OverlayCorner="bottom-right"|"bottom-left"|"top-right"|"top-left";
export interface OverlayDirection{
  overlayCorner:OverlayCorner;
  overlaySize:number;
  overlayOpacity:number;
  overlayStart:number;
  overlayDuration:number;
}
export const OVERLAY_CORNERS:OverlayCorner[]=[
  "bottom-right","bottom-left","top-right","top-left"
];
export function sanitizeOverlayDirection(input:unknown,shotSeconds:number):OverlayDirection{
 const o=input&&typeof input==="object"&&!Array.isArray(input)?input as Record<string,unknown>:{};
 const finite=(name:string,min:number,max:number,fallback:number)=>{
   const x=o[name];
   return typeof x==="number"&&Number.isFinite(x)
     ?Math.max(min,Math.min(max,Number(x.toFixed(2)))):fallback;
 };
 const limit=Math.max(2,Math.min(8,shotSeconds));
 const start=finite("overlayStart",0,limit-.25,0);
 return{
   overlayCorner:OVERLAY_CORNERS.includes(o.overlayCorner as OverlayCorner)?
     o.overlayCorner as OverlayCorner:"bottom-right",
   overlaySize:finite("overlaySize",.16,.48,.30),
   overlayOpacity:finite("overlayOpacity",.20,1,.95),
   overlayStart:start,
   overlayDuration:finite("overlayDuration",.25,Math.max(.25,limit-start),limit-start)
 };
}
export function overlayIsVisible(direction:OverlayDirection,local:number):boolean{
 return local>=direction.overlayStart&&local<direction.overlayStart+direction.overlayDuration;
}
export function overlayGeometry(corner:OverlayCorner,W:number,H:number,fraction:number){
 const narrow=H/W>1.25;
 const width=W*Math.min(.48,Math.max(.16,fraction));
 const height=width*(narrow?.73:.62);
 const marginX=Math.max(36,W*.055),marginY=Math.max(45,H*.085);
 const right=corner.endsWith("right"),bottom=corner.startsWith("bottom");
 return {x:right?W-marginX-width:marginX,
   y:bottom?H-marginY-height:marginY,
   w:width,h:height};
}
export function overlayEnvelope(direction:OverlayDirection,local:number){
 const rel=local-direction.overlayStart,remaining=direction.overlayDuration-rel;
 const fade=.18;
 return Math.max(0,Math.min(1,rel/fade,remaining/fade))*direction.overlayOpacity;
}
