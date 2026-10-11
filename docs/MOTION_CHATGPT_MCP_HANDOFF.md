# Motion OS ↔ ChatGPT: keyless MCP handoff (vertical slice)

## What actually works

The existing `/motion` Cinematic editor is now reachable via a **stateless read-only
MCP JSON-RPC endpoint** `POST /api/motion/mcp` (Streamable HTTP JSON response
mode). This first integration is deliberately NOT presented as an approved
public ChatGPT listing, generative photorealistic video, autonomous rendering,
or a cloud file service.

- `motion_capabilities`: discover our **existing portfolio brands**, formats,
  languages and the hard 1–8 scene / 2–8 second-per-scene boundaries.
- `motion_create_storyboard`: reuse the actual keyless procedural director for
  a branded, editable project. Returns the complete JSON **and** a deep link.
- `motion_open_project`: turn a model-authored, validated MotionProject v1 into
  an editable one-click deep link. This is where ChatGPT can do the creative
  writing with the user's own ChatGPT interaction (not a hidden API call).
- `motion_edit_project`: preview an allowlisted `motion-chat-v1` patch
  against the provided current project. Returns a same-browser deep link.

No OpenAI API keys are used by these tools. The server does **not** generate
videos. It only constructs and validates storyboard text.

## End-to-end flow

1. ChatGPT calls `motion_create_storyboard` or `motion_open_project` and
   receives a complete `openInStudio` link.
2. Clicking the link opens `/motion?mode=cinematic#motion-chat=<base64url>`.
   URL fragments are parsed **on the user's device** and never sent to the
   website as HTTP request data.
3. Motion's **00 / PRODUCTION WORKSPACE → CHAT PACK** preloads and previews
   the project or patch. The current project is **not** changed yet.
4. Only **APPLY APPROVED CHANGES** overwrites the local saved draft;
   **UNDO LAST CHAT PACK** restores the previous one.
5. The user attaches any real, approved image/video/voice/music from their own
   local media library and renders using the existing browser or workstation
   workflows, including the real-source frame and quality gates.

This is the first no-copy/paste ChatGPT → Motion flow. An export or user
media upload is NOT triggered by the MCP call.

## Try protocol locally

Start Next.js and send:

```bash
curl -sS http://localhost:3000/api/motion/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"local-test","version":"1"}}}'
```

Then discover tools via `{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}`.
Call `motion_create_storyboard` with arguments:
`{"brand":"veto","format":"portrait","prompt":"Create an evidence-first film about market uncertainty."}`.

The endpoint accepts individual JSON-RPC messages, not batches. For stateless
notifications it returns 202; GET SSE is intentionally unsupported (405).
Before a production ChatGPT plugin submission, verify the transport with the
current official MCP Inspector and plugin scanner.

Run `npm run motion:test-mcp` for protocol, link payload, patch and rejection
contract tests; run `npm run typecheck` and `npm run build` before release.

## Security design

- No arbitrary URLs, external fetches, scripts, shell commands, file upload,
  user data access, billing, publishing, provider credentials or side effects
  are exposed through MCP.
- The request body is capped at 24KB; portable link payloads at 12KB.
- The shared editor link contains storyboard **text**, not private media bytes,
  credentials or access tokens. Anyone with a link can read its text. Do not
  put confidential briefs inside shareable links.
- Scene `mediaId`/source handles cannot be supplied by remote create tools.
  Real approved files remain device-local; a patch can refer to an already
  installed project without attaching files.
- The editor requires a preview and explicit approval and preserves Undo.
- The public endpoint currently has no authentication, account isolation,
  quotas or global anti-abuse controls. It may ONLY serve these bounded,
  computation-only, stateless tools. Add authentication/OAuth, per-user
  authorization, limits and billing **before** exposing any persistent
  projects, server exports, paid resources, assets or publishing.
- Avoid building deep links from sensitive data; browser history and the
  ChatGPT conversation can retain the fragment even if it is not sent in
  HTTP requests.

## What remains before a public commercial launch

1. **OAuth / multi-tenant accounts and a project database** (not shared CRM
   checkpoints), per-tenant access control, storage and deletion.
2. **An official MCP SDK transport and plugin compatibility review** with
   published schemas/auth, rate limiting, observability and abuse controls.
3. **A durable media-aware timeline** shared across Cinematic / Quick / Proof;
   per-shot video is currently supported in Cinematic but workflows are not
   yet one fully capable nonlinear editor.
4. **Queue-based render workers** (FFmpeg/Playwright with isolated resources,
   signed asset URLs, timeouts, idempotent jobs, cost quotas, polling,
   downloads and real decoded-media QA). Vercel's request handler is not a
   durable long-running renderer.
5. **Creative QA** on actual MP4 outputs, typography, audio loudness and
   viewer experience with real customer footage before marketing as
   professional production.
6. **Custom third-party brand kits**, legal media rights and subscription
   packages. Existing portfolio-brand presets are not customer brand kits.

The ChatGPT UI/host may not expose developer-created MCP write tools to every
plan or client. Do not promise all users direct plugin access before their
actual ChatGPT eligibility and plugin review are verified.
