# Promptence Cinematic Engine — first verified real WebGL MP4 proof
**Captured 14 October 2026**, preview branch `feat/promptence-cinematic-webgl-director`, commit `83481e572e1c7a1d1a35dcaae9af2e3117b9bfc7`.

## Actual recorded facts (not a theoretical rendering capability)
The **existing** Next.js Motion Studio successfully compiled and ran in a separate Linux browser workstation with Node 22, Playwright, headless Chromium with SwiftShader WebGL, and FFmpeg. The host page reported `window.__motionCinemaReady === true`; Chromium had a functioning WebGL context.

The existing `scripts/motion/render-promptence-cinema.mjs` produced a real H.264 MP4 composed from **240 time-addressable WebGL frames, at 24 fps and native 1920x1080**. The renderer's FFprobe QA reported:

- Duration: **10.000 seconds**
- Resolution: **1920×1080**
- Codec: **H.264**, 24 fps
- Final file size: **2,975,680 bytes**
- QA report saved as `PROMPTENCE_REAL_3D_MASTER_10S.qa.json`
- WebGL luminance checks: at 0.9s, 4.8s and 7.1s the three frame hashes were distinct; no black/frozen-scene condition blocked the export.
- Authentication was **not** needed. This specific proof used the existing clearly marked `--concept` mode, **not** a real Promptence product screenshot.

Confirmed playback URL to owner-approved experimental silent video:
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/d67e0626-f06e-486f-b43f-22b3810caf4a.mp4

An **optional original spoken trailer** was mastered using the same H.264 video, a generated English *deep* AI voice reading a newly written 19-word script, and a procedural original 10-second atmospheric sound bed. The audio was composed locally for this test; it was **not copied from a commercial music library**. FFprobe reported H.264 + AAC, 1920×1080, 10.000s, file size **3,206,478 bytes**.

Confirmed playback URL to narrated test:
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/32eeeed6-aea9-4579-9eeb-3be8e929ab4e.mp4

Full AI-voice transcript: “They ask AI. Who does it choose? See the sources. Understand the evidence. Change what matters. Promptence.”

## Exact local reproduction
Run the following against the reviewed source on a workstation with Node 22+, Chromium Playwright and FFmpeg:

```bash
npm install
npm run build
npm run start -- -H 127.0.0.1 -p 3000
# Separate terminal:
node scripts/motion/render-promptence-cinema.mjs \
  out/PROMPTENCE_REAL_3D_MASTER_10S.mp4 --concept --fps 24 \
  --chromium /absolute/path/to/compatible/chromium
```

For a product-facing screen, use `--screen /approved/real/screenshot.png` or the existing explicitly restricted `--capture-public` mode instead of `--concept`.

## What this proves, and what it does not
**Proven**: the specific code path renders and exports authentic 3D WebGL scenes to a playable native Full-HD MP4. This resolves the previous inability to execute the actual Chromium/WebGL/FFmpeg mastering workflow.

**Not proven**: visual equivalence to the user's cinematic reference or professional commercial creative approval. The visuals are still primarily procedural, lighting and typography are restrained, and the live product capture, detailed material design, soundtrack mixing and final 30/60-second script need creative review. This proof was verified in an **isolated renderer workstation**; the separate GitHub Actions proof workflow has not gone green and remains a release blocker. Do not auto-merge this PR.

Security: no production credentials, secrets, private source media, user data or customer metrics were used. Experimental clips contain a clearly marked concept screen.
