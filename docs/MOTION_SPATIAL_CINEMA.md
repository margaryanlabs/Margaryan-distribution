# Motion OS — Spatial Cinema / actual Three.js renderer

## Purpose

Add **real** WebGL geometry to Cinematic Studio in place, as a selectively applied shot type. All existing Canvas shot types, Quick Studio, Proof Director, audio editing, source screenshot capture, QA, and offline H.264 mastering continue unchanged. This is graphics-driven cinema, **not** AI-generated footage or fake product screenshots.

## Open source / licensing

- Three.js `0.186.1` and its separately pinned TypeScript definitions: MIT.
- GSAP `3.15.0`: free standard no-charge commercial license (not MIT).
- No Theatre.js Studio or Remotion binaries included in this step. Theatre Studio uses AGPL-3; embedding it publicly without reviewing obligations would be risky, while Remotion has a team-size-specific license. We avoid pretending these have been integrated.
- No neural model, tokens, cloud GPU or API credentials used in the 3D pipeline.

## What works

The existing scene inspector contains a **Real 3D / Three.js spatial hero** composition. Only that scene dynamically loads the large Three.js/GSAP bundle, and only in the browser.

The renderer makes *actual* 3D objects with depth tests, perspective camera, multiple lights, faceted metallic core, orbital torus geometry, 3D signal fragments and depth-positioned stars. The camera and movement are functions of `time`, `progress`, brand accent, and shot index; GSAP's `power3.inOut` easing is used with a caller-supplied timestamp, **not** an independent animation loop. That makes output reproducible during scrubbing, export and offline MP4 encoding.

No stock video is fetched. Geometry is abstract and does not pretend to show actual customer results, a functional UI, or a neural video result.

### Visual safety & performance

- Fonts, uploaded real screenshots and brand identifiers never enter the WebGL scene; they stay in the existing 2D presentation.
- The 3D renderer is lazy-loaded only when a shot selects `spatial`.
- One offscreen WebGL canvas and one set of meshes are reused; pixel ratio is 1, no postprocessing/bloom/shadow-map resources.
- On devices without WebGL, no spatial export is allowed: preflight raises a clear error instead of silently substituting 2D and claiming real 3D.
- Existing 2D projects do not load any Three.js modules.
- Offline `npm run motion:master` uses the existing `__motionFrame` bridge, but now it checks WebGL readiness before each spatial film.

## User flow

1. Open `/motion?mode=cinematic` and select a brand.
2. In *03 / Scene Inspector → Visual Composition*, select `Real 3D / Three.js spatial hero` on one selected shot.
3. Wait for the engine READY badge, then choose camera motion/intensity, duration, transition and narration.
4. Scrub preview, review shots, import the approved voice/music, then export. Browser video may be WebM; the operator FFmpeg workflow masters H.264/AAC.

## Explicit remaining work

- Final result still needs visual review in real Chrome/Edge on high-end/low-end GPUs, portrait and landscape.
- Theatre.js could become an **internal-only** editor if legal/deployment constraints are reviewed; public bundles should not accidentally include the AGPL studio.
- Remotion can be added as an **alternative mastering** adapter after team-size licensing is confirmed, using exactly the same shot schema and approved media.
- Real UI motion design and 3D product demonstrators must use screenshot/video files with provenance and authorization.
- Cinematic results still depend on good concepts, directorial choices, typography, music and recorded speech; adding 3D doesn't by itself make an ad professional.

## Validation

CI checks `motion:test-production`, `motion:test-score`, `motion:test-reference`, TypeScript and Next build. The 3D runtime cannot be validated by these code checks alone; a screenshot/MP4 from an actual WebGL context is required for final visual proof.
