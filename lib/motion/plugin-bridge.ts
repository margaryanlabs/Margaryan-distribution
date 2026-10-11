import { CHAT_PROTOCOL, previewChatMotionPack, type ChatMotionPack } from "./chat-operator";
import {
  BRAND_INFO, durationOf, sanitizeMotionProject,
  type MotionProject, type MotionScene
} from "./studio";

/**
 * Stateless, keyless ChatGPT <-> Motion Studio connector.
 *
 * ChatGPT authors text/timing as tool arguments; our existing deterministic
 * Motion renderer runs in the user's browser. No OpenAI API, storage, uploads,
 * fictional footage, or server-side video inference happens here.
 */
export const CONTENT_STUDIO_VERSION = "0.3.0";
export const CONTENT_STUDIO_WIDGET_URI = "ui://margaryan-content-studio/film-v3.html";
export const CONTENT_STUDIO_TOOLS = [
  {
    name: "create_motion_film",
    description: "Create an editable 1–8 shot motion-graphics video storyboard from scenes authored in ChatGPT. Returns a one-click Motion Studio draft link. The video is rendered/exported in the editor, NOT by this tool. Do not claim photorealistic AI video, generated voice, or completed MP4.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: CONTENT_STUDIO_WIDGET_URI }, "openai/outputTemplate": CONTENT_STUDIO_WIDGET_URI },
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 100 },
        brand: { type: "string", enum: Object.keys(BRAND_INFO), description: "Use labs for an external client film. Specify client_brand_name to display its own approved name/colors." },
        client_brand_name: {type:"string",minLength:1,maxLength:36,description:"Client's permitted display name; requires brand=labs. No logo or screenshot is generated."},
        client_brand_caption: {type:"string",maxLength:65,description:"Optional client tagline displayed on film chrome."},
        client_brand_accent: {type:"string",pattern:"^#[0-9A-Fa-f]{6}$",description:"Accessible client accent hex, e.g. #ABCDEF; too-dark colors safely fall back."},
        format: { type: "string", enum: ["portrait", "square", "landscape"] },
        language: { type: "string", enum: ["ru", "en", "hy"] },
        style: { type: "string", enum: ["cinematic", "kinetic", "technical"] },
        qualityMode: { type: "string", enum: ["basic", "premium", "signature"] },
        scenes: {
          type: "array", minItems: 1, maxItems: 8,
          items: {
            type: "object", additionalProperties: false,
            properties: {
              kind: { type: "string", enum: ["opener", "statement", "network", "closer", "kinetic", "orbit", "spatial"] },
              eyebrow: { type: "string", maxLength: 65 },
              headline: { type: "string", minLength: 1, maxLength: 105 },
              support: { type: "string", maxLength: 180 },
              seconds: { type: "number", minimum: 2, maximum: 8 },
              transition: { type: "string", enum: ["auto", "dissolve", "wipe", "slash", "cut", "zoom", "flash", "slide", "grid"] },
              titleTreatment: { type: "string", enum: ["editorial", "mask", "kinetic", "minimal"] },
              voiceCue: { type: "string", maxLength: 300, description: "Narration script only, not generated speech." }
            },
            required: ["kind", "eyebrow", "headline", "support", "seconds"]
          }
        }
      },
      required: ["title", "brand", "format", "language", "scenes"]
    }
  },
  {
    name: "revise_motion_film",
    description: "Prepare a safe, reviewed patch to an existing Motion Studio film, including editable scene copy and generic labs clientBrand name, caption and accent. Use the exact current project; never auto-publish, attach local media or silently replace another film.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: CONTENT_STUDIO_WIDGET_URI }, "openai/outputTemplate": CONTENT_STUDIO_WIDGET_URI },
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        current_project: { type: "object", description: "Complete MotionProject JSON copied from the editor, not a media file." },
        changes: {
          type: "array", minItems: 1, maxItems: 16,
          items: {
            type: "object",
            properties: {
              target: { type: "string", enum: ["scene", "project"] },
              index: { type: "integer", minimum: 0, maximum: 7 },
              set: { type: "object", description: "Change only reviewed Motion fields. project.clientBrand may update name/caption/accent for labs films, safely sanitized. No mediaId bindings." }
            },
            required: ["target", "set"]
          }
        }
      },
      required: ["current_project", "changes"]
    }
  },
  {
    name: "create_motion_feature_film",
    description: "Create a 65–192 second long-form editorial motion film from 9–24 original scenes authored by ChatGPT. Auto-groups shots into 2–3 independently editable chapters. Returns a private-fragment Sequence Studio link, NOT a finished MP4. No OpenAI API, cloud video generation, voice or media uploads.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1, maxLength: 100 },
        brand: { type: "string", enum: Object.keys(BRAND_INFO), description: "Use labs for customers and pass a permitted client_brand_name and client_brand_accent for text-based white label." },
        client_brand_name: {type:"string",minLength:1,maxLength:36,description:"Brand display name (permission required), only for brand=labs"},
        client_brand_caption: {type:"string",maxLength:65,description:"Client tagline visible on chapter graphics"},
        client_brand_accent: {type:"string",pattern:"^#[0-9A-Fa-f]{6}$",description:"Client color; contrast-safe if too dark"},
        format: { type: "string", enum: ["portrait", "square", "landscape"] },
        language: { type: "string", enum: ["ru", "en", "hy"] },
        style: { type: "string", enum: ["cinematic", "kinetic", "technical"] },
        scenes: {
          type: "array", minItems: 9, maxItems: 24,
          description: "Write a complete original narrative: opening hook, stakes, demonstration, proof only if source-backed, and CTA. Each shot 2–8 seconds.",
          items: {
            type: "object", additionalProperties: false,
            properties: {
              kind: { type: "string", enum: ["opener", "statement", "network", "closer", "kinetic", "orbit"], description:"Local 120–192s Browser Film exporter does not support spatial GPU scenes; use workstation mastering for those." },
              eyebrow: { type: "string", maxLength: 65 },
              headline: { type: "string", minLength: 1, maxLength: 105 },
              support: { type: "string", maxLength: 180 },
              seconds: { type: "number", minimum: 2, maximum: 8 },
              transition: { type: "string", enum: ["auto", "dissolve", "wipe", "slash", "cut", "zoom", "flash", "slide", "grid"] },
              titleTreatment: { type: "string", enum: ["editorial", "mask", "kinetic", "minimal"] },
              voiceCue: { type: "string", maxLength: 300, description: "Narration cue text only; no synthetic voice is generated." }
            }, required: ["kind", "eyebrow", "headline", "support", "seconds"]
          }
        },
        chapter_titles: { type: "array", maxItems: 3, items: { type: "string", maxLength: 100 },
          description: "Optional titles for the 2 or 3 acts." }
      }, required: ["title", "brand", "format", "language", "scenes"]
    }
  }
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function checkString(value: unknown, key: string, max: number, optional = false): string {
  if (optional && value === undefined) return "";
  if (typeof value !== "string" || value.trim().length < (optional ? 0 : 1) || value.length > max)
    throw Error("Invalid " + key + "; expected text up to " + max + " characters");
  return value.trim();
}
function oneOf<T extends string>(v: unknown, options: readonly T[], label: string): T {
  if (typeof v !== "string" || !options.includes(v as T))
    throw Error("Invalid " + label + ": " + String(v));
  return v as T;
}
function parseClientBrand(raw:Record<string,unknown>,brand:MotionProject["brand"]):MotionProject["clientBrand"]{
  const hasClient=raw.client_brand_name!==undefined || raw.client_brand_caption!==undefined ||
    raw.client_brand_accent!==undefined;
  if(hasClient&&brand!=="labs")throw Error("Client brand kit only supported with brand=labs");
  if(hasClient&&raw.client_brand_name===undefined)throw Error("client_brand_name required for client brand kit");
  if(!hasClient)return undefined;
  const clientBrand={
    name:checkString(raw.client_brand_name,"client_brand_name",36),
    caption:checkString(raw.client_brand_caption,"client_brand_caption",65,true),
    accent:raw.client_brand_accent===undefined?"#C4D9F4":checkString(raw.client_brand_accent,"client_brand_accent",7)
  };
  if(!/^#[0-9a-fA-F]{6}$/.test(clientBrand.accent))throw Error("client_brand_accent must be #RRGGBB");
  return clientBrand;
}
function validateScenes(source: unknown): MotionScene[] {
  if (!Array.isArray(source) || source.length < 1 || source.length > 8)
    throw Error("Only 1–8 scenes supported");
  return source.map((input: unknown, index: number) => {
    if (!record(input)) throw Error("Scene " + (index + 1) + " must be an object");
    const seconds = input.seconds;
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 2 || seconds > 8)
      throw Error("Scene " + (index + 1) + " must last 2–8 seconds");
    const kind = oneOf(input.kind, ["opener", "statement", "network", "closer", "kinetic", "orbit", "spatial"] as const, "scene kind");
    // Media IDs are purposefully impossible to set from public MCP calls:
    // user-owned media can only be attached inside the browser after consent.
    const result: MotionScene = {
      id: "scene-" + (index + 1),
      kind,
      eyebrow: checkString(input.eyebrow, "eyebrow", 65, true),
      headline: checkString(input.headline, "headline", 105),
      support: checkString(input.support, "support", 180, true),
      seconds
    };
    if (input.transition !== undefined) result.transition = oneOf(input.transition,
      ["auto", "dissolve", "wipe", "slash", "cut", "zoom", "flash", "slide", "grid"] as const, "transition");
    if (input.titleTreatment !== undefined) result.titleTreatment = oneOf(input.titleTreatment,
      ["editorial", "mask", "kinetic", "minimal"] as const, "title treatment");
    if (input.voiceCue !== undefined) result.voiceCue = checkString(input.voiceCue, "voice cue", 300, true);
    return result;
  });
}
function publicEditorUrl(): string {
  const url = process.env.CONTENT_STUDIO_PUBLIC_URL || "https://margaryan-distribution.vercel.app";
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw Error("CONTENT_STUDIO_PUBLIC_URL must be an HTTPS origin");
  return parsed.origin;
}
function linkForPack(pack: ChatMotionPack): string {
  // A fragment does not travel to the web server, analytics or Referrer.
  // It is NOT encryption: only send copy that the user agrees to open in
  // their own browser, then immediately strip the fragment after import.
  const encoded = Buffer.from(JSON.stringify(pack), "utf8").toString("base64url");
  if (encoded.length > 15_000) throw Error("Storyboard too large for a browser handoff");
  return publicEditorUrl() + "/motion?mode=cinematic#motion-chat-v1=" + encoded;
}

