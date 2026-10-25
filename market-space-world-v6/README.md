# MARKET SPACE 6.0 — Visual Lab
Margaryan Labs · October 26, 2026

This is an **isolated V6 visual experiment**, preserving all previous demo versions and leaving INGU Shop unchanged.

## Live previews
- [Studio 6 — Design & Materials](https://margaryanlabs.github.io/Margaryan-distribution/studio-v6/)
- [World 6 — Visual Lab](https://margaryanlabs.github.io/Margaryan-distribution/labs-v6/)

## V6 changes

**World (WebGL1)**
- Vertex formats extended from `position(3) + tint(3) + atlas UV(2)` to include **per-face normal(3)**, with compatible stride and shader attribute updates.
- New WebGL1 fragment shader: directional + fill lights, soft overhead warmth, specular-style highlights for floor surfaces, mist/scene depth and restrained color grading. This is an artistic raster effect, **not** physically based HDR/PBR.
- Untextured primitive default material moved to an unused solid-white atlas tile; fixes accidental branding texture repeat on walls/furniture.
- Lightweight elliptical cylinders and ellipsoids generate *real curved geometry*, controlled by `?quality=lite` for a lower polygon-count option.
- Extra 3D installations: mall planters/lounge/lights; grocery refrigeration and fruit podiums; fashion dress displays, hanging lights and fitting-room mirrors; cosmetic sample bottles and vanity stations; upholstered silhouettes, tables, plants and lamps for home.
- Existing mobile joystick, auto-tour, product picking, cart, Studio photos, validated fixture positions and shop zones retained.

**Studio**
- Three selectable, persisted lighting styles: `daylight`, `warm`, `gallery`. The selection changes the Studio visual preview and is included as validated demo config for the matching 3D world.
- Merchant name, color, SKU photos (same-origin local browser only), floor planner, project storage and export remain unchanged.

## Demo scope & limitations
- These are experimental low-poly/procedural 3D retail environments. **Not** photorealistic production scenes or external GLB assets.
- Store articles, stocks, prices, try-ons and checkout are demonstrative; no real transaction, order, camera-based AR, or seller account.
- Product images are still browser-local; public sharing does not upload photos. The `studio` parameter is reversible base64url, not encrypted. No secrets or private catalog data should be shared in URLs.
- Most in-store object details are decor, not separate movable inventory items.
- Source stays in this temporary lab repo until ready to extract into a dedicated Margaryan Labs project.

## Verification completed
- JavaScript syntax checked with Node for Studio + World scripts.
- Headless Chromium `set_content` at **1440×900** and **390×844**: merchant lighting selection, persistence into encoded URL, linked target path, and scene switching mall/grocery/fashion/beauty/home without page JS errors.
- Node geometry smoke test on all five worlds: generated **46,872 / 94,632 / 42,990 / 65,892 / 62,748 vertices**, with normalized attributes / finite positions, correct 11-float vertex format and material atlas coordinates.
- Published URLs verified publicly reachable and correctly titled.

**Known QA gap:** the headless browser environment does not expose WebGL. Consequently the new shader has not been compiled or visually inspected on an actual WebGL device. Do not claim hardware rendering/performance success until verified on Android Chrome and at least one desktop WebGL GPU. The fallback stays available.

## Next priorities
1. Real Chrome/Android GPU QA and shader fallback, LOD budgets and collision review.
2. Source-controlled, licensed GLB asset packs with a glTF pipeline for shelves, racks, garments, bottles and sofas.
3. Spatial scene editor with arbitrary display types and placement constraints.
4. Merchant catalog and image cloud storage behind authenticated tenants, followed by order integrations.
