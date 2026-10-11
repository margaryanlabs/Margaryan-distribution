import { BRAND_INFO, sanitizeMotionProject, type MotionBrand, type MotionFormat, type MotionProject } from "./studio";
import { createKeylessStoryboard, type DirectorBrief, type MotionLanguage, type MotionStyle } from "./director";
import { createChatMotionPack, previewChatMotionPack, type ChatMotionPack } from "./chat-operator";

/**
 * Stateless, read-only MCP bridge for Motion OS. No model API, user database,
 * arbitrary network fetch, remote code evaluation or server-side video export.
 * Every edit enters the existing manual review/approval gate in the browser.
 */
type Dict = Record<string, unknown>;
const object = (v: unknown): v is Dict => v !== null && typeof v === "object" && !Array.isArray(v);
const BRAND_IDS = Object.keys(BRAND_INFO);
const FORMATS = ["portrait", "square", "landscape"] as const;
const LANGUAGES = ["auto", "ru", "en", "hy"] as const;
const STYLES = ["cinematic", "kinetic", "technical"] as const;
const VERSION = "2025-06-18";

export const MOTION_MCP_TOOLS = [
  {
    name: "motion_capabilities",
    title: "Motion Studio capabilities",
    description: "Inspect available portfolio brands, film formats and current constraints. Keyless procedural motion graphics; no promise of generative AI footage or cloud MP4 rendering.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    name: "motion_create_storyboard",
    title: "Create an editable film storyboard",
    description: "Use Motion OS's existing no-key deterministic storyboard director. Returns a complete editable project AND an Open in Motion Studio link. This does not render an MP4 or call an AI model. Choose a supported portfolio brand.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        prompt: { type: "string", minLength: 6, maxLength: 2000, description: "Film creative brief; describe message, audience, and visual direction." },
        brand: { type: "string", enum: BRAND_IDS, description: "Existing Margaryan portfolio brand." },
        format: { type: "string", enum: [...FORMATS] },
        language: { type: "string", enum: [...LANGUAGES] },
        style: { type: "string", enum: [...STYLES] }
      }, required: ["prompt", "brand"]
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    name: "motion_open_project",
    title: "Open ChatGPT-authored film in Motion Studio",
    description: "Validate a complete MotionProject, and return a link that opens it with an explicit preview and approval gate. Use this when ChatGPT authored specific scenes. No remote media, fake source footage, or server export.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: { project: { type: "object", description: "MotionProject v1: brand, format, title, scenes (1–8); each scene contains kind, eyebrow, headline, support, seconds (2–8)." } },
      required: ["project"]
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    name: "motion_edit_project",
    title: "Stage precise scene or project edits",
    description: "Validate changes against a previously exported MotionProject. Returns a one-click link to preview a non-destructive patch in the SAME browser where that project is open. Requires manual approval.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        project: { type: "object", description: "The CURRENT project's complete MotionProject JSON, exported from the editor." },
        changes: { type: "array", minItems: 1, maxItems: 16, description: "motion-chat-v1 changes: {target:'scene',index:0,set:{...}} or {target:'project',set:{...}}.", items: { type: "object" } }
      }, required: ["project", "changes"]
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  }
] as const;

