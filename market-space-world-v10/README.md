# MARKET SPACE WORLD V10 — rebuild prototype

Built as a new isolated static browser experience in the existing Margaryan Distribution repository; V9, older previews, and INGU Shop are untouched.

## What genuinely changed
- Three.js r0.186 WebGL 3D engine with physically lit rough/metal materials, tone mapping, soft shadows on non-mobile devices, colored backlighting, actual depth-geometry and custom procedural stone textures.
- Five-meter-tall architectural interiors, branded gallery signage, cornices, spotlights, luminous rings and varied finishes.
- Fashion: actually modelled 3D garments (extruded tailored body panels, sleeves, lapels, buttons and fabric skirts), mannequin bodies, suspended clothing on rails, display podiums and mirrors. Meshes are stylized bespoke procedural models, NOT production-grade scanned cloth simulations or skinned apparel meshes.
- Living: upholstered rounded sofas and cushions, modular living sections, lamps, wood/stone tables, potted plants and armchairs.
- Beauty: 3D glass/metal flacons, serum bottles, cosmetics display islands.
- Market: per-item real 3D cartons, cylinders and shelves, produce islands, refrigerator wall elements.
- Walking: touch drag to look, virtual mobile joystick, WASD/arrow keys, collision around main center objects, cinematic camera fly-through, catalog and hit-testable product markers with a local demo cart.
- Production safety: no paid services, no database, no payments, no real merchant inventory, no unconsented user information, no production changes.

## Preview
- V10 interactive world: /market-space-world-v10/?world=fashion
- V10 storefront: /market-space-showcase-v10/
- CDN loading uses the pinned three.js 0.186.0 ESM package via jsDelivr; online connectivity is required on first visit. Failed WebGL/module loading visibly exposes a link to the known V9 prototype.
- Legacy low-resource mode is linked to the existing V9 Canvas2D Lite renderer. V10 itself does not falsely claim a CPU-rendered version of these same detailed meshes.

## Limits — must remain explicit
- Geometry is significantly more detailed than V9 but still procedural. Photoreal clothing needs original licensed GLB or glTF assets, physically based fabric textures, real-world lighting calibration, and extensive art direction.
- No claims of Android performance, real texture quality, universal WebGL availability, realistic cloth simulation, actual purchase handling, or 100% interaction test coverage.
- Run the static source contract at scripts/market-space/test-v10-world.mjs, browser/physical device QA and visual accessibility test before advancing from draft.


## V10.1 — model and interaction quality pass (2026-10-26)
- Replaced mostly flat garment extrusion silhouettes with smoothly shaded ring-mesh 3D garments: separate jacket/coat/dress profiles, tapered sleeves, scarf-like lapel panels, seams, brass buttons, a structured waist and restrained skirt pleating.
- Rescaled and anatomically realigned mannequin bodies and dress hems. Original scene selection continues to work.
- Reusable fine procedural woven bump map for textile fabrics, no externally fetched garment textures required.
- Click or tap **the actual geometry** of mannequins, furniture, beauty islands, produce islands and grocery shelves; hovering marker spheres alone is no longer mandatory.
- Collision map now tracks approximate actual display footprints, resolving horizontal axes separately so visitors cannot simply clip through display tables and sofas.
- Shop switches reclaim transient geometries, materials, texture maps and light shadow maps, while caching reusable finishes.
- The cinematic tour now interpolates via per-category directed route keyframes, starting from the visitor's current position, without hard resets. Manual joystick/WASD movement is smoothed.
- Mobile WebGL resolution automatically drops once after sustained low FPS; on a non-WebGL browser, the existing V9 2.5D link remains available.
- Rebalanced exposure and light intensity to reduce blown-out whites while keeping premium warm interior highlights.

### QA and honesty
- 10 offline source contracts executed against the actual GitHub source (JavaScript parse, categories, geometry, interactive routes, collisions, static accessibility, fallback).
- Isolated garment ring geometry created 160 finite vertices and 280 triangles; collision and route samples passed.
- These tests do **not** verify real visual quality on physical phones or browsers. Automated external browser QA remains unavailable. Keep V10.1 draft until actual device reviews and load tests.
