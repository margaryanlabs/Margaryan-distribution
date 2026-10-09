export type MotionBrand = "veto" | "promptence" | "raios" | "labs";
export type MotionFormat = "portrait" | "square" | "landscape";
export type MotionSceneKind = "opener" | "statement" | "network" | "closer" | "kinetic" | "orbit";

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
  style?: "cinematic" | "kinetic" | "technical";
  seed?: number;
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
    const kind: MotionSceneKind = ["opener", "statement", "network", "closer", "kinetic", "orbit"].includes(String(s.kind)) ? s.kind as MotionSceneKind : "statement";
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
  const style = ["cinematic", "kinetic", "technical"].includes(String(obj.style)) ? obj.style as MotionProject["style"] : "cinematic";
  const seed = typeof obj.seed === "number" && Number.isFinite(obj.seed) ? Math.floor(obj.seed) >>> 0 : 41;
  return { version: 1, title: clean(obj.title, 100) || "UNTITLED MOTION", brand, format, style, seed, scenes };
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

