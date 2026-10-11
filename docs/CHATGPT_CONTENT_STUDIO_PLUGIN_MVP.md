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

## New: full feature films directed in one ChatGPT request

The independent **Motion PRO Film Sequence Studio** PR #57 adds a real local
multi-chapter editor and operator-local MP4 assembler. The third plugin tool,
`create_motion_feature_film`, now bridges a ChatGPT-authored commercial
to that film sequence format (a portable, reviewed draft; no server rendering).

ChatGPT can author **9–24 scenes** of 2–8s each, making a film of **more than
64s up to 192s**, with up to three chapter titles. Scenes are grouped into
8-shot chapters and validated using the same source-free field allowlist as
`create_motion_film`. An example 16 × 7.5s commercial is precisely 120 seconds
across two 8-shot chapters. The editor URL ends in
`#motion-sequence-v1=<base64url manifest>`; all copy remains in the fragment
until the user's browser reviews and clears it.

**Dependency / rollout:** the importing **Sequence Studio** UI is in PR #57,
not yet in main. The third MCP tool should not be publicly announced or
submitted as ready for customers until the combined deployed build includes
both the plugin and Sequence Studio, build and interface tests pass, and the
MCP endpoint is externally accessible outside Vercel SSO.

**In ChatGPT:** the model designs a complete storyboard; it does NOT call
OpenAI API through our backend and does NOT get arbitrary background access
to the customer's ChatGPT session. The website receives only what the user
chooses to open from the provided link.

**In Motion:** the user sees an explicit multi-chapter proposal with runtime,
shot count and review buttons. APPROVE saves the draft into browser local
storage. Each individual chapter is then reviewed through the same real
video/Canvas player, approved source footage remains local, and an operator
can export a full MP4 by running the existing
`npm run motion:sequence` FFmpeg/Playwright workflow on a workstation.
No automatic cloud render, audio voice clone, AI-footage generation, media
upload, or client-account storage is implied.

Longer films (up to eight chapters / 512s) are supported in Sequence Studio
through its own chapter editor and manifest import, not by sending an
oversized tool response as a URL fragment.


## ChatGPT-native player v0.3 — browser-rendered video and optional ChatGPT file

NEW: The Content Studio MCP Apps resource embeds a first-party 2D/Canvas video preview built with the exact existing Motion drawMotionFrame engine (not a separate AI/video API). The user may play, scrub and export a file locally at 24 FPS, choose 720p or optional 1080p, and enable the existing keyless original WebAudio soundtrack. This soundtrack is instrumental procedural audio; no voice narration or licensed music is invented.

After a successful browser export, the user can explicitly click SAVE TO CHATGPT. The nested first-party preview transfers the browser-generated video file to the MCP Apps widget, which calls ChatGPT's optional window.openai.uploadFile(file,{library:true}) only if that capability exists. File validation requires an expected first-party frame origin, .mp4/.webm extension, video MIME and <=25 MB bytes. An unavailable helper or failed upload leaves the user's local downloaded copy unaffected. The upload may still be rejected by the ChatGPT client because of plan, file, size, or host restrictions.

**Not yet proven end-to-end:** Browser export has Vercel-ready build evidence, and a simulated MCP widget JS contract test was added, but we have not installed the plugin in a real ChatGPT client or verified exported file upload. These are gates, not marketing claims. Likewise, the repository code does not implement public accounts, entitlement checks, client billing, or ChatGPT plan delegation.

### Manual acceptance

1. On an owned HTTPS registrable domain, connect an isolated public MCP endpoint without weakening private Distribution / CRM protection.
2. From ChatGPT Work install the custom MCP plugin; confirm create tool renders its UI resource and the actual moving frame canvas, not a placeholder.
3. Request a 20–30s RU demo; play, scrub and test 720p silent export; validate the decoded video duration and frame content.
4. Test 1080p and original soundtrack separately, inspecting synchronisation and mobile thermals (disable the optional functions if a device struggles).
5. Click SAVE TO CHATGPT. Verify the success confirmation and that the file appears in the user's ChatGPT file library only if this host offers uploadFile.
6. Test denied/unsupported upload, private media rejected, 25MB cutoff, origin spoof, concurrent export prevention and mid-recording revision handling.
7. Only then take PR #55 out of draft and prepare review/privacy/terms/paid pilot.


