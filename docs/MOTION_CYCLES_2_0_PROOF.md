# Cinematic Engine 2.0 — authentic Cycles-first production proof
Date: 2026-10-14
Project: existing Margaryan Motion Studio; draft PR #90
Source: scripts/motion/cycles-promptence-studio.py
Mastering CLI: scripts/motion/render-cycles-promptence.mjs
Test: scripts/motion/test-cycles-promptence.mjs

## Measured implementation and actual rendered output

An isolated Linux workstation was provisioned with genuine **Blender 4.5.4 LTS** and its **Cycles CPU path tracer**, plus the existing public Promptence screenshot, Python 3 and FFmpeg. This is not a WebGL capture, photo slideshow, ImageGen result or stock product footage.

The original Blender Python source in this PR successfully constructed a **native, editable Blender scene** comprising:
- Individually modelled bevelled laptop chassis, keyboard keys, trackpad, hinge, lid, camera dot and authentic UV screen.
- Original public https://promptence.tech homepage texture, included as **packed image inside the .blend**.
- PBR metallic/roughness/clearcoat materials with procedural micro-bump.
- One genuine basalt presentation plinth, endless photographic studio, actual geometry light arch and optional brand capability card. No fake AI rankings or percentages.
- Five rectangular physically positioned large studio area lights, animated **53mm camera**, genuine Cycles path tracing with denoise.
- Python script supports render resolution 640×360 through 3840×2160, sampling, saved .blend and frame ranges.

Verified **1280 × 720 / 24 samples** ray-traced keyframe on frame 48 and exported a **self-contained Blender scene (.blend) with the authentic screenshot packed**.

A real **2.000-second, 960 × 540, 24fps, 48-frame Blender Cycles animated movie**, encoded H.264 and accompanied by original programmatically composed AAC sound design, was also exported and independently decoded using FFprobe/FFmpeg without errors.

**Actual Cycles MP4 workprint:** 
https://d2ol7oe51mr4n9.cloudfront.net/user_3HoFPSIfr8HaTS2uAE1uxoDnLl0/8d46b705-5735-4b2a-b43a-20cfe5c905ff.mp4

The final uploaded URL returned HTTP 200 video/mp4. Workprint size: 517,258 bytes; 48 video frames counted, audio codec AAC. This is a camera animation of *actual path-traced editable 3D geometry* rather than panning a still.

## Quality gate: not a final advertising master

1. **Proof resolution is only 960×540.** Its cinematic and texture quality are not comparable to a final 4K commercial. The scene can render larger, but that resolution has not yet been mastered as a motion picture.
2. The initial keyframe inspection found the presentation plinth and a right-side capability panel visually too strong. We intentionally treat this as a baseline for improvement, not an approved launch commercial.
3. The physical source model is more credible than V9's primitive WebGL geometry, but still needs better authored mesh detailing, roughness maps and a product-focused lighting/composition review.
4. Original soundtrack is procedural and reused from an earlier V9 composition for this first sample; it needs musical/artistic review.
5. The existing Next.js /motion/cinema V9 WebGL preview still exists; **Blender Cycles is a separate mastering worker attached to the same repo**, not a cloned product.
6. Generated .blend and PNG sequences reside in the isolated renderer workstation. The fully reproducible source is committed; unlike the code, those large bytes are not automatically uploaded to GitHub.
7. Artwork and commercial use have not been approved. CI deployment of a persistent Blender worker has not been completed.

## Reproduce from repo (requires Blender LTS, Node 22+, ffmpeg)

```bash
# Full single keyframe: editable .blend plus authentic screenshot in image texture
blender -b -t 6 --python scripts/motion/cycles-promptence-studio.py -- \
 --screenshot /owner/approved/public-promptence.png \
 --output out/promptence-hero.png --save-blend out/promptence-master.blend \
 --width 1280 --height 720 --samples 32 --frame 48

# Actual fixed-framerate Cycles MP4 (CPU 24fps, 2 seconds)
npm run motion:cycles -- out/promptence-cycles-proof.mp4 \
 --screen /owner/approved/public-promptence.png \
 --blender /path/to/blender --width 960 --height 540 \
 --samples 12 --start 1 --end 48
```
Node master script validates input provenance, calls Blender to generate exact frames and .blend, invokes FFmpeg H.264, verifies duration, codec and frame counts with FFprobe and leaves a JSON QA record marked `publicationApproved: false`.

**Next actual quality work:** remove or redesign the visually weak glass label block, reduce the oversized presentation plinth, improve material texture lighting and do a side-by-side art-quality review at 1280×720 or higher before attempting a long 25s commercial. Never claim a 4K proof until one actually exists.
