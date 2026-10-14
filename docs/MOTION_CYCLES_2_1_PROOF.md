# PROMPTENCE — Cinematic Engine 2.1: verified 2-second composition test

Recorded: 2026-10-15. Existing Motion Studio branch `feat/promptence-cinematic-webgl-director`; PR #90 remains draft.

## Actual 2.1 file

**Watch real Blender Cycles 2.1 frame animation with original audio:**
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/afd8ad21-82f3-428b-bbcf-355c7b46c9f0.mp4

Asset independently verified HTTP 200 video/mp4. This is a real `Blender 4.5.4 Cycles CPU` render of edited 3D geometry with moving 54 mm film camera. Full native Blender model, individually made keycaps, public promptence.tech screenshot packed in the editable .blend scene. This is **not** a motion-still or video-model mockup.

## Concrete improvements over 2.0

1. Removed backlit arc and right-side decorative capability-card that obscured the product.
2. Reduced dark monolithic pedestal height from 0.42 to 0.14 and radius from 4.62 to 4.15, redesigned matte basalt and seamless dark set.
3. Re-authored brushed-aluminium, anodized graphite, keycaps, trackpad, basalt procedural micro-bump and photographic area lights.
4. Widened 59 mm prototype camera to **54 mm** after visual inspection showed part of lid clipped. New dolly camera tracks target on actual public website content.
5. Kept editable Blender file, fully packed actual real screenshot, no invented AI scan metrics.

## Measured movie output (not hype)

- **960 × 540 at 24fps**, 48 native Cycles frames, **2.000 seconds**.
- H.264, AAC stereo sound from original synthesized V9 score, 530,147 bytes.
- FFprobe counted 48 decoded video frames.
- FFmpeg decode completed without error.
- Remote video URL HEAD returned 200 video/mp4.
- Original native 1280x720/24-sample mid-shot render also passed.
- Full render conducted with CPU Cycles (12 samples) and temporal motion is subtle rather than advertisement-level.

The local Blender render produced all 48 frames. A first FFmpeg attempt failed due to an incorrect `afade=d=.3` format in the running checkout. The audio render was fixed to `d=0.3`, and the file was successfully rebuilt from the genuine 48 Cycles frames, verified and uploaded. The GitHub master CLI currently contains the valid `d=0.3` string.

## Candid creative verdict

This version is **cleaner** than 2.0: no decorative text box or giant halo. Nevertheless the laptop still appears modestly stylized, the public homepage is too small for most phone displays, the dark round podium is still more prominent than ideal, and the camera move is subtle. It does **not** reach the user's premium visual reference, isn't 4K, and is not approved for paid advertising.

Next real visual gate before extending:
- replace the device screen composition with a closer 2D UI sequence cut from actual site content;
- use roughness and high-resolution textures rather than solely procedural micro-bump;
- align stronger camera motion to music without clipping the display;
- compare 3 physically different camera frames at 1280×720, ideally 1920×1080, before rendering 25 seconds.

**Code:**
- `scripts/motion/cycles-promptence-studio-v21.py`;
- `scripts/motion/render-cycles-promptence.mjs` (`--scene v21`);
- `scripts/motion/test-cycles-promptence.mjs` (scene/QC gate).

No claim of final commercial or actual production release. PR stays draft; main remains unchanged.
