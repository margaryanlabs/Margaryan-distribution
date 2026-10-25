# MARKET SPACE V7 — GLB Asset Edition
**Margaryan Labs · experimental B2B virtual retail world (26 October 2026)**

This is a separated, non-production visual R&D release. **INGU and V6 remain unchanged**.

## What is actually new
- Four **real, self-produced glTF 2.0 / GLB binary 3D meshes**, checked into `assets/v7/`:
  - `sofa_atelier.glb` (352 triangles) — upholstered sofa, cushions, metal legs;
  - `mannequin_atelier.glb` (724 triangles) — display mannequin, dress, plinth;
  - `beauty_island.glb` (1,276 triangles) — premium cosmetic counter and bottles;
  - `produce_island.glb` (2,244 triangles) — produce kiosk and fruit baskets.
- A self-contained, dependency-free **GLB2 parser** in World V7 supports glTF POSITION and COLOR_0 vertex attributes and indexed triangle meshes, with strict bounds for file size, accessors and vertex count. Other advanced glTF features are intentionally unsupported.
- Async `fetch` loads models from the same GitHub Pages origin and rebuilds the existing WebGL mesh once assets arrive. If a request fails or WebGL is disabled, the prior procedural object remains.
- The World scene uses imported meshes to replace a subset of fashion mannequins, beauty islands, home sofas and grocery display podiums. These are *mesh assets*, not screenshots or cube billboards.
- V7 Studio stays compatible with the V6 merchant features and opens `/labs-v7/` when previewing a configured store.

## Public demos
- [3D World V7](https://margaryanlabs.github.io/Margaryan-distribution/labs-v7/)
- [Studio V7](https://margaryanlabs.github.io/Margaryan-distribution/studio-v7/)

## Usage
- Open World V7 in Chrome; wait for the 3D models to load (status text shows `GLB ASSETS LOADED` when available).
- Visit **Fashion**, **Beauty**, **Home**, or **Food**; these sections use the new mesh assets.
- `?assets=off` disables external assets and restores old procedural decorations; `?quality=lite` lowers procedural decoration detail for mobile.
- A real product catalogue, fashion garment drape simulation, body measurements, checkout and cloud media storage are **not** part of this release.

## QA and limitations
- All four original binary assets were exported and parsed; Node-based geometry tests confirmed indexed triangles and normalized vertex colors.
- JavaScript static syntax validated for Studio and World with `node --check`.
- Dedicated WebGL-buffer smoke test confirms imported models add **1,056, 2,172, 3,828 and 6,732 vertices** respectively, with all finite component values (11-float vertex format).
- Public GitHub Pages availability must be confirmed separately because static publication may lag commits.
- **Unverified:** real GPU WebGL shader compilation and lighting/visual quality on Android, iPhone, desktop browsers; device bandwidth and frame performance. The automated headless environment does not expose WebGL. Do not advertise a fully tested photorealistic build.
- Models are newly authored stylized low-poly geometry and do not accurately represent manufacturer SKUs. All prices, fitting, cosmetics and sales flows are demos.

## Next engineering steps
1. End-to-end device testing of asset fetching, rendered models, mobile tour and input, and benchmark FPS/memory.
2. Implement full glTF node transforms, proper PBR materials and GLTFLoader-compatible asset import as a modular TypeScript package.
3. Create a higher-detail curated asset library, optimize LOD and compression, and build asset-driven configurable store templates.
4. Introduce authenticated seller catalogs and hosted media only after privacy and data contracts are verified.

Owner: Margaryan Labs. This project must remain independent of INGU Shop.
