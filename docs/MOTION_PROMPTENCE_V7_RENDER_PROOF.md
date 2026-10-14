# PROMPTENCE CINEMATIC V7 — VERIFIED 20-SECOND REAL 3D WORKPRINT

Date: 2026-10-14. Existing project: Margaryan Motion Studio. Existing PR: #90.
Scene: `lib/motion/cinema/promptence-film-v7.ts`.
Renderer: `scripts/motion/render-promptence-cinema.mjs`.

## Actual media files (working URLs, confirmed HTTP 200, video/mp4)

**V7 — English AI voice and original 20-second soundtrack:**
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/9b62ee20-9f82-4cb4-bf81-3ff4714450b2.mp4

**V7 — silent H.264:**
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/2c1197db-5b9a-4d6e-88fc-207f81d3cd48.mp4

These are not placeholder links: the master was encoded and uploaded successfully, and URL HEAD responses returned 200 video/mp4.

## Measured mastering quality

- 20.000 seconds; **1920×1080 at 24 fps**.
- **480 native, timestamp-addressed WebGL frames**, H.264 video + AAC audio.
- Full narrated MP4 size: **8,941,032 bytes**.
- FFprobe frame count and codec checks **passed**.
- FFmpeg decoded all frames, no reported errors.
- Playwright/Chromium `window.__motionCinemaReady` true on the built Next.js application.
- The actual WebGL framebuffer passed five non-black, non-frozen scene checks (0.9, 5.6, 9.5, 14.5 and 18.7 seconds), with all frame hashes distinct.
- An independent silent version was made from the encoded video stream without an extra lossy video encode.
- The authentic product screenshot was captured only from the public `https://promptence.tech/` landing, without authentication or data mutation.

## What changed from V6

1. Five distinct 3D acts, 20 seconds, and an additional optical-macro sequence instead of a long static brand close.
2. Re-authored camera with physical progression from the product into the evidence field and separate close-up optics.
3. 920 deterministic signal particles, 24 3D filaments, 4 physically lit rings.
4. Native product-screen segmentation now uses **64 true 3D UV-accurate pieces** with quicker darkened dissolve rather than bright floating rectangles.
5. Additional glass optic object with PBR reflections/transmission, softened dark-green materials and restrained lights. No fictional AI data.
6. Removed artificial 3D floor/horizon line.
7. Identified and fixed an especially visible production defect: the **global Margaryan Distribution navbar** was unexpectedly burning into every rendered video. The studio now isolates the film above all site navigation through a dedicated stacking context and fixed export root. This was validated by inspecting rendered frames before and after. Added a runtime release gate so future renders refuse a non-isolated scene.
8. Brand typography enlarged and caption transitions now unmount invisible DOM objects to prevent residual overlays.
9. New professionally styled script narrated in English by AI; original musical sound design created from synthesised waves and deterministic noise with no third-party song samples. Full generator source: `scripts/motion/soundtrack-promptence-v7.py`.

## Authenticity and limitations

- Real source capture and original brand logo; no fabricated metrics, customer testimonials or search rankings.
- The optical data sculpture is **concept art**, not a product feature or live AI result.
- The modelled glass is physically shaded with WebGL, not a path-traced cinematic asset.
- Voice is AI-generated. Original soundtrack is procedural, not guaranteed to match professional composition/mixing.
- `publicationApproved: false` in the QA report. This is a creative review workprint, **not proof of parity with the user's premium reference** and not a finished 30/60s launch advertisement.
- GitHub Actions GPU workflow status remains a separate CI release gate. Production main has not been merged.

## Exact repeatable render path

```bash
# Node 22+, FFmpeg, working Chromium/Playwright ANGLE SwiftShader or GPU
npm install
npm run build
npm run start -- -H 127.0.0.1 -p 3000

# Another terminal; authentic read-only public Promptence homepage
npm run motion:cinema -- out/PROMPTENCE_CINEMATIC_V7_20S.mp4 \
  --capture-public --fps 24 \
  --voice /path/to/reviewed-voice.mp3 \
  --music out/PROMPTENCE_V7_ORIGINAL_SCORE.wav \
  --chromium /absolute/path/to/chromium

# To author the sound bed (requires numpy, scipy, soundfile)
python3 scripts/motion/soundtrack-promptence-v7.py
```

Visualize five acts at `/motion/cinema`. The workprint may be shared for review, but do not silently merge the draft PR or claim premium-studio parity.
