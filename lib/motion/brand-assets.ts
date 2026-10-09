import { VERIFIED_LOGOS } from "./portfolio";
import type { MotionBrand } from "./studio";

const loaded = new Map<MotionBrand, HTMLImageElement>();
const jobs = new Map<MotionBrand, Promise<boolean>>();

/** Load only allowlisted same-origin official SVG assets, never arbitrary remote images. */
export async function preloadMotionLogo(brand: MotionBrand): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (loaded.has(brand)) return true;
  const path = VERIFIED_LOGOS[brand];
  if (!path || !path.startsWith("/motion/brands/")) return false;
  const existing = jobs.get(brand);
  if (existing) return existing;
  const job = new Promise<boolean>(resolve=>{
    const img=new Image();
    img.onload=()=>{loaded.set(brand,img);resolve(true);};
    img.onerror=()=>resolve(false);
    img.src=path;
  });
  jobs.set(brand,job);
  return job;
}
export function getLoadedMotionLogo(brand: MotionBrand): HTMLImageElement | undefined {
  return loaded.get(brand);
}
