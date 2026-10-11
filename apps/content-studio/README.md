# Isolated public Content Studio deployment

Dedicated Next.js project root: `apps/content-studio`.

Only stateless Motion routes are mounted. The Distribution CRM, lead engine, sales worker and private API routes are **not** included.

Copied at build time from the repo (not copied in git): shared `@/lib/motion/*` modules via `../../lib/motion` TypeScript paths. This public app does not import any code outside the Motion namespace.

Required public environment variable (not a secret): `CONTENT_STUDIO_PUBLIC_URL=https://<public project origin>`. All preview links and iframe CSP must resolve to the public project itself.

Deployment: separate Vercel project with root directory `apps/content-studio`, production route public; do **not** modify SSO protection on the existing Margaryan Distribution project. For publishing, attach a dedicated subdomain and verify the MCP Apps nested iframe CSP, account isolation, consent and browser exports.

Routes: `/`, `/motion`, `/motion/chat-preview`, `/motion/proof`, `/api/mcp`, `/api/motion/storyboard`, `/api/motion/signature`, `/api/motion/captions`. Everything else is Next.js 404. No `/api/worker`, CRM, Inbox, LinkedIn or Sales on this application.

## Deployment: dedicated public beta
This app is currently deployed as a completely separate Vercel project at https://studio.promptence.tech with production-only public access. The original Margaryan Distribution retains its existing SSO and private CRM protections. The custom-domain MCP endpoint is https://studio.promptence.tech/api/mcp. The public MCP adapter exposes only short-film create and revision tools; it deliberately withholds the experimental Sequence Studio planner until the editor is deployed and verified. Dedicated branding/domain may change before marketplace release.