function choose<T extends string>(raw: unknown, allowed: readonly T[], label: string, fallback?: T): T {
  if (raw === undefined && fallback !== undefined) return fallback;
  if (typeof raw !== "string" || !allowed.includes(raw as T)) throw Error("Invalid " + label);
  return raw as T;
}
function inputProject(raw: unknown, rejectRemoteMedia: boolean): MotionProject {
  if (!object(raw) || !Array.isArray(raw.scenes) || raw.scenes.length < 1 || raw.scenes.length > 8)
    throw Error("A MotionProject with 1–8 scenes is required");
  choose(raw.brand, BRAND_IDS, "project brand");
  choose(raw.format, FORMATS, "project format");
  if (rejectRemoteMedia && raw.scenes.some(s => object(s) && (
    s.mediaId !== undefined || s.mediaStart !== undefined || s.src !== undefined ||
    s.url !== undefined || s.videoUrl !== undefined || s.imageUrl !== undefined
  ))) throw Error("External/user media cannot be attached from ChatGPT. Attach approved local files in Motion Studio.");
  const p = sanitizeMotionProject(raw);
  // The editor must never silently drop user-authored scenes or headlines.
  if (p.scenes.length !== raw.scenes.length || p.scenes.some((scene, i) =>
    !object(raw.scenes[i]) || scene.headline !== raw.scenes[i].headline?.trim()))
    throw Error("Scene content was invalid or truncated. Shorten the headline (max 105 characters).");
  return p;
}
function editorLink(pack: ChatMotionPack, origin: string): string {
  const json = JSON.stringify(pack);
  if (Buffer.byteLength(json, "utf8") > 12_000) throw Error("Film is too large for a portable link. Use a smaller storyboard.");
  const url = new URL("/motion?mode=cinematic", origin);
  if (!["https:", "http:"].includes(url.protocol)) throw Error("Invalid Motion Studio origin");
  // URL fragment never reaches Vercel/request logs. Possession of a link gives
  // access to its storyboard text, therefore NEVER embed secrets/private media.
  url.hash = "motion-chat=" + Buffer.from(json, "utf8").toString("base64url");
  return url.toString();
}
function reply(result: Dict) {
  return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
}
function execute(name: string, args: Dict, origin: string) {
  if (name === "motion_capabilities") return reply({
    engine: "keyless-procedural-motion", brands: BRAND_IDS, formats: FORMATS,
    languages: ["ru", "en", "hy"], scenes: { min: 1, max: 8, secondsPerScene: [2, 8] },
    workflow: "ChatGPT plans → one-click editor handoff → inspect → manual approval → local video export",
    limitations: ["No photorealistic text-to-video", "No automatic cloud MP4 render", "No remote user files", "No third-party custom brand kit yet", "No external model API"]
  });
  if (name === "motion_create_storyboard") {
    if (typeof args.prompt !== "string" || args.prompt.trim().length < 6 || args.prompt.length > 2000)
      throw Error("prompt must be 6–2000 characters");
    const brand = choose(args.brand, BRAND_IDS, "brand") as MotionBrand;
    const format = choose(args.format, FORMATS, "format", "portrait") as MotionFormat;
    const language = choose(args.language, LANGUAGES, "language", "auto") as MotionLanguage;
    const style = choose(args.style, STYLES, "style", "cinematic") as MotionStyle;
    const brief: DirectorBrief = { prompt: args.prompt, brand, format, language, style };
    const project = createKeylessStoryboard(brief);
    return reply({ project, openInStudio: editorLink(createChatMotionPack(project), origin),
      rendered: false, requiresOpenAiApiKey: false, next: "Open the link, inspect and approve the film, then export it locally." });
  }
  if (name === "motion_open_project") {
    const project = inputProject(args.project, true);
    return reply({ project, openInStudio: editorLink(createChatMotionPack(project), origin),
      rendered: false, next: "Open the link; inspect and approve the storyboard before exporting. Add real media locally." });
  }
  if (name === "motion_edit_project") {
    const project = inputProject(args.project, false);
    const pack = { protocol: "motion-chat-v1", action: "patch",
      expectedBrand: project.brand, expectedTitle: project.title,
      changes: args.changes } as ChatMotionPack;
    const preview = previewChatMotionPack(pack, project);
    return reply({ changes: preview.changes, previewProject: preview.next,
      openInStudio: editorLink(pack, origin), rendered: false,
      next: "Open in the SAME browser with the current project, review every change, and approve." });
  }
  throw Error("Unknown Motion tool " + name);
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

/** Pure JSON-RPC dispatcher, deliberately stateless and independently testable. */
export function motionMcpDispatch(raw: unknown, origin: string): Dict | null {
  if (!object(raw) || raw.jsonrpc !== "2.0" || typeof raw.method !== "string")
    return rpcError(object(raw) ? raw.id : null, -32600, "Invalid JSON-RPC request");
  const id = typeof raw.id === "string" || typeof raw.id === "number" ? raw.id : null;
  if (raw.method.startsWith("notifications/")) return null;
  if (id === null) return null;
  if (raw.method === "initialize") return {
    jsonrpc: "2.0", id, result: {
      protocolVersion: VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "margaryan-motion", version: "0.1.0" },
      instructions: "Motion OS returns editable storyboards and deep links, not rendered videos. The current engine supports portfolio brands and local MP4 export. Never claim a film was rendered. Tools are stateless, keyless and require approval inside the editor."
    }
  };
  if (raw.method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (raw.method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: MOTION_MCP_TOOLS } };
  if (raw.method !== "tools/call") return rpcError(id, -32601, "Method not found");
  const params = raw.params;
  if (!object(params) || typeof params.name !== "string")
    return rpcError(id, -32602, "Tool name is required");
  try {
    const args = params.arguments === undefined ? {} : params.arguments;
    if (!object(args)) throw Error("Tool arguments must be an object");
    return { jsonrpc: "2.0", id, result: execute(params.name, args, origin) };
  } catch (e) {
    return { jsonrpc: "2.0", id, result: { isError: true, content: [
      { type: "text", text: e instanceof Error ? e.message : "Invalid Motion request" }
    ] } };
  }
}
