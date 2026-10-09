export type MotionBrand = "veto" | "promptence" | "raios" | "labs";
export type MotionFormat = "portrait" | "square" | "landscape";
export type MotionSceneKind = "opener" | "statement" | "network" | "closer";

export interface MotionScene {
  id: string;
  kind: MotionSceneKind;
  eyebrow: string;
  headline: string;
  support: string;
  seconds: number;
}
export interface MotionProject {
  version: 1;
  title: string;
  brand: MotionBrand;
  format: MotionFormat;
  scenes: MotionScene[];
}

export const BRAND_INFO: Record<MotionBrand, { name: string; accent: string; soft: string; caption: string }> = {
  veto: { name: "VETO INTELLIGENCE", accent: "#ed434a", soft: "#ffa7a6", caption: "DECISION INTELLIGENCE" },
  promptence: { name: "PROMPTENCE", accent: "#c9f187", soft: "#e6ffc1", caption: "AI VISIBILITY INTELLIGENCE" },
  raios: { name: "RAIOS", accent: "#90b9f7", soft: "#d4e4ff", caption: "RESTAURANT INTELLIGENCE" },
  labs: { name: "MARGARYAN LABS", accent: "#f2f2ec", soft: "#c6c8cf", caption: "INDEPENDENT AI SYSTEMS" }
};

export const FORMAT_SIZE: Record<MotionFormat, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  landscape: { width: 1920, height: 1080 }
};

const STARTERS: Record<MotionBrand, { title: string; scenes: Omit<MotionScene, "id">[] }> = {
  veto: {
    title: "VETO / THE DECISION",
    scenes: [
      { kind: "opener", eyebrow: "THE MARKET IS NOISY", headline: "SIGNAL OVER NOISE.", support: "The next decision needs evidence.", seconds: 4 },
      { kind: "network", eyebrow: "MULTI-SOURCE INTELLIGENCE", headline: "SEE THE SYSTEM.", support: "Risk. Context. Uncertainty.", seconds: 5 },
      { kind: "statement", eyebrow: "NO FALSE CERTAINTY", headline: "QUESTION EVERY SIGNAL.", support: "Discipline beats predictions.", seconds: 5 },
      { kind: "closer", eyebrow: "THE NEXT MOVE IS YOURS", headline: "VETO INTELLIGENCE", support: "Decisions, not promises.", seconds: 4 }
    ]
  },
  promptence: {
    title: "PROMPTENCE / BE FOUND",
    scenes: [
      { kind: "opener", eyebrow: "DISCOVERY HAS CHANGED", headline: "CAN AI FIND YOU?", support: "Your next customer may ask a model first.", seconds: 4 },
      { kind: "network", eyebrow: "VISIBILITY IS MEASURABLE", headline: "MEASURE THE ANSWER.", support: "Find gaps across AI discovery.", seconds: 5 },
      { kind: "statement", eyebrow: "FROM INSIGHT TO ACTION", headline: "FIX WHAT MATTERS.", support: "Verify progress with evidence.", seconds: 5 },
      { kind: "closer", eyebrow: "OWN YOUR VISIBILITY", headline: "PROMPTENCE", support: "AI Search Intelligence.", seconds: 4 }
    ]
  },
  raios: {
    title: "RAIOS / PROFIT CLARITY",
    scenes: [
      { kind: "opener", eyebrow: "EVERY MARGIN COUNTS", headline: "WHERE DOES PROFIT GO?", support: "Restaurant decisions deserve real data.", seconds: 4 },
      { kind: "network", eyebrow: "OPERATIONAL SIGNAL", headline: "CONNECT THE DOTS.", support: "Detect. Explain. Prioritize.", seconds: 5 },
      { kind: "statement", eyebrow: "EVIDENCE OVER GUESSWORK", headline: "PROVE THE DELTA.", support: "Measure improvements after action.", seconds: 5 },
      { kind: "closer", eyebrow: "INTELLIGENCE IN MOTION", headline: "RAIOS", support: "Turn operations into clarity.", seconds: 4 }
    ]
  },
  labs: {
    title: "MARGARYAN / MOTION",
    scenes: [
      { kind: "opener", eyebrow: "THE FUTURE IS BUILT", headline: "IDEAS NEED MOTION.", support: "A new standard for product storytelling.", seconds: 4 },
      { kind: "network", eyebrow: "SYSTEMS, NOT SLOGANS", headline: "DESIGN THE SIGNAL.", support: "Technology with a point of view.", seconds: 5 },
      { kind: "statement", eyebrow: "FROM CONCEPT TO PRODUCT", headline: "MAKE IT TANGIBLE.", support: "Every frame has a purpose.", seconds: 5 },
      { kind: "closer", eyebrow: "MARGARYAN LABS", headline: "BUILT FOR TOMORROW.", support: "Motion Studio.", seconds: 4 }
    ]
  }
};

