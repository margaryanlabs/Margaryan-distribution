# Content Studio × ChatGPT — 300s independent release candidate

**Status: integration preview / not ChatGPT Directory published.**

Motion Studio is separate from Promptence. Promptence is a sample customer
brand for 120s and 300s commercials. The editor runs in the Margaryan
Distribution Motion app, not under promptence.tech. No video model API key
is called by the MCP endpoint; user-provided ChatGPT authors the words.

## First-party flow

1. A connected ChatGPT client calls `create_motion_film` (1–8 scenes),
   `revise_motion_film` (controlled revisions) or
   `create_motion_feature_film` (9–40 shots, 65–300 seconds).
2. Stateless `/api/mcp` validates and normalizes the storyboard, never
   reading CRM/client data or attaching on-disk files.
3. Short films return `#motion-chat-v1`; feature films return
   `#motion-sequence-v1` links containing only inspectable script text
   and timing. The location fragment is promptly removed; it is not
   encryption and must not contain confidential pitches or user secrets.
4. Motion editor stages the draft with **INSPECT / PREVIEW** or
   **APPROVE & SAVE FILM**. No user project is overwritten automatically.
5. Browser Canvas does user-initiated whole-film visual workprints up to
   300 seconds, optionally mixing **approved local human voice / licensed
   music**. True source-video/image mastering requires a separate
   local Chromium+FFmpeg workflow; outputs require human audiovisual QA.

## Five-act implementation changes

The MCP tool schema accepts 9–40 scenes and up to five named acts, in
groups of at most eight scenes. The actual authored length is bounded to
65–300 seconds. Scenes are encoded in a minimized **source-free**
manifest without duplicative sanitizer defaults, which supports a
40-shot film within the conservative URL fragment length budget when
scene copy is concise. The first-party inline widget now supports up
to five chapters and 300 seconds, but individual act preview is not
a complete multi-act export.

## Inline ChatGPT full-film beta (11 October)

The first-party MCP Apps widget now provides **one continuous Canvas film**
throughout all 2–5 chapters, not a separate recording of just the first act.
Chapter buttons scrub that same timeline, while **PLAY** and
**EXPORT WHOLE FILM** run across the complete project (up to 300 seconds).
No OpenAI video API is involved. The downloaded workprint is **silent**;
add user-approved human narration, licensed music, overlays and original
source footage in the separate Motion Studio editor for the master cut.

The embedded player explicitly rejects arbitrary scene URLs, private media
IDs, picture-in-picture files and unsupported GPU/spatial shots; it stops
recording if its host is hidden and discards incomplete media when canceled.
The user must keep the ChatGPT app visible for real-time MediaRecorder export.
If the output is larger than the host's 25 MB file-transfer limit, the local
video download is retained; optional SAVE TO CHATGPT may be unavailable.

**QA:** A runnable `scripts/motion/e2e-inline-video.mjs` and focused GitHub
workflow `motion-inline-e2e.yml` exercise actual Chromium capture of five
different acts, download one video file, and independently inspect its
stream, dimensions, duration and actual packet timestamps via FFprobe.
This is a stronger acceptance requirement than a Vercel READY build, but
**the actual full-film encoded-output test must PASS before production
release**. The existing fast regression test executes the real widget's
JavaScript in a mocked DOM and verifies that five chapters are forwarded
together and chapter switches seek instead of replacing the film.

The generic `labs` brand is intended for unsigned/custom projects
pending verified customer assets. Promptence is just one preset.

## Verification conducted

On a disposable Vercel Sandbox using Node 22:

- `npm run motion:test-plugin`: PASS including 120s and real 40-scene
  300s manifests, bad input rejection, compact links, no media IDs,
  review gating and RPC contract.
- `npm run typecheck`: PASS with TypeScript 5.9.3.
- `npm run build`: PASS, including prebuild motion sequence, approved
  audio, portable source ZIP, precision cut and image overlays.
- Actual local Next production server: MCP `initialize`,
  `tools/list`, `resources/list`, wrong-Origin rejection: PASS.
- `resources/read` app HTML: PASS with explicitly configured HTTPS
  origin and CSP listing first-party frame host.

**Not yet verified:** external ChatGPT custom-app installation (Vercel
deployment-level SSO remains enabled), a real 300s audiovisual video
decoded end-to-end on Android, actual third-party white-label asset kits,
enterprise sign-in and payment. The inline widget's browser recording is
subject to codec and device support.

## Security and release

Keep CRM/admin/worker paths behind existing Distribution auth. Current
app-layer public exemptions apply ONLY to `/api/mcp`,
`/motion/chat-preview` and existing explicitly public Motion pages.
Do not disable SSO for the whole Distribution project. When a domain is
available, provision a narrowly scoped public host for these endpoints
and run a real ChatGPT MCP integration plus privacy/abuse review.

Merge only after newest main and branch are reconciled, GitHub Actions
run relevant tests, and manual browser QA completes.
