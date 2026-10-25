# MARKET SPACE V5 — Free-placement Floor Engine

**Margaryan Labs · experimental preview.** Independent of INGU Shop, without Railway, paid hosting, checkout or a production merchant account.

## What works

- **Studio 5** — `/studio-v5/`: persistent local multi-store drafts, product photos, 30-SKU catalogue, color/branding and three floor templates inherited from V4.
- On **food** store floor plans, the new SVG planner lets a merchant drag individual racks with mouse or finger, nudge with arrow keys when focused, add racks, remove the selected rack, or reset to layout defaults. Displays aisle and entry clearly.
- Rack centres use a 0.5-metre grid; at most 14 racks. A protected central aisle, clearance from outer walls and mutual fixture overlap are validated before edits are saved.
- Plans are stored in each local merchant project's `fixtures` collection, survive normal draft reloads through the existing local IndexedDB storage, and are included (only X/Z numbers) in shareable product-demo URLs.
- **World 5** — `/labs-v5/`: validates fixture coordinates again before generating grocery shelving meshes, collision obstacles and product interaction hotspots in the 3D scene. An invalid or malicious layout falls back to a built-in template.
- WebGL grocery visual pass: lighter racks, illuminated trim and product-edge strips; existing catalogue and local product photography connection retained.
- Other sectors (fashion, beauty, home) retain the existing V4 template worlds and stylized try-on, not arbitrary free layout. The public link still shares sample names/prices: **never include confidential catalogue data**.

## Preview workflow

1. Open [Studio 5](https://margaryanlabs.github.io/Margaryan-distribution/studio-v5/) on Chrome.
2. Create/select a **food supermarket** project, select **«План зала»**.
3. Drag a rack into a free position or use arrow keys. Add/delete fixtures and switch templates.
4. Press **«Посмотреть настоящий 3D-мир»** to open personalized [World 5](https://margaryanlabs.github.io/Margaryan-distribution/labs-v5/). To view someone else's configuration, use the generated public share URL.
5. Try returning to Studio to adjust featured products and upload images. Local images only work on the same browser/origin; public links carry no images.

## Test results

- Node.js syntax checks for both HTML scripts passed.
- Playwright Chromium in an isolated `set_content` test passed desktop 1440×900 and phone 390×844 UI initialization with zero JS page exceptions, rack movement (e.g. X -8→-6.5), add/delete, three templates (8/6/12 racks), mobile layout.
- Node VM isolated tests passed validation of fixture arrays, collision/central aisle checks, invalid/too many/range-violating fixtures.
- Public GitHub Pages URLs verified to serve Studio 5 / World 5 HTML with correct titles.
- **Still unverified:** actual GPU/WebGL rendering on Android/iOS, full hosted end-to-end path and refresh persistence. The test browser disables WebGL. Rendering precision and layout performance must be checked with a real device before B2B pilot.

## Architecture and roadmap

- **Current:** self-contained HTML, client-side local-only prototypes in this temporary Margaryan Labs development repository.
- **Next:** extract to its own repository; shared TypeScript layout schema and geometry engine; true tenant database and media storage; safe asset pipeline for realistic GLB shelves and packages; server-issued public shop links; device/performance/accessibility tests; checkout and analytics only when production-ready.
- Demo visuals are simplified geometry, **not** photorealistic scans or a real AR fitting room. No real transactions or delivery.

Preview implementation is isolated under `market-space-studio-v5/` and `market-space-world-v5/`; prior V3/V4 previews are preserved on GitHub Pages.