function createFeatureFilm(raw: Record<string,unknown>) {
  const title=checkString(raw.title,"title",100);
  const brand=oneOf(raw.brand,Object.keys(BRAND_INFO) as MotionProject["brand"][],"brand");
  const clientBrand=parseClientBrand(raw,brand);
  const format=oneOf(raw.format,["portrait","square","landscape"] as const,"format");
  const language=oneOf(raw.language,["ru","en","hy"] as const,"language");
  const style=raw.style===undefined?"cinematic":oneOf(raw.style,["cinematic","kinetic","technical"] as const,"style");
  if(!Array.isArray(raw.scenes)||raw.scenes.length<9||raw.scenes.length>24)
    throw Error("Feature films require 9–24 original scenes (2–3 chapters)");
  if(raw.scenes.some((scene:unknown)=>record(scene)&&scene.kind==="spatial"))
    throw Error("Spatial 3D scenes require workstation Master; long-form browser films support 2D motion shots only");
  const chunkCount=Math.ceil(raw.scenes.length/8);
  if(raw.chapter_titles!==undefined && (
    !Array.isArray(raw.chapter_titles)||raw.chapter_titles.length>chunkCount||
    raw.chapter_titles.some(x=>typeof x!=="string"||x.length>100)
  )) throw Error("Invalid chapter titles");
  const chapterTitles=raw.chapter_titles as string[]|undefined;
  const chapters=[] as Array<{id:string;title:string;project:MotionProject}>;
  let duration=0;
  for(let i=0;i<chunkCount;i++){
    const localScenes=validateScenes(raw.scenes.slice(i*8,(i+1)*8));
    const chapterTitle=chapterTitles?.[i]?.trim()||("ACT "+String(i+1).padStart(2,"0"));
    const project=sanitizeMotionProject({
      version:1,title: title+" / "+chapterTitle,brand,clientBrand,format,language,style,
      qualityMode:"signature",scenes:localScenes
    });
    if(project.scenes.length!==localScenes.length)
      throw Error("Feature film chapter was truncated");
    duration+=durationOf(project);
    chapters.push({id:"chapter-"+(i+1),title:chapterTitle,project});
  }
  duration=Number(duration.toFixed(3));
  if(duration<=64)throw Error("Feature-film timeline must exceed 64 seconds. Increase shot duration.");
  const sequence={
    version:1 as const,type:"motion-sequence-v1" as const,title,brand,format,
    expectedDurationSeconds:duration,chapters
  };
  // Fragment is neither encryption nor a substitute for per-user private storage.
  // The user's browser strips the fragment before loading the proposal.
  const encoded=Buffer.from(JSON.stringify(sequence),"utf8").toString("base64url");
  if(encoded.length>26_000||Buffer.byteLength(JSON.stringify(sequence),"utf8")>20_000)
    throw Error("Feature film is too large for private one-click handoff. Shorten copy or use an exported JSON manifest.");
  return {
    protocol:"motion-sequence-v1", action:"review-feature-film" as const,
    title,brand,format,chapters:chapters.length,scenes:raw.scenes.length,
    durationSeconds:duration,
    filmType:"editable multi-chapter procedural motion graphics; not generated live-action footage",
    videoFileCreated:false,voiceFileCreated:false,requiresUserApproval:true,
    editorUrl:publicEditorUrl()+"/motion?mode=cinematic#motion-sequence-v1="+encoded,
    nextStep:"Open the editor link, review the whole-film proposal in Sequence Studio, approve to save chapters, inspect each chapter, then export a manifest for local Chromium/FFmpeg mastering. This tool has NOT created an MP4."
  };
}

