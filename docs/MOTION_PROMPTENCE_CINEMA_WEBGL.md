# Promptence — WebGL Cinematic Director (10-second proof)

This is an **opt-in module inside the existing Margaryan Motion Studio**, not a replacement app or a fabricated product. Open `/motion/cinema`, linked from `/motion`.

## What is actually implemented

- Genuine `THREE.WebGLRenderer` and perspective camera with a Catmull-Rom camera track.
- World-space machined graphite product display, studio PMREM reflection map, physical floor and six connected evidence traces with staggered choreography.
- An explicitly marked **CONCEPT VISUAL / NOT LIVE RESULTS** display when there is no product capture; this is not a fabricated UI screenshot.
- Editor offers a three-act shot navigator for directorial review.
- Exact absolute-time updates: every frame seeks to timestamp `t`; no random rendering or accumulated delta.
- Owner-approved **real product screenshot** imported into the product display as a texture. The scene renders a dark unpopulated screen until the owner provides a genuine capture; it never draws fake AI results.
- Brand lockup uses the existing verified `/motion/brands/promptence.svg` asset.
- Browser preview, scrubbing and an offline Playwright + FFmpeg 1920 × 1080 MP4 export.
- Optional voice and licensed music provided as local files; no eSpeak, no forced pitch/time stretching, no unlicensed music.
- Native resolution, duration, FPS and audio stream checked by `ffprobe`.
- Blocking errors for missing source, missing GPU/WebGL, missing Playwright, bad audio, or invalid output.

## Workflow (Node 22+)

```bash
npm install
npm install --no-save playwright
npx playwright install chromium
npm run motion:test-cinema
npm run dev
```

In another terminal:

```bash
# First check the timeline and arguments without rendering
npm run motion:cinema -- out/promptence-cinema.mp4 --concept --dry-run

# The source-authentic product shot (required for a product-facing film)
npm run motion:cinema -- out/promptence-cinema.mp4 \
  --screen /absolute/path/to/approved-promptence-capture.png \
  --voice /absolute/path/to/narration.wav \
  --music /absolute/path/to/licensed-score.mp3 \
  --fps 30

# Zero-upload alternative: capture only the official public Promptence homepage
npm run motion:cinema -- out/promptence-landing.mp4 --capture-public --fps 30

# Visual-only concept proof: 10-second 3D scene, NO PRODUCT SCREEN
npm run motion:cinema -- out/promptence-3d-concept.mp4 --concept
```

The screen capture must be a real PNG/JPEG/WebP, at least 720 × 400, under 12 MB. No login credentials, recordings, analytics scores or business secrets should be put in the renderer. If a capture is not provided, the physical 3D screen remains blank by design. A concept proof is **not** a launch-film master.

The optional `--capture-public` path uses a separate unauthenticated Chromium page
to capture exactly `https://promptence.tech/` and validates that the browser stays on
the official domain and sees the product name. It never signs in, submits a scan, or
constructs unverified AI outputs. The reviewed PNG is saved beside the output MP4.
`--screen` and `--capture-public` cannot be used together.

The CLI probes **three actual WebGL framebuffer samples** before writing frames. A
black or frozen 3D renderer blocks the MP4; the QA report records sampled luminance
and per-frame hashes. This is a technical integrity check, not artistic approval.

The CLI operates on the locally running Studio only. It never sends private media to a hosted model or automatically posts a video. Output is `*.mp4` plus `*.qa.json`; product/artistic sign-off remains manual.

## Render and graphics limitations

- Headless Chromium must support WebGL. The CLI attempts ANGLE SwiftShader as a CPU-compatible backend. Some managed/sandboxed environments disallow it; in that case export fails explicitly, **not** by switching to flat Pillow frames.
- This initial proof is exactly 10 seconds. It has no AI-guaranteed photorealism, no automatically generated licensed track and no automatically narrated finished campaign.
- The 3D scene uses physically based material shading, not path-traced global illumination. Large-budget film realism would require authored high-resolution assets, environment maps, calibrated studio lights, better compositions and a stronger render worker.
- Production can be 24 / 30 / 60 fps. 4K requires a separately tested worker and explicit sizing/VRAM plan.
- **This PR implements the new code path and its dry-run safety tests. It does not claim a verified MP4 has been produced on the current runner.** Run the smoke and live GPU check before merging and publishing.

## Operator QA checklist

1. Open `/motion/cinema` and verify WebGL status is READY, not UNAVAILABLE. Review the 3 director acts and the reflective studio scene.
2. Scrub 0, 2.5, 5, 8.5 and 9.9 seconds: camera, screen and 3D evidence transform independently and deterministically.
3. Confirm the *real* screenshot is present before using any footage of a product.
4. Confirm the exact Promptence mark and large closing typography are readable on mobile.
5. Render with a reviewed source; verify `*.qa.json` and visually inspect frames, reflections, copy and screen readability.
6. Confirm narration, pronunciation, music license and sound synchronization by listening to the actual MP4.
7. Do not announce a 60-second worldwide film until all scenes are authored and the finished MP4 passes human QA.
