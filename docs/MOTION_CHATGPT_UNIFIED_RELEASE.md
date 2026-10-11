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
  Promptence source-honest demonstration and import/export JSON. A new
  user-triggered **PLAY WHOLE FILM / EXPORT VISUAL FILM** records all saved
  Canvas chapters as one local 720p/24fps silent WebM/MP4 workprint up to
  192 seconds without an API key; the operator-local Chromium/FFmpeg
  compositor remains the audio/source-aware H.264 Master up to 512 seconds.
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
npm run motion:test-film-browser
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
2. Upgrade the new *graphics-only* full-feature browser recorder with
   author-approved real source assets, continuous audio, frame cadence QA,
   and cross-platform MP4 acceptance. The user-controlled recorder exists
   but is not a substitute for the workstation Master.
3. Per-user private projects and OAuth, custom third-party brand kits,
   consented cloud MP4 render jobs and credit budgets.
4. Paid plans after production QA and user retention evidence.

## 11 October 2026 — independent quality verification

After discovering that GitHub-hosted Actions jobs exited **without starting
any steps**, the integrated branch was cloned into a fresh, no-secrets,
short-lived Vercel Node 22 Sandbox at pinned commit. The project required
pinning **TypeScript 5.9.3** because the previously selected TypeScript
7.0.2 no longer exposes the legacy `transpileModule/ModuleKind` API used
by this repository's motion regression harnesses. We also updated older
harness dependency injection for the actual source-composition and
independent image-overlay modules, fixed a deliberately short test fixture's
expected duration and ensured serialized Chat Pack comparisons ignore
undefined properties (not encodable in JSON).

Sandbox test results: `motion:test-plugin`, `motion:test-sequence`,
`motion:test-chat`, `motion:test-voice-booth`,
`motion:test-source-camera`, `motion:test-production`,
`motion:test-editorial`, `motion:test-real-source`,
`motion:test-chat-channel`, `motion:test-bundle`,
`motion:test-overlays`, `motion:test-film-browser`,
`npm run typecheck` and `npm run build` **passed** on the respective
integration commits. The final production preview must still be checked
on the newest Git commit after changes.

A real browser E2E encode was attempted with Playwright/Sparticuz Chromium,
but that sandbox lacked the required shared Linux `libnspr4.so` and
`libnss3.so`; therefore a fully played and decoded multi-chapter WebM or
MP4 was **not** verified by this environment. Passing Canvas/source/schema
contract tests is not equivalent to validating a video on an actual mobile
browser. Keep this PR draft until the recorder is exercised with a video
output and reviewed for frame pacing, exact runtime and mobile codecs.

## Real local voice & licensed music in browser export

The Film Sequence **PLAY WHOLE FILM** and **EXPORT VISUAL FILM** tools
now have explicit opt-in local narration and music inputs, using the
existing recording hardware and the Web Audio API. These are
**user-supplied, human-recorded or rightfully licensed files**, not
AI-generated voice, scraped music or a free TTS model. Supported local
audio is bounded to 40MB per WAV/MP3/M4A/OGG/WebM/FLAC file; media rights
must be checked before preview/export is permitted. Nothing is uploaded.

When both tracks are present, the music is lowered to 19% while the
original narrator remains at normal playback volume. Music may loop to
cover the feature runtime; narration does not loop. The audio capture bus
is attached to the Canvas recording stream, monitors through the user's
speakers and is closed (including tracks/decoders) when stopped. Since
not all browsers can MediaRecord the same audio/video pair, the output
is MP4 or WebM according to supported codecs, never misnamed, and
should be reviewed with sound before publishing. This remains a
**browser workprint up to 192 seconds**, not cloud GPU generation.

Validation: `npm run motion:test-soundtrack` checks local-only file
constraints, explicit consent, durations, consent rejection, decoded
audio mix track, music-loop vs narration-once and cleanup; tests were
executed in a fresh Vercel Sandbox, alongside `motion:test-film-browser`,
`motion:test-sequence`, `motion:test-plugin`, and TypeScript typecheck.
These pass but do not constitute an end-to-end browser-decoded media test.

A real Playwright headless chromium test was attempted on the Vercel
sandbox. Even after installing OS shared libraries, the browser closed
while navigating the Next.js page; a downloaded final 120s sound-film
has **not yet been personally audited**. Gate production acceptance on
playback of a real exported MP4/WebM in a browser and on a phone.