export function runContentStudioTool(name: string, raw: unknown) {
  if(name==="create_motion_feature_film") {
    if(!record(raw))throw Error("Tool arguments must be an object");
    return createFeatureFilm(raw);
  }
  if (!record(raw)) throw Error("Tool arguments must be an object");
  let pack: ChatMotionPack;
  let film: MotionProject;
  let mode: "create" | "patch";
  if (name === "create_motion_film") {
    const brand = oneOf(raw.brand, Object.keys(BRAND_INFO) as MotionProject["brand"][], "brand");
    const scenes = validateScenes(raw.scenes);
    const clientBrand=parseClientBrand(raw,brand);
    const draft: MotionProject = {
      version: 1,
      title: checkString(raw.title, "title", 100),
      brand,
      clientBrand,
      format: oneOf(raw.format, ["portrait", "square", "landscape"] as const, "format"),
      language: oneOf(raw.language, ["ru", "en", "hy"] as const, "language"),
      style: raw.style === undefined ? "cinematic" : oneOf(raw.style, ["cinematic", "kinetic", "technical"] as const, "style"),
      qualityMode: raw.qualityMode === undefined ? "signature" : oneOf(raw.qualityMode, ["basic", "premium", "signature"] as const, "quality"),
      scenes
    };
    film = sanitizeMotionProject(draft);
    if (durationOf(film) > 64) throw Error("Film must not exceed 64 seconds");
    pack = { protocol: CHAT_PROTOCOL, action: "create", project: film };
    mode = "create";
  } else if (name === "revise_motion_film") {
    if (!record(raw.current_project) || !Array.isArray(raw.current_project.scenes))
      throw Error("Paste a valid existing MotionProject");
    if (raw.current_project.scenes.length > 8) throw Error("Too many scenes");
    const current = sanitizeMotionProject(raw.current_project);
    if (Array.isArray(raw.changes) && raw.changes.some(change =>
      record(change) && record(change.set) &&
      ("mediaId" in change.set || "mediaStart" in change.set)))
      throw Error("ChatGPT cannot attach or retime local media; use the approved editor Media Library");
    const preview = previewChatMotionPack({
      protocol: CHAT_PROTOCOL, action: "patch",
      expectedBrand: current.brand, expectedTitle: current.title, changes: raw.changes
    }, current);
    // Never strip the patch guard or silently replace somebody else's film.
    pack = {
      protocol: CHAT_PROTOCOL, action: "patch",
      expectedBrand: current.brand, expectedTitle: current.title,
      changes: raw.changes as Extract<ChatMotionPack, { action: "patch" }>["changes"]
    };
    film = preview.next;
    mode = "patch";
  } else {
    throw Error("Unknown Content Studio tool");
  }
  return {
    protocol: CHAT_PROTOCOL,
    action: mode,
    title: film.title,
    scenes: film.scenes.length,
    durationSeconds: Number(durationOf(film).toFixed(2)),
    filmType: "procedural motion graphics; not generative video footage",
    videoFileCreated: false,
    voiceFileCreated: false,
    requiresUserApproval: true,
    editorUrl: linkForPack(pack),
    chatPack: pack,
    previewProject: film, // Validated, media-free project for MCP Apps live Canvas widget.
    nextStep: "Open editorUrl, inspect the staged Chat Pack, press APPROVE, then preview and export the video in Motion Studio. Do not claim the video has been rendered yet."
  };
}