export function makeMotionPreset(brand: MotionBrand = "veto", format: MotionFormat = "portrait"): MotionProject {
  const item = STARTERS[brand];
  return { version: 1, title: item.title, brand, format, scenes: item.scenes.map((scene, index) => ({ ...scene, id: "scene-" + (index + 1) })) };
}

export function sanitizeMotionProject(input: unknown): MotionProject {
  if (!input || typeof input !== "object") throw new Error("Invalid storyboard");
  const obj = input as Record<string, unknown>;
  const brand: MotionBrand = ["veto", "promptence", "raios", "labs"].includes(String(obj.brand)) ? obj.brand as MotionBrand : "labs";
  const format: MotionFormat = ["portrait", "square", "landscape"].includes(String(obj.format)) ? obj.format as MotionFormat : "portrait";
  const sceneInput = Array.isArray(obj.scenes) ? obj.scenes.slice(0, 8) : [];
  if (sceneInput.length < 1) throw new Error("Storyboard must contain at least one scene");
  const clean = (value: unknown, max: number) => String(typeof value === "string" ? value : "").trim().slice(0, max);
  const scenes = sceneInput.map((raw, index) => {
    const s = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const kind: MotionSceneKind = ["opener", "statement", "network", "closer"].includes(String(s.kind)) ? s.kind as MotionSceneKind : "statement";
    const seconds = Number(s.seconds);
    return {
      id: "scene-" + (index + 1),
      kind,
      eyebrow: clean(s.eyebrow, 65),
      headline: clean(s.headline, 105) || "YOUR NEXT IDEA",
      support: clean(s.support, 180),
      seconds: Math.max(2, Math.min(8, Number.isFinite(seconds) ? seconds : 4))
    };
  });
  return { version: 1, title: clean(obj.title, 100) || "UNTITLED MOTION", brand, format, scenes };
}

export function durationOf(project: MotionProject) {
  return project.scenes.reduce((total, scene) => total + scene.seconds, 0);
}

export function sceneAt(project: MotionProject, elapsed: number) {
  const total = durationOf(project);
  let cursor = 0;
  const safe = Math.max(0, Math.min(elapsed, Math.max(0, total - 0.0001)));
  for (let index = 0; index < project.scenes.length; index++) {
    const scene = project.scenes[index];
    if (safe < cursor + scene.seconds || index === project.scenes.length - 1) {
      return { scene, index, local: Math.max(0, safe - cursor), progress: Math.min(1, Math.max(0, (safe - cursor) / scene.seconds)) };
    }
    cursor += scene.seconds;
  }
  return { scene: project.scenes[0], index: 0, local: 0, progress: 0 };
}

function ease(t: number) { return 1 - Math.pow(1 - Math.max(0, Math.min(t, 1)), 3); }
function lines(ctx: CanvasRenderingContext2D, phrase: string, maxWidth: number, fontSize: number) {
  const parts = phrase.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  let line = "";
  for (const word of parts) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) { result.push(line); line = word; }
    else line = next;
  }
  if (line) result.push(line);
  // Break exceptionally long unspaced strings without clipping.
  return result.flatMap(part => {
    if (ctx.measureText(part).width <= maxWidth) return [part];
    const chunks: string[] = [];
    let chunk = "";
    for (const char of Array.from(part)) {
      if (ctx.measureText(chunk + char).width > maxWidth && chunk) { chunks.push(chunk); chunk = char; }
      else chunk += char;
    }
    if (chunk) chunks.push(chunk);
    return chunks;
  });
}

