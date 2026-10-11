# Margaryan Content Studio — ChatGPT plugin v0.1 (keyless beta)

## Product statement

**Prompt in ChatGPT → ChatGPT authors a film → MCP validates project → user opens private fragment-only handoff → existing Motion Studio previews and renders it.**

This is a real plugin code scaffold, NOT a paid public plugin, inside-chat finished MP4, OpenAI API proxy, or AI-video generation model. It reuses the existing deterministic Canvas/video pipeline that created earlier demo motion graphics. ChatGPT directs copy, timing and visual choreography; local browser Motion Studio renders. That is why no separately billed OpenAI API call is required for the two exposed tools.

The previous PUBLIC 'latest-public.json' GitHub content channel is deliberately NOT used by third-party customers. A customer storyboard must not be publicly committed to GitHub. The new handoff sends a base64url encoded JSON pack in the browser fragment, removed from browser history after import; the server does not receive that fragment. This does not encrypt copy or implement enterprise-grade confidentiality. Never share links containing sensitive client information.

## Implemented

- POST /api/mcp: stateless JSON-RPC MCP initialize, ping, tools/list, tools/call and supported notifications. Strict 32KB ingress; zero backend token spend.
- create_motion_film: ChatGPT authors 1–8 scenes, RU/EN/HY, cinematic/kinetic/technical styles, portrait/square/landscape. Returns validated motion-chat-v1 create pack and editor URL.
- revise_motion_film: guided, checked patch for a preexisting exact-title-and-brand film; cannot insert or retime local media IDs.
- /motion?mode=cinematic#motion-chat-v1=…: existing Operator Desk accepts the fragment, strips it, stages source and waits for manual INSPECT then APPROVE. The local Media Library and render/export remain unchanged.
- plugins/content-studio/: portable manifest, MCP config and authoring skill.

Existing Motion Studio maximum: 8 scenes, each 2–8 seconds, total at most 64s. Multi-minute videos need a genuine timeline redesign, not falsely sending a 180-second brief.

## Validation

Run:

    npm run motion:test-plugin
    npm run motion:test-chat
    npm run typecheck
    npm run build

Contract tests check JSON-RPC handshake, tool listing, valid brand/scenes, draft transport, approval metadata, invalid duration/length, remote media binding, guarded patches and forbidden Origins. Passing a build does NOT prove mobile performance, film aesthetics, browser video-export codecs, Chrome/GPU resources or compatibility with an installed ChatGPT plugin. Test with real user-owned browsers.

## Connecting in ChatGPT Work

1. Deploy MCP at a publicly reachable HTTPS endpoint. Current canonical target is https://margaryan-distribution.vercel.app/api/mcp.
2. IMPORTANT: Vercel currently reports ssoProtection.enabled=true on the Distribution deployment, so ChatGPT remote MCP cannot connect. A dedicated publicly accessible domain or an appropriately configured custom domain is needed. Do NOT disable protections across private CRM, email or sales routes.
3. Connect via ChatGPT Plugins → Add custom MCP server → the verified server URL. Verify initialize and tools/list. Prototype has no authentication because tools have no private user data, billing, file upload, outbound actions or persistence.
4. Build/install the package under plugins/content-studio, check tool permissions, and test from ChatGPT Work before inviting clients.
5. For public release follow https://developers.openai.com/plugins/deploy/submission. This beta has NOT been submitted, installed or approved for public listing.

## Key constraints

- Not a video generation model: tool produces editable storyboards; existing Motion Canvas/FFmpeg/browser exporter renders. Real-life footage and spoken natural voice require licensed sources or separate providers.
- Not a background renderer: user inspects, approves, previews and exports from /motion. Output may be WebM depending on browser and exporter.
- Not yet customer-ready: existing Motion has a fixed Margaryan brand enum; generic client concepts use the 'labs' starter. Custom client logo/colors are not configurable through these tools.
- Not unlimited zero-cost AI: ChatGPT usage limits apply; hosting, rendering, bandwidth, storage and payments can still cost money.
- Not ChatGPT subscription resale: do not pool user sessions. Commercial Sign in with ChatGPT delegated usage is a separate limited-partner feature requiring eligibility and approval. This beta does not implement that.
- Not a promise that OpenAI will purchase our product. Acquire creators, prove quality/retention/revenue independently.

## Path to the intended product

P0: Public isolated HTTPS MCP access, end-to-end ChatGPT Work install, successful video-export and performance tests.

P1: One SHARED Motion renderer inside a real MCP Apps iframe, reusing the site's film pipeline rather than introducing a second low-fidelity CSS/Canvas imitation. User can view real video preview, request revisions and export an attachment in chat. Explicit media consent and resource caps.

P2: OAuth accounts, private tenant projects, custom brand kits, isolated media, entitlement enforcement, independent subscription billing, privacy/TOS, usage budgets and either browser-local zero-server-cost rendering or transparently priced cloud rendering.

P3: Quality benchmarks vs incumbents, paid pilots, directory submission and partner request for Sign in with ChatGPT plan sharing if appropriate. Measure first completed export, median review time, 7-day creator activation, 30-day retention, gross margin and conversion.

## Design north star

Content Studio is a production studio driven by conversation, not a text-to-video API reseller. Defensibility is reliable editing, templates, source provenance, team workflow, multilingual typography and great export experience.
