# MARKET SPACE V9 — Commercial Experience

Isolated premium sales/showcase site for Margaryan Labs virtual retail. This is not a replacement for MARKET SPACE Studio. A V9 copy of the world renderer is included to allow safe visual iteration while keeping V8.1 untouched.

## What ships
- Cinematic responsive landing with original UI, four industry concepts (Fashion, Supermarket, Beauty, Home), transitions, editorial cards, offer tiers and mobile menu.
- CTA launches an isolated V9 version of the V8.1 interactive world inside a modal. World query preserves the category; optional Lite toggle uses mode=lite.
- Short client brief form can copy locally or export a text file. There is no server-side lead capture or payment processing; this is disclosed to visitors.
- Reduced-motion support, keyboard navigation and focus management for modal dialogs.
- Remote photographs are moodboard references, disclosed as non-rendered concept art. They are not screenshots of the actual world.

## Scope and safety
- Only new market-space-showcase-v9 and market-space-world-v9 files; no modification to INGU, V8/V8.1 or existing Studio configurations.
- Branch: feat/market-space-v9-commercial-experience-20261026, stacked on V8.1 UX branch. The site has NOT been deployed.
- Static path: /market-space-showcase-v9/index.html, linked demo sibling: /market-space-world-v9/.
- Image URLs rely on Unsplash hosting. Verify usage rights, availability and image performance, and replace with approved owned visual assets before commercial public launch.

## QA record
- Source fetched back from GitHub after commit.
- Inline JavaScript compiled without syntax errors.
- JavaScript-referenced element IDs exist and none are duplicated.
- Not yet tested: browser visual QA, mobile screenshots of V9, real Android GPU, world 3D performance, external image availability or GitHub Pages publication.
- V9 World preserves V8.1 behavior, with an editorial dark-and-warm HUD and softer distance lighting. It remains a proof-of-concept (procedural WebGL and optional 2.5D fallback), not a photorealistic 3D world.

## Release blockers before selling a premium 3D store
1. Replace stock references with original photography or approved rendered showroom assets.
2. Improve world materials, grounded lighting, 3D asset pipeline and art direction. Then capture actual polished interactive-scene visuals.
3. QA Android, Safari, foldables and slow devices: WebGL/2.5D, hotspots, input and GPU usage.
4. Connect a lead endpoint with explicit consent/privacy handling, or publish verified business contact channels.
5. Integrate real inventory and payments only with production merchant configuration; current shopping interactions are illustrative demos.

No revenue or conversion claims without evidence.

## V9 architectural pass (2026-10-26)
- Underlying WebGL mesh now has theme-specific perimeter wall insets, ceiling ribs, recessed spotlights, coves, columns, warm inlaid floor guide tracks and richer visual backdrops for all five scenes.
- Decorative pendant fixtures are geometric torus rings rather than opaque discs.
- Mobile Lite Canvas2D renderer now projects equivalent architectural panels and ceiling beams, with warmer colors. It remains a stylized perspective fallback, not WebGL.
- Existing navigation, collision obstacles, product interactions, GLB fallback and basket logic were not intentionally modified.
- Isolated geometry checks: all five styles produced valid positive-sized boxes/cylinders and finite coordinates, within x ±13.74; ring quad samples were finite. Inline JS scripts parsed.
- The new root test script can be executed after checkout: node scripts/market-space/test-v9-visual-contract.mjs
- Do not interpret geometry/syntax tests as real browser visual QA, pixel parity, performance certification, photorealism, PBR or payment readiness.