export function drawMotionFrame(
  ctx: CanvasRenderingContext2D, project: MotionProject, time: number, width: number, height: number
) {
  const info = BRAND_INFO[project.brand];
  const total = Math.max(1, durationOf(project));
  const { scene, index, progress } = sceneAt(project, time);
  const baseWidth = 1080;
  const baseHeight = baseWidth * height / width;
  ctx.save();
  ctx.setTransform(width / baseWidth, 0, 0, height / baseHeight, 0, 0);
  const W = baseWidth, H = baseHeight;
  const landscape = H < 800;
  const pad = landscape ? 86 : 84;
  const inner = W - pad * 2;

  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#11151b");
  background.addColorStop(.48, "#090b0f");
  background.addColorStop(1, "#050608");
  ctx.fillStyle = background; ctx.fillRect(0, 0, W, H);

  // Algorithmic design elements: decorative, never fabricated real market data.
  ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 1;
  const step = landscape ? 72 : 96;
  for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  const centerX = W * (.62 + Math.sin(time * .28) * .055);
  const centerY = H * (.37 + Math.cos(time * .23) * .045);
  const halo = ctx.createRadialGradient(centerX, centerY, 3, centerX, centerY, landscape ? 470 : 740);
  halo.addColorStop(0, info.accent + "23");
  halo.addColorStop(1, "#05060800");
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = info.accent; ctx.fillRect(pad, 70, 42, 7);
  ctx.fillStyle = "#d9dce2"; ctx.font = "700 23px Arial, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(info.name, pad + 60, 87);
  ctx.font = "600 14px Arial, sans-serif"; ctx.fillStyle = "#747e8e"; ctx.textAlign = "right";
  ctx.fillText("MOTION / " + String(index + 1).padStart(2, "0"), W - pad, 85);

  // Deterministic particles: stable across preview and export for identical timestamps.
  for (let i = 0; i < 44; i++) {
    const px = ((i * 131.11 + Math.sin(time * (.2 + i % 7 * .03) + i) * 38) % W + W) % W;
    const py = ((i * 251.17 - time * (7 + i % 9)) % H + H) % H;
    ctx.globalAlpha = .08 + .25 * (0.5 + 0.5 * Math.sin(time + i));
    ctx.fillStyle = i % 5 === 0 ? info.accent : "#b5c1d7";
    ctx.beginPath(); ctx.arc(px, py, i % 9 === 0 ? 2.6 : 1.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (scene.kind === "network") {
    const offset = time * 75;
    const center = H * (landscape ? .67 : .67);
    ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = info.accent + "a0";
    ctx.beginPath();
    for (let x = pad; x < W - pad; x += 8) {
      const curve = Math.sin((x + offset) / 75) * 32 + Math.sin((x + offset) / 32) * 12;
      const y = center + curve;
      if (x === pad) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = pad + i * inner / 8;
      const y = center + Math.sin((x + offset) / 75) * 32 + Math.sin((x + offset) / 32) * 12;
      ctx.fillStyle = info.accent; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#6f7888"; ctx.font = "500 13px Arial, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("ABSTRACT SIGNAL VISUALIZATION", pad, center + 92);
  } else {
    ctx.strokeStyle = info.accent + "48"; ctx.lineWidth = 2;
    const ringX = landscape ? 790 : W * .69, ringY = H * (landscape ? .55 : .7);
    const r = landscape ? 132 : 210;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(ringX, ringY, r + i * 45 + Math.sin(time + i) * 8, (r + i * 45) * .48, -.25, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  const inT = ease(Math.min(1, progress * 5));
  const outT = Math.min(1, Math.max(0, (1 - progress) * 8));
  const alpha = inT * outT;
  ctx.save(); ctx.globalAlpha = alpha;
  const yShift = (1 - inT) * 58;
  const headlineY = H * (landscape ? .33 : .37) + yShift;
  ctx.fillStyle = info.accent; ctx.font = "700 19px Arial, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(scene.eyebrow.toUpperCase(), pad, headlineY - 72);

  const maximum = landscape ? 96 : 113;
  let fontSize = maximum;
  let wrapped: string[] = [];
  // Fit long user-defined headlines rather than clipping on mobile/export.
  while (fontSize >= 42) {
    ctx.font = "900 " + fontSize + "px Arial, sans-serif";
    wrapped = lines(ctx, scene.headline.toUpperCase(), inner, fontSize);
    if (wrapped.length <= (landscape ? 2 : 4) && wrapped.every(line => ctx.measureText(line).width <= inner)) break;
    fontSize -= 4;
  }
  ctx.textBaseline = "top"; ctx.fillStyle = "#f8f9fb";
  const lineHeight = fontSize * 1.04;
  wrapped.slice(0, landscape ? 3 : 5).forEach((line, i) => ctx.fillText(line, pad, headlineY + i * lineHeight));

  const afterHeadline = headlineY + Math.min(wrapped.length, landscape ? 3 : 5) * lineHeight + 35;
  ctx.font = "400 " + (landscape ? 25 : 27) + "px Arial, sans-serif";
  ctx.fillStyle = "#b3bcc9";
  lines(ctx, scene.support, inner * .9, landscape ? 25 : 27).slice(0, 3).forEach((line, i) => ctx.fillText(line, pad, afterHeadline + i * 37));
  ctx.restore();

  ctx.fillStyle = "#6d7582"; ctx.font = "600 16px Arial, sans-serif"; ctx.textAlign = "left";
  ctx.fillText(info.caption, pad, H - 124);
  ctx.textAlign = "right"; ctx.fillText("MARGARYAN / MOTION STUDIO", W - pad, H - 124);
  ctx.fillStyle = "#303740"; ctx.fillRect(pad, H - 96, inner, 3);
  ctx.fillStyle = info.accent; ctx.fillRect(pad, H - 96, inner * Math.min(1, time / total), 3);
  ctx.restore();
}
