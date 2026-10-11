import type { MotionScene } from "./studio";

/**
 * The existing time-addressable 2D renderer stays the source of truth.
 * Optional WebGL rendering is registered ONLY by the client-side lazy loader.
 * This module has no Three.js imports so the standard Motion export stays small.
 */
export type SpatialFrameRenderer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accent: string,
  time: number,
  progress: number,
  index: number,
  scene: MotionScene
) => void;

let activeRenderer: SpatialFrameRenderer | null = null;
let pending: Promise<void> | null = null;
let errorMessage: string | null = null;

export function spatialStatus(): "unloaded" | "loading" | "ready" | "unavailable" {
  return activeRenderer ? "ready" : pending ? "loading" : errorMessage ? "unavailable" : "unloaded";
}
export function spatialError(): string | null { return errorMessage; }
export function drawSpatialFrame(
  ctx:CanvasRenderingContext2D,w:number,h:number,accent:string,time:number,
  progress:number,index:number,scene:MotionScene
):boolean {
  if(!activeRenderer)return false;
  activeRenderer(ctx,w,h,accent,time,progress,index,scene);
  return true;
}
export async function ensureSpatialRenderer():Promise<void> {
  if(activeRenderer)return;
  if(errorMessage)throw new Error(errorMessage);
  if(typeof window==="undefined"||typeof document==="undefined")throw new Error("WebGL needs an interactive browser");
  if(!pending) {
    pending=import("./spatial-engine")
      .then(module=>{activeRenderer=module.createSpatialRenderer();})
      .catch(error=>{
        errorMessage="WebGL renderer unavailable: "+(error instanceof Error?error.message:String(error));
        throw new Error(errorMessage);
      })
      .finally(()=>{pending=null;});
  }
  await pending;
}
