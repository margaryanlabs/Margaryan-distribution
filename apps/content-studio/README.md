# Isolated public Content Studio deployment

Dedicated Next.js project root: `apps/content-studio`.

Only stateless Motion routes are mounted. The Distribution CRM, lead engine, sales worker and private API routes are **not** included.

Copied at build time from the repo (not copied in git): shared `@/lib/motion/*` modules via `../../lib/motion` TypeScript paths. This public app does not import any code outside the Motion namespace.

Required public environment variable (not a secret): `CONTENT_STUDIO_PUBLIC_URL=https://<public project origin>`. All preview links and iframe CSP must resolve to the public project itself.

Deployment: separate Vercel project with root directory `apps/content-studio`, production route public; do **not** modify SSO protection on the existing Margaryan Distribution project. For publishing, attach a dedicated subdomain and verify the MCP Apps nested iframe CSP, account isolation, consent and browser exports.

Embedded Canvas editor: the `/motion/chat-preview` component now supports browser-local uploads of authorized customer logo images (PNG/JPEG/WebP, ≤5MB), a real audio narration recording (≤15MB), licensed music (≤30MB), and optional procedural soundtrack through existing `sound-engine.ts`. The logo is drawn into each real Canvas export frame; audio is combined with the MediaRecorder stream before encoding. Its frame reports its layout height to the MCP widget to prevent clipped controls. New brand identity clears previous customer's files; no private media is sent via MCP or stored on Margaryan servers. Desktop/mobile video export requires manual QA and per-browser codec support.

Routes: `/`, `/connect`, `/diagnostics`, `/motion`, `/motion/chat-preview`, `/motion/proof`, `/api/mcp`, `/api/motion/storyboard`, `/api/motion/signature`, `/api/motion/captions`. Everything else is Next.js 404. No `/api/worker`, CRM, Inbox, LinkedIn or Sales on this application.

## Deployment: dedicated public beta
This app is currently deployed as a completely separate Vercel project at https://studio.promptence.tech with production-only public access. The original Margaryan Distribution retains its existing SSO and private CRM protections. The custom-domain MCP endpoint is https://studio.promptence.tech/api/mcp. The public MCP adapter now exposes three tools: short-film create, revision and a 65–192-second multi-chapter concept-film planner. The isolated Motion editor now includes the merged main Film Sequence Studio (up to 300 seconds through the manual browser editor), browser-local long-form workprint exporter, new 120/300-second sample manifests and Precision Cut. Only the shorter 65–192-second range is model-authored through create_motion_feature_film; browser /motion must still be approved by the operator before export. Dedicated branding/domain may change before marketplace release.
