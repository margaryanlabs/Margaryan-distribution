import {
  BRAND_INFO, durationOf, sceneAt,
  type MotionProject, type MotionScene
} from "./studio";
import { drawProductComposition } from "./product-compositions";
import { drawCinematicSet } from "./cinematic-craft";
import { getLoadedMotionLogo } from "./brand-assets";
import { FILM_FONT, fitShotCopy } from "./typography";
import { drawWorldRig, withSceneCamera } from "./camera-rig";

const TAU = Math.PI * 2;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const cubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
function rand(value: number) {
  const x = Math.sin(value * 127.1 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function pathLine(ctx: CanvasRenderingContext2D, coords: [number, number][], color: string, weight: number) {
  if (coords.length < 2) return;
  ctx.beginPath(); ctx.moveTo(...coords[0]);
  for (let i = 1; i < coords.length; i++) ctx.lineTo(...coords[i]);
  ctx.lineWidth = weight; ctx.strokeStyle = color; ctx.stroke();
}
function disk(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(.1, radius), 0, TAU); ctx.fill();
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const radial = ctx.createRadialGradient(x, y, 0, x, y, r);
  radial.addColorStop(0, color + "39");
  radial.addColorStop(.55, color + "0f");
  radial.addColorStop(1, color + "00");
  ctx.fillStyle = radial; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function textLines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let part = "";
  for (const word of words) {
    if (ctx.measureText(word).width > width) {
      if (part) { lines.push(part); part = ""; }
      let chunk = "";
      for (const char of Array.from(word)) {
        if (chunk && ctx.measureText(chunk + char).width > width) { lines.push(chunk); chunk = char; }
        else chunk += char;
      }
      part = chunk;
    } else if (part && ctx.measureText(part + " " + word).width > width) {
      lines.push(part); part = word;
    } else part = part ? part + " " + word : word;
  }
  if (part) lines.push(part);
  return lines;
}
function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, accent: string, t: number, seed: number, technical: boolean) {
  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, technical ? "#101a23" : "#16191f");
  background.addColorStop(.5, "#090c12");
  background.addColorStop(1, "#040609");
  ctx.fillStyle = background; ctx.fillRect(0, 0, W, H);
  glow(ctx, W * .68 + Math.cos(t * .2) * 90, H * .5, Math.min(H * .5, 650), accent);
  glow(ctx, W * .08, H * .81, 400, "#5777b3");

  ctx.save(); ctx.strokeStyle = "#ffffff0b"; ctx.lineWidth = 1;
  // The vanishing-point lattice creates perceived depth without external shaders.
  const horizon = H * .58;
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath(); ctx.moveTo(W * .54 + i * 30, horizon);
    ctx.lineTo(W * .54 + i * W * .35, H + 400); ctx.stroke();
  }
  for (let i = 0; i < 15; i++) {
    const p = ((i * 37 + t * 9) % 600) / 600;
    const y = horizon + p * p * (H - horizon);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // Stable seeded point cloud: no randomness between frames/export.
  for (let i = 0; i < 85; i++) {
    const x = (rand(seed + i * 19) * W + Math.sin(t * .3 + i) * 17 + W) % W;
    const y = (rand(seed + i * 53) * H + t * (3 + i % 8)) % H;
    const radius = .5 + rand(seed + i * 23) * 1.8;
    disk(ctx, x, y, radius, i % 9 === 0 ? accent + "98" : "#bcc5d070");
  }
  const vignette = ctx.createRadialGradient(W / 2, H * .46, H * .2, W / 2, H * .46, H * .95);
  vignette.addColorStop(0, "#00000000"); vignette.addColorStop(1, "#000000a1");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
}
function drawOrbit(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string, seed: number, energy: number) {
  const landscape = H < 810;
  const cx = W * (landscape ? .72 : .61);
  const cy = H * (landscape ? .56 : .7);
  const r = Math.min(W * .27, H * .27);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.3);
  for (let ring = 0; ring < 6; ring++) {
    const rx = r * (.6 + ring * .18);
    const ry = rx * (.35 + ring * .04);
    ctx.save();
    ctx.rotate(t * (ring % 2 === 0 ? .025 : -.03) + ring * .28);
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.lineWidth = ring === 0 ? 2.5 : .8;
    ctx.strokeStyle = accent + (ring === 0 ? "ad" : "46"); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = t * (.28 + ring * .04) + i * TAU / 4 + ring;
      const x = rx * Math.cos(a), y = ry * Math.sin(a);
      if (i === 0 && ring % 2 === 0) glow(ctx, x, y, 55, accent);
      disk(ctx, x, y, i === 0 ? 4.8 : 2.2, i === 0 ? accent : "#a4b2c6b3");
    }
    ctx.restore();
  }
  const core = ctx.createRadialGradient(0, 0, 1, 0, 0, 110);
  core.addColorStop(0, accent + "b0"); core.addColorStop(.14, accent + "47"); core.addColorStop(1, accent + "00");
  ctx.fillStyle = core; ctx.beginPath(); ctx.arc(0, 0, 110, 0, TAU); ctx.fill();
  ctx.restore();
  // Low-frequency parallax accents.
  for (let i = 0; i < 12; i++) {
    const x = cx + Math.sin(i * 1.7 + t * .17) * r * 2.3;
    const y = cy + Math.cos(i * 2.1 + t * .14) * r * 1.2;
    disk(ctx, x, y, 1 + energy * .4, i % 4 ? "#dde6ec54" : accent + "74");
  }
  void seed;
}
function drawNetwork(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string, seed: number) {
  const low = H < 810;
  const yCenter = H * (low ? .67 : .7);
  const lowWidth = 960;
  const nodes: [number, number][] = [];
  for (let i = 0; i < 23; i++) {
    const x = 60 + (i / 22) * lowWidth;
    const y = yCenter + Math.sin(t * .77 + i * .7) * (low ? 38 : 85) + Math.cos(i * .21 + t * .3) * 32;
    nodes.push([x, y]);
  }
  ctx.save();
  for (let i = 0; i < nodes.length - 2; i++) {
    const p = nodes[i], q = nodes[i + 2];
    pathLine(ctx, [p, q], i % 4 === 0 ? accent + "45" : "#9fbbcf24", 1.2);
  }
  for (let j = 0; j < 5; j++) {
    ctx.beginPath();
    for (let x = 60; x < 1020; x += 9) {
      const y = yCenter + Math.sin(x * .015 + t * (.55 + j * .12) + j) * (low ? 20 : 38) + Math.cos(x * .007 + t + j) * (j * 6);
      if (x === 60) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineWidth = j === 0 ? 3.2 : 1.2;
    ctx.strokeStyle = j === 0 ? accent + "f0" : accent + "32";
    ctx.stroke();
  }
  nodes.forEach(([x, y], i) => {
    if (i % 3 === 0) glow(ctx, x, y, 27, accent);
    disk(ctx, x, y, 2 + rand(seed + i * 5) * 2.5, i % 3 === 0 ? accent : "#e5ebf0");
  });
  ctx.restore();
}
function drawKinetic(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string, seed: number) {
  const cy = H * .69;
  ctx.save();
  ctx.translate(W * .5, cy);
  ctx.rotate(-.23);
  for (let i = 0; i < 17; i++) {
    const phase = (i * 83 - t * (110 + i * 5)) % (W + 500);
    const x = ((phase + W + 500) % (W + 500)) - W;
    const y = (i - 8) * 43;
    const wide = 100 + rand(seed + i * 4) * 240;
    ctx.fillStyle = i % 4 === 0 ? accent + "93" : "#b4c2d122";
    ctx.fillRect(x, y, wide, i % 3 === 0 ? 10 : 2);
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = accent + (i === 0 ? "95" : "28"); ctx.lineWidth = i === 0 ? 3 : 1;
    ctx.strokeRect(95 + 60 * i, cy - 100 + i * 36, W - 190 - 120 * i, (H < 810 ? 140 : 270) - i * 47);
  }
}
function drawTechnical(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, accent: string) {
  const x0 = 100, y0 = H * (H < 810 ? .64 : .76);
  ctx.save(); ctx.lineWidth = 1;
  for (let x = 0; x < 17; x++) {
    const height = (35 + (Math.sin(x * .71 + t * 1.8) + 1) * 41) * (H < 810 ? .5 : 1);
    ctx.strokeStyle = x % 4 === 0 ? accent + "b9" : accent + "5f";
    ctx.strokeRect(x0 + x * 53, y0 - height, 18, height);
  }
  ctx.strokeStyle = accent + "8d";
  const sweepX = x0 + ((t * 95) % (W - x0 * 2));
  ctx.beginPath(); ctx.moveTo(sweepX, y0 - 155); ctx.lineTo(sweepX, y0 + 26); ctx.stroke();
  ctx.restore();
}

function renderText(
  ctx:CanvasRenderingContext2D,scene:MotionScene,W:number,H:number,
  progress:number,accent:string,t:number,style:MotionProject["style"],language:MotionProject["language"]
){
  const headline=scene.headline.toLocaleUpperCase(language||"en");
  const g=fitShotCopy(ctx,headline,scene.support,W,H);
  const fadeIn=cubic(progress*5.8);
  const fadeOut=smooth((1-progress)*10);
  const opacity=fadeIn*fadeOut;
  const originalAlpha=ctx.globalAlpha;
  ctx.save();
  ctx.globalAlpha=originalAlpha*opacity;
  ctx.textAlign="left";ctx.textBaseline="top";
  ctx.font='800 19px '+FILM_FONT;
  // The eyebrow uses the same fit-to-width policy as headlines.
  let eyebrowSize=H<810?15:19;
  const kicker=scene.eyebrow.toLocaleUpperCase(language||"en");
  for(;eyebrowSize>10;eyebrowSize--){
    ctx.font='800 '+eyebrowSize+'px '+FILM_FONT;
    if(ctx.measureText(kicker).width<=g.width)break;
  }
  ctx.fillStyle=accent;ctx.fillText(kicker,g.x,g.eyebrowY);
  const stagger=scene.kind==="kinetic"||style==="kinetic";
  ctx.font='850 '+g.title.fontSize+'px '+FILM_FONT;
  ctx.fillStyle="#F3F5F8";
  for(const [index,line] of g.title.lines.entries()){
    const reveal=cubic((progress-index*.075)*(stagger?5.2:7.5));
    ctx.save();
    ctx.globalAlpha=originalAlpha*opacity*reveal;
    const dx=stagger?(1-reveal)*(index%2?-120:115):-(1-reveal)*38;
    const dy=stagger?0:(1-reveal)*38;
    ctx.shadowColor=accent+"42";ctx.shadowBlur=10;
    ctx.fillText(line,g.x+dx,g.titleY+index*g.title.lineHeight+dy);
    ctx.restore();
  }
  // Subtitle is kept in an explicit lower region, separate from hero graphics.
  const supportY=g.titleY+g.title.totalHeight+g.supportGap;
  ctx.fillStyle="#B1BDC7";
  ctx.font='400 '+g.supportSize+'px '+FILM_FONT;
  g.supportLines.forEach((line,index)=>{
    ctx.fillText(line,g.x,supportY+index*(g.supportSize+10));
  });
  ctx.fillStyle=accent;
  ctx.fillRect(g.x,g.titleY+g.title.totalHeight+(H<810?4:13),
    Math.max(13,53+Math.sin(t*2)*13),2.5);
  ctx.restore();
}

function drawShot(ctx: CanvasRenderingContext2D, project: MotionProject, index: number, localTime: number, absoluteTime: number, W: number, H: number, alpha: number) {
  const scene = project.scenes[index];
  const accent = BRAND_INFO[project.brand].accent;
  const progress = clamp(localTime / scene.seconds);
  const seed = (project.seed || 0) + index * 197;
  ctx.save(); ctx.globalAlpha = alpha;
  drawBackground(ctx, W, H, accent, absoluteTime, seed, project.style === "technical");
  // A shot has its own optical staging, hero moment and tempo.
  // Product interfaces are deliberately selective rather than repeated behind
  // every headline, which made the previous film resemble a slide carousel.
  withSceneCamera(ctx,W,H,progress,index,()=>{
    if(scene.kind==="opener"||scene.kind==="network"||scene.kind==="orbit"){
      drawWorldRig(ctx,W,H,absoluteTime,accent,index,
        scene.kind==="opener"?"floor":scene.kind==="orbit"?"portal":"signal");
    }
    drawCinematicSet(ctx, project, scene, index, absoluteTime, progress, W, H);
    if (scene.kind === "network") {
      drawProductComposition(ctx, project, scene, absoluteTime, W, H, accent);
    }
  });
  // Text is outside the camera transform: never sacrifice glyph readability.
  renderText(ctx, scene, W, H, progress, accent, absoluteTime, project.style, project.language);
  ctx.restore();
}

/** Original Promptence monogram from the official Promptence v18 SVG geometry. */
function drawPromptenceMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 64, size / 64);
  ctx.fillStyle = "#07100C";
  ctx.strokeStyle = "#1B2D24"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(1, 1, 62, 62, 15); ctx.fill(); ctx.stroke();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = "#F4F0E7"; ctx.lineWidth = 7;
  ctx.stroke(new Path2D("M15 52V24C15 20.686 17.686 18 21 18H34C43.389 18 50 23.768 50 32C50 40.232 43.389 46 34 46H25.5"));
  ctx.lineWidth = 6;
  ctx.stroke(new Path2D("M28 10H34C45.598 10 55 19.402 55 31"));
  ctx.stroke(new Path2D("M55 35C55 46.5 49 55 39.5 59"));
  ctx.strokeStyle = "#4EE6A1";
  ctx.stroke(new Path2D("M31 33L53 11"));
  ctx.fillStyle = "#4EE6A1";
  ctx.beginPath(); ctx.arc(31, 33, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Pure time-addressable canvas graphics: same scene and timestamp produce the same pixels. */
export function drawMotionFrame(ctx: CanvasRenderingContext2D, project: MotionProject, time: number, width: number, height: number) {
  const W = 1080, H = W * height / width;
  const total = durationOf(project);
  const t = clamp(time, 0, total);
  const { scene, local, index } = sceneAt(project, t);
  const accent = BRAND_INFO[project.brand].accent;
  ctx.save();
  ctx.setTransform(width / W, 0, 0, height / H, 0, 0);
  drawShot(ctx, project, index, local, t, W, H, 1);
  const transition = Math.min(.6, scene.seconds * .18);
  if (local > scene.seconds - transition && index < project.scenes.length - 1) {
    const amount = smooth((local - (scene.seconds - transition)) / transition);
    // Alternating editorial transition grammar: soft cross-dissolve / directional
    // vertical wipe / diagonal iris. The source shot remains fully drawn below.
    ctx.save();
    if (index % 3 === 1) {
      const top = H * (1 - amount);
      ctx.beginPath();ctx.rect(0, top, W, H - top);ctx.clip();
      drawShot(ctx, project, index + 1, Math.max(.05, amount * transition), t, W, H, 1);
    } else if (index % 3 === 2) {
      const span = W * 1.7;
      ctx.beginPath();ctx.moveTo(-W + amount * span,0);
      ctx.lineTo(amount * span,0);
      ctx.lineTo(amount * span - W *.6,H);
      ctx.lineTo(-W + amount * span - W*.6,H);
      ctx.closePath();ctx.clip();
      drawShot(ctx, project, index + 1, Math.max(.05, amount * transition), t, W, H, 1);
    } else {
      drawShot(ctx, project, index + 1, Math.max(.05, amount * transition), t, W, H, amount);
    }
    ctx.restore();
  }
  const pad = H < 810 ? 82 : 88;
  // Brand bars / metainformation are drawn above scene transitions.
  const top = H < 810 ? 28 : 55;
  const mark = getLoadedMotionLogo(project.brand);
  if (mark) {
    const scale = Math.min(54 / mark.naturalWidth, 54 / mark.naturalHeight);
    ctx.drawImage(mark, pad, top - 18 + (54 - mark.naturalHeight * scale)/2, mark.naturalWidth*scale, mark.naturalHeight*scale);
  } else if (project.brand === "promptence") drawPromptenceMark(ctx, pad, top - 18, 54);
  else { ctx.fillStyle = accent; ctx.fillRect(pad, top + 3, 43, 6); }
  ctx.fillStyle = "#d8e0e9"; ctx.font = "700 19px Arial, sans-serif";
  ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillText(BRAND_INFO[project.brand].name, pad + 65, top + 8);
  ctx.textAlign = "right"; ctx.fillStyle = "#8a96a3"; ctx.font = "700 13px Arial, sans-serif";
  ctx.fillText("MOTION ENGINE / " + String(index + 1).padStart(2,"0"), W - pad, top + 8);
  const footer = H - (H < 810 ? 65 : 103);
  ctx.textAlign = "left"; ctx.fillStyle = "#a1a8b4"; ctx.font = "600 13px Arial, sans-serif";
  ctx.fillText(BRAND_INFO[project.brand].caption, pad, footer - 15);
  ctx.textAlign = "right"; ctx.fillText("MARGARYAN / MOTION", W - pad, footer - 15);
  ctx.fillStyle = "#ffffff32"; ctx.fillRect(pad, footer + 9, W - 2 * pad, 3);
  ctx.fillStyle = accent; ctx.fillRect(pad, footer + 9, (W - 2 * pad) * clamp(t / Math.max(.01, total)), 3);
  ctx.restore();
}