## Isolated public deployment — 11 October 2026

**Live beta host:** https://studio.promptence.tech (owned and Vercel-verified subdomain).
**Public MCP endpoint:** https://studio.promptence.tech/api/mcp.
**Isolated Vercel project:** margaryan-content-studio-public / prj_GRCETzrQqTOQKIuFwnLNqG4aBvmX.
**Production build:** READY at commit 8fd5c93862f58d4e21aa24c1172ed0203bc7c3c6.

The standalone Next application is built from apps/content-studio. Its routes contain ONLY Motion Studio and stateless MCP/motion handlers. It does not mount Distribution CRM, worker, leads, LinkedIn or private API endpoints. The original Margaryan Distribution keeps its Vercel SSO protections unchanged. The standalone app protects previews but allows production custom-domain access.

For safety, the public MCP server advertises only create_motion_film and revise_motion_film. The experimental long-form feature-film tool remains in the shared internal code but is not exposed until PR #57 is deployed and its Sequence Studio route is functional on this isolated host.

The public Vercel project ignores automatic builds from unrelated branches, preventing later main branch changes from replacing this provisional beta before the feature branch is integrated. Before a normal release, change the project's production branch/ignore rule after main is stable.

### What is STILL unverified

- Real ChatGPT custom-MCP connection and tools discovery from a user's actual plan.
- MCP Apps nested iframe, streaming compatibility and SAVE TO CHATGPT file upload with a real ChatGPT host.
- Runtime browser audiovisual QA on Chrome, Android and low-RAM devices.
- Public marketplace review, approved data/privacy policies, billing and commercial accounts.

A Vercel READY build establishes compilation and route packaging. It is not proof that the installed plugin works in ChatGPT. Connect it first through ChatGPT Plugins → Add custom MCP server using the HTTPS endpoint above.


## Follow-on: Local brand/logo, real narration and licensed music (October 11, 2026)

**Standalone beta:** https://studio.promptence.tech/motion/chat-preview (supports a local working starter when opened directly), plus the same original Canvas in the MCP Apps nested player. Now offers an expandable BRAND LOGO & VOICE / MUSIC panel:

- Customer-provided PNG/JPEG/WebP ≤5MB; dimensions validated at 30–4096px / ≤8MP, no SVG/remote URLs or server upload. Decoded image is composited into every rendered video frame at a configurable corner. Displayed as a subtle translucent card over the motion footage.
- User-owned audio narration ≤15MB and licensed background music ≤30MB. The existing `createProceduralSoundtrack` WebAudio mixer decodes local files and mixes narration/music/optional procedural score into the actual MediaRecorder stream. The voice recording is user-provided; GPT does not automatically synthesize speech, generate voice clones, download commercial music or use paid APIs.
- If the film identity changes (title/brand/client name), private local media is cleared to avoid accidentally carrying one customer's materials to another film. ChatGPT tool arguments and public URL fragments contain no files.
- MCP player iframe uses ResizeObserver-based height coordination so media controls are reachable on mobile; the iframe never receives raw user files through MCP. The resulting exported video can optionally be explicitly uploaded to the user's ChatGPT library when its client supports the file API and size limits.
- Public Vercel deployment built and reported READY (commit e340b6b430ea19e79ea113c240347b96137e22af). 7/7 live JSON-RPC HTTP diagnostics still pass.

**Remaining release blockers:** actual Android/desktop AV playback and encoded file validation, file-picker permissions inside ChatGPT nested iframe, audio duration and synchronization review, option to merge local logo into advanced full editor (currently scoped to embedded preview), customer auth/billing, and submission review. Do not claim these have passed until actually tested.

User-facing test: open https://studio.promptence.tech/motion/chat-preview without installing the plugin, play the provided local demonstration, attach a small owned logo and a short recorded narration, optionally choose music, then explicitly export and inspect the local MP4/WebM. If the nested ChatGPT iframe does not permit local file selection, use the full external studio until that capability is approved.
