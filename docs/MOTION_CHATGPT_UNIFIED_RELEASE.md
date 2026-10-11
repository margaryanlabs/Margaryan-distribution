# Motion OS Pro × ChatGPT — integrated release candidate

**Status:** Code-integrated Vercel preview; NOT a production-approved public plugin.

This branch joins the separate ChatGPT Content Studio prototype (PR #55) and
Feature Film Sequence Studio (PR #57) **on top of current main**. It preserves
Voice Booth, real-source camera, private portable source ZIP, audio QC and CRM
authentication already deployed in main.

## Working product surfaces

- **MCP JSON-RPC endpoint:** POST /api/mcp with `initialize`, `ping`,
  `tools/list`, `tools/call`, `resources/list`, `resources/read`.
- **Three ChatGPT tools:** `create_motion_film` (1–8 scenes),
  `revise_motion_film` (scoped patch), and `create_motion_feature_film`
  (9–24 scenes / 65–192 seconds).
- **ChatGPT inline MCP Apps widget:** validated HTML resource and actual
  first-party Canvas short-film preview; can browser-export a supported
  short WebM/MP4 recording without any AI API. Host-side file upload happens
  only after an explicit click, when that host supports `uploadFile`.
- **Long-film inline editorial UI:** lists all scenes, switches between
  the two or three authored chapter previews, and clearly labels individual
  act playback/export as NOT the full multi-chapter master.
- **Motion website:** short Chat Pack deep links and long
  `#motion-sequence-v1` links, both requiring manual approval before edits;
  no automatic server write, media upload or rendering.
- **Sequence Studio:** eight editable chapters, film timeline, 120-second
  Promptence source-honest demonstration, import/export JSON and local
  Chromium/FFmpeg chapter compositor for a real H.264 MP4 up to 512 seconds.
- **Existing private portable ZIP:** unchanged. Source video, music,
  human microphone takes, rights and licensing stay under user control.

## Keyless is not zero-cost cloud video

ChatGPT authors a storyboard using the user's own account; the MCP server
does not call OpenAI API. Deterministic Canvas/FFmpeg effects run on the
user's browser or local operator workstation. Hosting, user limits,
storage, licensed media, paid voice models and commercial cloud rendering
may incur separate costs. No photorealistic text-to-video model is included.

## Integration and testing

```bash
npm install
npm run motion:test-plugin
npm run motion:test-sequence
npm run motion:test-chat
npm run motion:test-bundle
npm run motion:test-voice-booth
npm run typecheck
npm run build
```

Inspect the preview site at `/motion?mode=cinematic`, stage **TRY 120s
DEMO**, confirm/discard, open two chapters and check that existing ZIP/media
import/export still works. Verify short film handoff and the MCP
`tools/list` + `resources/read` response using MCP Inspector from a
reachable test host. Finally run a **real two-chapter Chromium/FFmpeg MP4
master** and inspect 9:16 legibility, decoding, spoken words and audio
alignment on a phone. CI/Vercel build alone cannot prove film aesthetics,
real MP4 production or ChatGPT plugin approval.

## Security and hosting gate

**Do not disable the CRM's Vercel SSO or operator Basic Auth globally.**
The website proxy permits only `/api/mcp`, `/motion` and
`/motion/chat-preview` as *application-level* public graphics surfaces.
Vercel's project-wide deployment protection can still prevent ChatGPT from
connecting; a verified, separately isolated public HTTPS domain or
approved edge proxy for these bounded resources is required. No user
accounts, invoices, private files, database or outgoing messages are
exposed by these tools.

- No authorization gate yet for these public *stateless* text-only tools;
  before introducing persistence, upload, cloud jobs, publishing or
  billing, enforce OAuth and per-user quotas.
- The film URL fragment contains storyboard text and is NOT encryption.
  The browser removes the fragment from location before preview/import.
  Do not put privileged client secrets or unlicensed private content
  into links or ChatGPT conversations.
- In the widget, child Canvas only accepts bounded project structure and
  refuses media bindings. Browser recording is user-controlled and subject
  to available codecs and file-size caps.

## Before public Plugin Directory submission

The current OpenAI plugin documentation requires a publicly reachable
HTTPS Streamable HTTP endpoint, completed ownership/domain challenge and
remote MCP scan, verified publishing identity and the required website,
support, privacy and terms URLs. Submission also requires review videos,
test cases and safety/policy scanning. A Vercel-protected preview cannot
be submitted as a public app.

No OpenAI endorsement, marketplace approval, background autonomous
agent or production subscriber billing is claimed by this branch.

## Product-next roadmap

1. Isolated public MCP domain and real ChatGPT installed-app integration
   test, along with server logs / basic abuse control.
2. Real multi-chapter browser preview, not just chapter navigation;
   source-complete local rendering with deterministic frames and audio QC.
3. Per-user private projects and OAuth, custom third-party brand kits,
   consented cloud MP4 render jobs and credit budgets.
4. Paid plans after production QA and user retention evidence.
