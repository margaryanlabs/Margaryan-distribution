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


## V10.2 — detailed commerce + mobile fallback (2026-10-26)
- Supermarket shelves show original, in-engine branded package labels and individual fruit leaves/stems (real meshes, selectively instanced across shelves).
- Fashion gallery now has physical leather handbags on sculptural plinths, with 3D handles and brass hardware.
- Living showroom now has reusable woven upholstery materials and fine piping at the front edge of sofa cushions.
- Customers can discover a nearby product from a contextual in-world card and open it without tiny hotspot precision; catalogue drawer wraps keyboard Tab focus.
- Director tours in Market and Beauty were moved off obstructed central axes.
- Quality toggle provides Auto/HD/Eco render pixel ratio. Sustained slow mobile FPS can reduce Auto resolution to retain interactivity.
- Critical no-WebGL UX: after a failed GPU module load or a timeout, a clearly-labelled reference photography gallery for all four store types appears and links to V9 Lite's interactive 2.5D fallback. This does not claim the moodboard shots are generated by the V10 3D engine.
- World logo returns to the matching V10 commercial landing page.
- 15 source and isolated geometry/route checks pass against the fetched GitHub branch. A simulated script-only gallery state test also passed for Beauty-to-Market switching and correctly constructed Lite URLs.

### Remaining blockers
- Real-browser screenshots and physical GPU/touch checks were not available. Source tests cannot certify shader render correctness or image fidelity.
- High-end production quality still requires licensed/commissioned GLB assets, physically based textures, proper environment lighting, profiling and a quality-assurance pass on several Android/iOS device classes.
- No real payment integration or checkout; product pricing is illustrative.


## V10.3 — visual grounding and GPU batching (2026-10-26)
- Grocery shelf merchandise now uses Three.js InstancedMesh keyed by base shape/material. Each carton/bottle keeps a per-instance product index so clicking the individual object still opens the correct demo product. This reduces WebGL draw calls compared with per-item mesh construction while preserving visible objects. One shelf's 50 products (100 mesh parts) were validated as 12 instanced groups with finite transforms; **real FPS gains were not measured**.
- Disposal now includes InstancedMesh GPU instance resources on store transitions.
- RoomEnvironment + PMREM is used for reflective studio illumination, surrounded by safe direct-light fallback if environment generation fails. This is physically inspired scene lighting, not a claim of photoreal lighting calibration.
- Shared radial contact-shadow textures ground mannequins, couches, groceries, produce displays and cosmetic islands even on phones without expensive shadow maps.
- Glass cosmetic bottles use reused clearcoat materials, reduced roughness and environment reflections.
- 18 offline static and isolated behavior checks pass. Browser screenshots, real WebGL availability, GPU profiling, actual materials and Android interaction remain unverified.

### Asset quality threshold for the premium commercial version
The existing four experimental V7 GLBs in /assets/v7/ were inspected. They are tiny models with a single mesh each (approximately 8–47 KB) and no image texture references. They may be suitable for a light procedural prototype, but they cannot credibly be marketed as professional photorealistic fashion/furniture assets. Real high-fidelity assets must be commissioned or acquired with explicit licenses, verified glTF/GLB PBR material channels, quality-controlled geometry and separate mobile LODs before replacing V10.3 showroom content.

Do not confuse GPU batching, clearcoat settings or enhanced lighting with verified final photography-level realism.

## V10.4 — Licensed GLB showroom examples (2026-10-26)
- Added optional Khronos GLTFLoader with two detailed PBR assets (third-party examples, not merchant inventory):
  - Sheen Chair: © 2020 Wayfair / Eric Chadwick, CC0-1.0, approx. 3.9 MB. https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair
  - Materials Variants Shoe: © 2021 Shopify, CC BY 4.0, approx. 7.8 MB. https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe
- Licenses and original creator credit are displayed in the interactive page via 3D-модели / источники. Retain attribution when using the Shopify model.
- Models are optional and load asynchronously after procedural stores render. Cached GLB instances are sized to exhibit plinths, linked to demo item cards, and retained safely across store switches. Old late results are rejected via a generation token.
- Desktop Auto and mobile HD load detailed examples. A link with query quality=high enables HD immediately on mobile. quality=eco and assets=off keep the light procedural version.
- Failed external GLB requests do not break the WebGL storefront or replace the ordinary models.
- This is a validated static integration path, not a proof of mobile GPU performance, real texture rendering, or commercial photorealism.
- Before production, use licensed commissioned brand merchandise assets, self-host optimized GLBs, implement LOD variants and data budgets, verify all PBR channels and test Android/iOS. Remote model files currently live on GitHub raw hosting.
- Example HD: /market-space-world-v10/?world=fashion&quality=high&preview=104
- Example Lite: /market-space-world-v10/?world=fashion&quality=eco&assets=off&preview=104

