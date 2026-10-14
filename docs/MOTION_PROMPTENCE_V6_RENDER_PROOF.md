# PROMPTENCE — CINEMATIC V6 / VERIFIED 16-SECOND REAL 3D FILM

**Date:** 2026-10-14
**Project:** Existing MARGARYAN MOTION STUDIO, existing PR #90
**Source scene:** `lib/motion/cinema/promptence-film-v6.ts`
**Renderer:** `scripts/motion/render-promptence-cinema.mjs`

## V6 changes, actual source

This is not an isolated slideshow. It uses a real `THREE.WebGLRenderer`, a perspective camera, physically shaded 3D materials, procedural softbox PMREM reflections, genuine UV remapping, and deterministic exact-timestamp positions. V6 runs for 16 seconds and has four acts:

| Time | Visual composition |
| --- | --- |
| 0–4.25s | Actual public Promptence homepage on extruded aluminium/glass display, with clean negative-space typography |
| 4.25–7.7s | **60 independent WebGL UV fragments** break away from the real screenshot and curl into a spatial assembly |
| 7.7–12.6s | Curved evidence field, light sprites, luminous core, 600 deterministic particles, refractive-looking metal orbit rings |
| 12.6–16s | 3D field collapses; full-opacity official PROMPTENCE logo/brand close |

**Source integrity:** The product screenshot was captured from `https://promptence.tech/` in a separate unauthenticated browser, HTTP 200, and then projected onto actual scene geometry. The concept-only preview never fabricates rankings, clients, AI answers or conversions. The 60 fragments reference the exact same texture as the actual screen; they do not redraw a lookalike UI. The audio is an English generated voice plus original procedural score (script committed in `scripts/motion/soundtrack-promptence-v6.py`).

## Actual working video assets

**Narrated V6 — H264 + AAC, 16 seconds:**
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/37e7e46e-3555-4727-81d8-8f241daa67d2.mp4

**Silent V6 — H264, 16 seconds:**
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/6fe501c8-e332-426a-a525-0740c953613d.mp4

Both URLs were uploaded successfully, confirmed by the hosting service and rechecked with HTTP 200 video/mp4.

## Verified render and playback

A separate browser workstation ran **Node 22, Next.js 16.3.3, Chromium/Playwright in SwiftShader WebGL, and FFmpeg**.

- `npm run build`: PASSED, including `npm run motion:test-cinema` and TypeScript.
- `window.__motionCinemaReady`: TRUE; WebGL context initialized successfully.
- Native MP4 exported by the actual project CLI with `--capture-public --fps 24`.
- `ffprobe`: duration 16.000s, **1920×1080**, **24/1 FPS**, H.264, AAC.
- Independent decoder consumed all frames without emitting decode errors.
- **384 actual video frames** (counted with `ffprobe -count_frames`).
- Narrated file size **7,775,615 bytes**.
- Three live WebGL frame probes passed non-black and distinct-hash gates: samples at t=0.9s, 4.8s, 7.1s yielded hashes `d200bcd`, `b656a863`, `bc219827`; mean luminance was > 21 for each.
- A **separate silent H.264** version was stream-copied from the verified finished master.
- The director page exposes a WATCH VERIFIED V6 MP4 link; local browser export is also extended to 16 seconds and uses real `MediaRecorder`, though it remains silent.

## Reproducing native 1080p master

Build and serve the approved branch on a Node 22+ workstation with Chromium WebGL and FFmpeg:

```bash
npm install
npm run build
npm run start -- -H 127.0.0.1 -p 3000

# In another terminal, with a real product public capture and reviewed audio:
npm run motion:cinema -- out/PROMPTENCE_CINEMA_V6_16S.mp4 \
  --capture-public --fps 24 \
  --voice /path/to/english-voice.mp3 \
  --music /path/to/approved-original-score.wav \
  --chromium /path/to/chromium
```

The original score can be independently recreated with Python 3 + `numpy`, `scipy`, `soundfile`:
```bash
python3 scripts/motion/soundtrack-promptence-v6.py
```
It writes `out/PROMPTENCE_V6_ORIGINAL_SCORE.wav`. The original sample is procedurally synthesized and includes no third-party song recording; this is not a guarantee that the result is a professionally mixed score.

### Narration transcript

“Your next customer is asking AI. Who will it recommend? Promptence reveals the answers and the sources behind them. Find the gaps. Take action. Measure the change. Promptence. Understand the answer.”

## Quality and release status

This is an actual rendered preview/master with verified pixel/audio streams, **not** a finished commercial approved for publication and **not** proof of Apple-level advertising quality. The scene is 3D but the transition is artistically experimental, and the voice/sound should be auditioned on real speakers. User creative approval, real end-to-end product functionality claims, licensing review, and a stable GitHub Actions GPU worker remain separate gates. Keep PR draft / not merged until approved.

Do not call Vercel READY a successful video render; these are separately checked. No passwords or private Promptence data were used in this proof.
