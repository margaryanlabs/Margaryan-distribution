export type MotionBrand = "veto" | "promptence" | "raios" | "labs" | "ingu" | "meqena" | "suren" | "veto_private" | "veto_sport" | "armat" | "tun" | "hay_engine" | "reality_engine";
export type MotionFormat = "portrait" | "square" | "landscape";
export type MotionSceneKind = "opener" | "statement" | "network" | "closer" | "kinetic" | "orbit" | "screen";

export interface MotionScene {
  id: string;
  kind: MotionSceneKind;
  eyebrow: string;
  headline: string;
  support: string;
  seconds: number;
  /** Measured font-size multiplier, 0.72–1, never removes words. */
  typographyScale?: number;
}
export interface MotionProject {
  version: 1;
  title: string;
  brand: MotionBrand;
  format: MotionFormat;
  style?: "cinematic" | "kinetic" | "technical";
  seed?: number;
  scenes: MotionScene[];
  language?: "en" | "ru" | "hy";
  /** Authored cinema route. Explicit project metadata, not inferred from title. */
  signatureFilm?: "promptence-answer";
}

export const BRAND_INFO: Record<MotionBrand, { name: string; accent: string; soft: string; caption: string }> = {
  veto: { name: "VETO INTELLIGENCE", accent: "#ed434a", soft: "#ffa7a6", caption: "DECISION INTELLIGENCE" },
  promptence: { name: "PROMPTENCE", accent: "#4EE6A1", soft: "#C8F7DC", caption: "AI SEARCH INTELLIGENCE" },
  raios: { name: "RAIOS", accent: "#90b9f7", soft: "#d4e4ff", caption: "RESTAURANT INTELLIGENCE" },
  labs: { name: "MARGARYAN LABS", accent: "#f2f2ec", soft: "#c6c8cf", caption: "INDEPENDENT AI SYSTEMS" },
  ingu: { name: "INGU", accent: "#f5f0eb", soft: "#d7d1ce", caption: "THE FASHION ARCHIVE" },
  meqena: { name: "MEQENA", accent: "#cbdce6", soft: "#e4ecf4", caption: "AUTOMOTIVE MARKETPLACE" },
  suren: { name: "SUREN PRIVATE", accent: "#e7e3df", soft: "#c6c0bb", caption: "DUBAI PRIVATE INTELLIGENCE" },
  veto_private: { name: "VETO PRIVATE", accent: "#ff553d", soft: "#ffc5ba", caption: "PRIVATE TELEGRAM EXPERIENCE" },
  veto_sport: { name: "VETO SPORT", accent: "#ff2d2d", soft: "#ffd2d2", caption: "EVIDENCE BEFORE THE ODDS" },
  armat: { name: "ARMAT", accent: "#e7b89d", soft: "#f6ddd2", caption: "ARMENIAN PRODUCT EXPORT" },
  tun: { name: "TUN", accent: "#D8C5A2", soft: "#FFF8EB", caption: "REAL ESTATE DECISION INTELLIGENCE" },
  hay_engine: { name: "HAY ENGINE", accent: "#D9FF63", soft: "#F4F5F6", caption: "ARMENIAN-FIRST LANGUAGE & CREATOR OS" },
  reality_engine: { name: "REALITY ENGINE", accent: "#91A8BC", soft: "#DDE9F3", caption: "SCENARIO-BASED DECISION INTELLIGENCE" }
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
    title: "PROMPTENCE / BE VISIBLE IN THE ANSWER",
    scenes: [
      { kind: "kinetic", eyebrow: "DISCOVERY HAS CHANGED", headline: "SEARCH IS CHANGING.", support: "The answer is the new front page.", seconds: 3.8 },
      { kind: "opener", eyebrow: "THE CUSTOMER JOURNEY", headline: "YOUR CUSTOMER ASKS AI.", support: "What appears in the answer?", seconds: 4.6 },
      { kind: "network", eyebrow: "VISIBILITY PROBLEM", headline: "WHAT IF YOU'RE NOT THERE?", support: "Illustrative AI visibility signal.", seconds: 4.3 },
      { kind: "orbit", eyebrow: "THE REVEAL", headline: "MAKE THE INVISIBLE VISIBLE.", support: "PROMPTENCE / AI Search Intelligence.", seconds: 4.5 },
      { kind: "statement", eyebrow: "THE INTELLIGENCE LOOP", headline: "DISCOVER. MEASURE. DIAGNOSE.", support: "Prioritize actions. Verify what changed.", seconds: 4.3 },
      { kind: "network", eyebrow: "PROVE THE CHANGE", headline: "FROM EVIDENCE TO ACTION.", support: "See what matters instead of guessing.", seconds: 3.6 },
      { kind: "closer", eyebrow: "OWN YOUR AI VISIBILITY", headline: "BE VISIBLE IN THE ANSWER.", support: "promptence.tech", seconds: 4.9 }
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
  ingu: {
    title: "INGU / THE FASHION ARCHIVE",
    scenes: [
      { kind: "kinetic", eyebrow: "THE ARCHIVE", headline: "STYLE IS A POINT OF VIEW.", support: "Not another endless feed.", seconds: 3.8 },
      { kind: "orbit", eyebrow: "THE DISCOVERY", headline: "DISCOVER YOUR NEXT PIECE.", support: "An editorial approach to fashion.", seconds: 4.5 },
      { kind: "network", eyebrow: "THE COLLECTION", headline: "MORE THAN A MARKETPLACE.", support: "Explore curated fashion.", seconds: 4.3 },
      { kind: "closer", eyebrow: "THE FASHION ARCHIVE", headline: "INGU", support: "ingu.shop", seconds: 4.8 }
    ]
  },
  meqena: {
    title: "MEQENA / THE DRIVE",
    scenes: [
      { kind: "kinetic", eyebrow: "THE NEXT ROAD", headline: "YOUR NEXT CAR STARTS HERE.", support: "A new way to discover vehicles.", seconds: 4 },
      { kind: "network", eyebrow: "DISCOVERY", headline: "EXPLORE WITH CLARITY.", support: "Find, compare and decide.", seconds: 4.5 },
      { kind: "orbit", eyebrow: "BEYOND THE LISTING", headline: "THE MARKET IN MOTION.", support: "For drivers and dealers.", seconds: 4.5 },
      { kind: "closer", eyebrow: "MEQENA", headline: "DISCOVER THE DRIVE.", support: "Automotive marketplace.", seconds: 4 }
    ]
  },
  suren: {
    title: "SUREN PRIVATE / BEYOND THE LISTING",
    scenes: [
      { kind: "opener", eyebrow: "DUBAI / PRIVATE ADVISORY", headline: "ACCESS IS NOT INSIGHT.", support: "See past the surface.", seconds: 4 },
      { kind: "orbit", eyebrow: "CAPITAL FIRST", headline: "THINK BEYOND THE VIEW.", support: "Property decisions need context.", seconds: 5 },
      { kind: "statement", eyebrow: "PRIVATE INTELLIGENCE", headline: "STRATEGY BEFORE SELECTION.", support: "Independent perspective on opportunities.", seconds: 5 },
      { kind: "closer", eyebrow: "SUREN PRIVATE", headline: "DECIDE WITH PERSPECTIVE.", support: "Dubai real estate intelligence.", seconds: 4 }
    ]
  },
  veto_private: {
    title: "VETO PRIVATE / YOUR SPACE",
    scenes: [
      { kind: "kinetic", eyebrow: "YOUR MESSAGES", headline: "PRIVACY NEEDS CLARITY.", support: "Understand your controls.", seconds: 4 },
      { kind: "network", eyebrow: "YOUR CONNECTION", headline: "KNOW WHAT IS ENABLED.", support: "Transparent settings and connection status.", seconds: 4.5 },
      { kind: "orbit", eyebrow: "YOUR EXPERIENCE", headline: "DESIGNED FOR CONTROL.", support: "Tools for your Telegram experience.", seconds: 4.5 },
      { kind: "closer", eyebrow: "VETO PRIVATE", headline: "YOUR SPACE. YOUR CHOICE.", support: "Privacy controls, explained.", seconds: 4 }
    ]
  },
  veto_sport: {
    title: "VETO SPORT / AUDIT THE PRICE",
    scenes: [
      { kind: "kinetic", eyebrow: "QUESTION THE ODDS", headline: "THE PRICE IS NOT THE TRUTH.", support: "Markets imply probabilities.", seconds: 4 },
      { kind: "network", eyebrow: "SPORT INTELLIGENCE", headline: "INTERROGATE THE NUMBER.", support: "Assess uncertainty and context.", seconds: 4.5 },
      { kind: "statement", eyebrow: "NO GUARANTEES", headline: "EVIDENCE BEFORE ACTION.", support: "No prediction removes risk.", seconds: 4.5 },
      { kind: "closer", eyebrow: "VETO SPORT", headline: "AUDIT THE PRICE.", support: "Evidence. Discipline. Limits.", seconds: 4 }
    ]
  },
  armat: {
    title: "ARMAT / MADE IN ARMENIA",
    scenes: [
      { kind: "opener", eyebrow: "MADE IN ARMENIA", headline: "CRAFT HAS A STORY.", support: "From local makers to new markets.", seconds: 4 },
      { kind: "network", eyebrow: "DISCOVER OUR MAKERS", headline: "FROM ORIGIN TO OPPORTUNITY.", support: "Bring Armenian production into view.", seconds: 4.5 },
      { kind: "orbit", eyebrow: "EXPLORE ARMENIA", headline: "BUILT TO TRAVEL FARTHER.", support: "A marketplace for discovery.", seconds: 4.5 },
      { kind: "closer", eyebrow: "ARMAT", headline: "ROOTED HERE. MADE TO GO.", support: "Armenian products, connected.", seconds: 4 }
    ]
  },
  tun: {
    title: "TUN / THE DECISION BEGINS WITH YOU",
    scenes: [
      { kind:"kinetic", eyebrow:"A BETTER FIRST QUESTION", headline:"NOT WHICH PROPERTY.",support:"Start with your real goal.",seconds:3.6 },
      { kind:"opener", eyebrow:"HOME / INVESTMENT / FUTURE",headline:"WHAT DOES HOME MEAN TO YOU?",support:"Every real-estate decision starts with a person.",seconds:4.6 },
      { kind:"network", eyebrow:"THE ADVISOR",headline:"SEE THE TRADE-OFFS.",support:"Understand options, risk and uncertainty.",seconds:4.6 },
      { kind:"statement", eyebrow:"FROM GOAL TO STRATEGY",headline:"GOALS. CONTEXT. DECISIONS.",support:"No endless listings. No sales pressure.",seconds:4.5 },
      { kind:"orbit", eyebrow:"INTRODUCING",headline:"TUN",support:"Real estate intelligence. Without the sales agenda.",seconds:4.1 },
      { kind:"closer", eyebrow:"THE RIGHT DECISION IS PERSONAL",headline:"START WITH YOUR GOAL.",support:"TUN / Margaryan Labs",seconds:4.5 }
    ]
  },
  hay_engine: {
    title:"HAY ENGINE / NATURALLY ARMENIAN",
    scenes:[
      {kind:"kinetic",eyebrow:"LANGUAGE IS IDENTITY",headline:"ARMENIAN DESERVES BETTER.",support:"Typography. Pronunciation. Meaning.",seconds:3.6},
      {kind:"opener",eyebrow:"BUILT AROUND THE LANGUAGE",headline:"CREATE NATURALLY.",support:"Armenian-first creative intelligence.",seconds:4.3},
      {kind:"network",eyebrow:"CREATOR AND LANGUAGE ENGINE",headline:"SPEAK. WRITE. CREATE.",support:"Language tools and creative workflows.",seconds:4.5},
      {kind:"statement",eyebrow:"THREE LANGUAGES",headline:"HY. EN. RU.",support:"Preserve names, meaning and brand identity.",seconds:4.1},
      {kind:"orbit",eyebrow:"INTRODUCING",headline:"HAY ENGINE",support:"Create anything. Naturally Armenian.",seconds:4.5},
      {kind:"closer",eyebrow:"THE LANGUAGE COMES FIRST",headline:"ՀԱՅԵՐԵՆՈՎ։",support:"HAY ENGINE / Margaryan Labs",seconds:4.8}
    ]
  },
  reality_engine: {
    title:"REALITY ENGINE / MODEL THE DECISION",
    scenes:[
      {kind:"kinetic",eyebrow:"BEFORE THE CONSEQUENCES",headline:"EVERY DECISION HAS BRANCHES.",support:"What happens if your assumptions change?",seconds:3.8},
      {kind:"opener",eyebrow:"SCENARIO INTELLIGENCE",headline:"MODEL WHAT COULD HAPPEN.",support:"Base. Bull. Bear. Stress.",seconds:4.5},
      {kind:"network",eyebrow:"SECOND-ORDER EFFECTS",headline:"FOLLOW THE CONSEQUENCES.",support:"Dependencies. Risk. Uncertainty.",seconds:4.5},
      {kind:"statement",eyebrow:"FROM UNCERTAINTY TO CONTEXT",headline:"TEST THE ASSUMPTIONS.",support:"Scenarios are not guarantees.",seconds:4.6},
      {kind:"orbit",eyebrow:"INTRODUCING",headline:"REALITY ENGINE",support:"Decision-support simulations.",seconds:4.2},
      {kind:"closer",eyebrow:"SIMULATE BEFORE COMMITTING",headline:"MODEL THE DECISION.",support:"Reality Engine / Margaryan Labs",seconds:4.5}
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
  const brand: MotionBrand = Object.hasOwn(BRAND_INFO, String(obj.brand)) ? obj.brand as MotionBrand : "labs";
  const format: MotionFormat = ["portrait", "square", "landscape"].includes(String(obj.format)) ? obj.format as MotionFormat : "portrait";
  const sceneInput = Array.isArray(obj.scenes) ? obj.scenes.slice(0, 8) : [];
  if (sceneInput.length < 1) throw new Error("Storyboard must contain at least one scene");
  const clean = (value: unknown, max: number) => String(typeof value === "string" ? value : "").trim().slice(0, max);
  const scenes = sceneInput.map((raw, index) => {
    const s = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const kind: MotionSceneKind = ["opener", "statement", "network", "closer", "kinetic", "orbit", "screen"].includes(String(s.kind)) ? s.kind as MotionSceneKind : "statement";
    const seconds = Number(s.seconds);
    return {
      id: "scene-" + (index + 1),
      kind,
      eyebrow: clean(s.eyebrow, 65),
      headline: clean(s.headline, 105) || "YOUR NEXT IDEA",
      support: clean(s.support, 180),
      seconds: Math.max(2, Math.min(8, Number.isFinite(seconds) ? seconds : 4)),
      typographyScale: Math.max(.72, Math.min(1, Number.isFinite(Number(s.typographyScale)) && s.typographyScale !== undefined ? Number(s.typographyScale) : 1))
    };
  });
  const style = ["cinematic", "kinetic", "technical"].includes(String(obj.style)) ? obj.style as MotionProject["style"] : "cinematic";
  const seed = typeof obj.seed === "number" && Number.isFinite(obj.seed) ? Math.floor(obj.seed) >>> 0 : 41;
  const language = ["en", "ru", "hy"].includes(String(obj.language)) ? obj.language as MotionProject["language"] : undefined;
  const signatureFilm = brand === "promptence" && obj.signatureFilm === "promptence-answer" ? "promptence-answer" as const : undefined;
  return { version: 1, title: clean(obj.title, 100) || "UNTITLED MOTION", brand, format, style, seed, scenes, language, signatureFilm };
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