## V10.5 — mobile correctness and real device instrumentation (2026-10-26)

- Fixed detailed-model visibility when moving from HD to Eco and back: Eco actually hides source GLB clones and restores procedural displays, including on desktop.
- Raycast candidates are re-synchronized with the currently visible models, so an invisible expensive mesh cannot steal product taps; returning to HD restores the cached model without downloading it again.
- `quality=eco` prevents premium fetch on all devices. `assets=off` continues to be the hard disable override; mobile Auto defaults to procedural, HD explicitly allows detailed models.
- The 3D source credits expander includes the detailed-model state so the user can see loading, HD ready, or Eco fallback.
- Optional on-device diagnostics: append `&diagnostics=1` to any V10 URL. A small live HUD reports observed FPS, current render mode, WebGL draw calls / triangle count, allocated geometries and textures, device pixel ratio, and currently selected store. These are measurements made by the visitor's running browser, not independently benchmarked numbers.
- Fashion shoe exhibits and home chair displays now have accessible item hotspots. Keyboard `E` selects the nearest valid catalog hotspot instead of an arbitrary render group with missing item metadata.
- **25/25 offline source and isolated behavior contracts passed.** Quality state tests simulated desktop/touch HD ↔ Eco transitions and verified visible mesh and raycast target synchronization.
- Still pending: real Chrome/Samsung Fold/iPhone graphics QA, remote asset network timing, device FPS evidence and visually verified lighting. Do not market the preview as production ready.

### Direct QA URLs
- HD (detailed assets where available): /market-space-world-v10/?world=fashion&quality=high&preview=105
- Eco (always procedural): /market-space-world-v10/?world=fashion&quality=eco&assets=off&preview=105
- Mobile hardware diagnostics: /market-space-world-v10/?world=fashion&quality=high&diagnostics=1&preview=105

## V10.6 — interactive Style Studio and organic discovery (2026-10-26)

Instead of adding further glossy CSS-only decorations, this iteration adds **customer-facing interaction inside the actual 3D renderer**:

- A compact, mobile-adapted Style Studio panel within the existing World UI, accessible from the new "✦ Студия" navigation action.
- Three physically different lighting/exposure/environment presets: Gallery, Golden Hour, Noir. These adjust actual Three.js lights, fog, background and renderer tone mapping, not merely overlay colors.
- Five visual material options: Original, Linen, Rose, Sage and Graphite. Interactive swatches recolor real 3D garment shells, sleeves and sofa upholstery via per-mesh cloned PBR fabric materials. The Original mode preserves and can restore the showroom's varied initial garments.
- Reusable base shared fabric materials are never mutated by a client customization, avoiding cross-store and cache contamination. Per-object color clones are disposed by the already existing world cleanup.
- A share action creates an ordinary URL with exact store (world), lighting mood (mood), and selected palette (finish). Native mobile Web Share is used when available; else clipboard and manual copy. No account, analytics, tracking or backend persistence is added.
- A direct entry option `studio=1` opens the configurator on arrival, and the commercial landing page now promotes a real, editable showroom instead of relying only on portfolio moodboard photography.
- The main sales copy avoids claiming that live checkout is already available (cart and product pricing remain strictly illustrative).
- 29/29 offline static and isolated behavior contracts passed, including generated 3D mesh material color cloning, reversible swatches and non-compounding lighting intensity.
- **Still not verified:** actual Android/Safari GPU rendering, visual fidelity, FPS, mobile browser native sharing success, and all 3D content transitions. Keep draft and solicit real device QA before commercial promotion.

### Direct previews
- Fashion original: `/market-space-world-v10/?world=fashion&preview=106`
- Interactive golden-hour outfit designer: `/market-space-world-v10/?world=fashion&mood=golden&finish=rose&studio=1&preview=106`
- Living sage showroom: `/market-space-world-v10/?world=home&mood=gallery&finish=sage&studio=1&preview=106`
- Sales site: `/market-space-showcase-v10/`
