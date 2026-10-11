# Motion Studio / first-party remote MCP bridge (October 2026)

## What is actually implemented

Margaryan Motion Studio now has a **real MCP Streamable HTTP endpoint**:

`https://distribution-web-production.up.railway.app/api/motion/mcp`

It uses the official `@modelcontextprotocol/server@2.3.1` SDK, modern 2026 and legacy 2025-era per-request stateless MCP. It has no OpenAI API integration, no key costs, no Huggsfield/Higgsfield generator and no hidden cloud agent. Vercel serves the control-plane only.

**Public endpoint routing:** The existing Distribution Railway web service at `distribution-web-production.up.railway.app` is the intended publicly reachable domain. The main Vercel Distribution project currently applies deployment protection even to production; **do not disable it globally** merely for MCP. The Railway `proxy.ts` exception is exact-match for only `/api/motion/mcp` and `/motion/mcp`; every other private Distribution/CRM route keeps Basic operator authentication.\n\n**Read-only public MCP tools** (exact tool IDs):

| Tool | What it DOES | What it DOES NOT |
|---|---|---|
| `motion_studio_capabilities` | Reports actual production modes, readiness and limitations | Claim you have a running render worker |
| `motion_create_project` | Compose authentic bounded editorial project + production pack via our actual keyless Motion Director | Export MP4, store private projects, synthesize AI measurements |
| `motion_promptence_cut` | Give our actual brand campaign/signature or real-click source-needed edit plan | Run a scan, click private websites, impersonate evidence |
| `motion_review_project` | Inspect original project JSON for script/timing/media-reference risks | See pixels, listen to audio, certify an ad |
| `motion_preview_patch` | Validate and preview `motion-chat-v1` edits IN REQUEST MEMORY | Silently replace an active edit or save to GitHub |

**Security:** no private file access, no CRM, no database writes, no credentials, no arbitrary process or shell execution. Requests are bounded to 32 KB and request `Origin` is validated; MCP reads are stateless and return `Cache-Control: no-store`. Secret-bearing content should still not be sent to a public connector.

### Tested locally

```bash
npm run motion:test-native-mcp # static safety checks
npm run dev
MOTION_MCP_TEST_URL=http://localhost:3000/api/motion/mcp npm run motion:test-native-mcp
```

The live suite exercises the MCP **initialize**, **tools/list**, **tools/call**, an actual Promptence film cut, and disallowed cross-origin requests. This is NOT merely a REST endpoint named `/mcp`.

## Connecting to ChatGPT

**Connection and capability availability depend on your ChatGPT plan, permissions and client.** As of October 2026, OpenAI's official developer mode documentation indicates the full *write-capable* custom MCP rollout is for Business, Enterprise and Edu workspaces (beta, web); Pro developer mode can attach read/fetch custom MCPs. A Plus user may **not** see a custom-app creation button at all. We cannot bypass ChatGPT account entitlements by running our own MCP. Android mobile ChatGPT cannot currently attach custom developer-mode MCP apps; do the setup on the web if eligible.

1. Use an eligible **web** ChatGPT workspace and enable **Developer mode** in Apps settings. Workspace Admin/Owner may need to enable it.
2. Open **Settings → Apps → Create** (or workspace Settings → Apps → Create).
3. Choose a **custom MCP app**, name `Margaryan Motion Studio`.
4. Endpoint: `https://distribution-web-production.up.railway.app/api/motion/mcp`.
5. **Authentication: None** only for the five public read-only tools above. These commands are public-safe; do not add rendering/account writes or private user data to this unprotected endpoint.
6. **Scan Tools**. Verify 5 tools, then Create/enable the draft and select the app for the current ChatGPT message.
7. Ask `@Margaryan Motion Studio create a Promptence campaign storyboard in Russian`. The response is a genuine editable project JSON for the local Motion Studio.

A built-in plugin registration from GitHub/Vercel is **not** the same as your ChatGPT account installing a custom app. Installation always requires account-holder approval and plan support. The source code or Vercel deploy alone cannot make a new tool appear in every ChatGPT chat.

## Rendering (NOT YET direct through MCP)

Actual film rendering still requires an authorized long-running native worker to run real Chromium/FFmpeg, handle voice/music and approved original footage, store the video in durable private object storage, and make it available for retrieval. Vercel's serverless MCP does **not** run FFmpeg or claim to return MP4.

Existing local pipeline, already implemented:

```bash
npm run motion:interaction -- --out out/motion/promptence-interaction
npm run motion:interaction-score -- --evidence out/motion/promptence-interaction/interaction-evidence.json \
  --project out/motion/promptence-interaction/interaction-film.motion.json \
  --out out/motion/promptence-interaction/score.wav
npm run motion:master -- \
  out/motion/promptence-interaction/interaction-film.motion.json \
  out/motion/promptence-interaction/result-review.mp4 \
  --media-map out/motion/promptence-interaction/interaction-media-map.json \
  --music out/motion/promptence-interaction/score.wav \
  --url http://localhost:3000/motion
```

For a direct ChatGPT → MP4 workflow we still need **authenticated write-capable MCP app**, durable job queue, **a continuously available owned render worker** and result storage. These are NOT substituted with Higgsfield's remote computer and have not been provisioned/billed. Before allocating paid Railway render compute, confirm cost limits, review authentication and deploy an isolated worker without access to CRM or production customer secrets.

## Source of truth

- MCP server `lib/motion/native-mcp.ts`
- HTTPS route `app/api/motion/mcp/route.ts`
- Regression `scripts/motion/test-native-mcp.mjs`
- Current actual offline render `scripts/motion/render-master.mjs`
- Product creator `app/motion/page.tsx`
