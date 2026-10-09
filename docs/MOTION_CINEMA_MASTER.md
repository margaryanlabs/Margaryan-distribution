# MARGARYAN MOTION OS v0.5 — CINEMA STAGING + OFFLINE MASTER

## What was built

The Studio is no longer forced to place the same diagram behind every headline. Each scene is staged by `lib/motion/cinematic-craft.ts` with a distinct optical treatment, including editorial kinetic beams, perspective depth rays, deterministic 3D-like orbit trails, constellations and signal paths, semantically relevant product process ribbons, and official-mark hero reveals.

The animated wordmark/logo hero uses the verified marketing SVG when available. When a brand asset has not been approved, the fallback is the true wordmark rendered as typography, **not** a fabricated logo. Product interfaces remain labelled illustrative and never claim real revenue, AI provider quotes or investment results.

The previous generic renderer was modified to stage product-specific vector interfaces only in relevant network shots, preserve alpha through transitions, and use a rotating sequence of soft dissolves, vertical edits and diagonal wipes. Text is kept in a safer editorial upper region, with special treatment for landscape.

### Fully local deterministic MP4 pipeline

The browser Studio may still export WebM via MediaRecorder. For reproducible H.264/AAC MP4 mastering on a computer with sufficient CPU/RAM, the new operator-only `scripts/motion/render-master.mjs` renders every timestamp from the same browser graphics implementation to FFmpeg using a PNG pipe. This is not a Vercel API route, does not require a video model or paid AI credits, and is independent of real-time browser recording frame delivery.

**Prerequisites:** Node >=22, project dependencies installed, local Next.js application started, `ffmpeg`, `ffprobe`, Chromium and the optional local dev tool `playwright`. Playwright is deliberately not a Vercel production dependency.

To install the optional tooling locally (does not need a paid API key):

```bash
npm install
npm install --no-save playwright
# Ensure Chromium exists; optionally set CHROMIUM_EXECUTABLE=/usr/bin/chromium
npm run dev
```

Create and export a complete film from a creative brief in another terminal:

```bash
npm run motion:film -- \
  --brand promptence \
  --lang en \
  --brief "A cinematic campaign on why customers ask AI and why source-based visibility evidence matters" \
  --out ./out/promptence-master.mp4 \
  --format portrait \
  --style cinematic
```

With a repository source scan and a user-provided, properly licensed voiceover:

```bash
npm run motion:film -- \
  --brand veto_sport --lang ru \
  --brief "Объясни риск и анализ коэффициентов без обещаний выигрыша" \
  --repo margaryanlabs/Vetosport \
  --voice ./media/approved-ru-voice.wav \
  --music ./media/licensed-music.mp3 \
  --out ./out/veto-sport-ru.mp4
```

Private repo scans require a GitHub token provided through a secure **operator** environment. Do not paste secrets into the chat or put them in the public Studio browser.

Alternatively, open Studio, edit a project, **Save project** JSON, and master it without regenerating copy:

```bash
npm run motion:master -- ./motion-project.json ./out/master.mp4 --fps 30 --crf 18
npm run motion:verify -- ./out/master.mp4
```

### Outputs and checks

For a named `master.mp4`, the offline system generates:

- `master.motion.json` — structured storyboard when using `motion:film`.
- `master.source-candidates.json` — ranked candidate logo/color provenance if --repo supplied; requires review before assets change.
- `master.mp4` — 1080x1920, 1080x1080, or 1920x1080 H.264, yuv420p, 24–60 fps; AAC if audio input supplied.
- `master-contact-sheet.jpg` — eight approximate sampled frames for creative review.
- `master.render-report.json` — actual parsed codec, dimensions, FPS and audio presence.
- Separate `motion:verify` checks duration, black stretches, aspect/resolution and audio presence if required.

**Guarantees and limits:** This code is an automated graphics/compositing pipeline, not a learned foundation video model and not a replacement for artistic review. The offline renderer requires a local app server and external binaries; it is not yet hosted behind the public website. Voiceover is supplied audio (recorded or generated through a separately approved TTS provider), not built-in free human speech synthesis. FFmpeg/Playwright do use local compute. Output quality depends on render machine, fonts and reviewed approved assets. The example commands have not yet been independently exercised end-to-end with Chromium/FFmpeg in every environment.

### Video direction standard

Every project should receive its own reference-grounded brand pack and visual grammar, not the same "orbit" behind four paragraphs. A professional director reviews: hook/story/CTA, visible product mechanism, logo provenance, audience and localized copy, balanced negative space, scene transitions, true audio mix, legal claims, safe areas and visual contrast. Passing a technical QA does **not** prove a film beats a human reference aesthetically.

### Security

- The offline CLI only connects to a local `http://127.0.0.1:PORT/motion` Studio for frames and storyboard generation.
- No cloud uploads, payment operations, social publishing or outbound messaging are triggered.
- Repo scans happen only with an operator's GitHub access. They emit candidate metadata, not private code contents.
- Browser render bridge validates and sanitizes project scenes before returning a PNG, does not read private files, and exposes no credentials.
