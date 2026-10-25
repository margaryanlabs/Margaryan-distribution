# MARKET SPACE V3 — synchronized Studio & Spatial Commerce

**Product:** MARKET SPACE by Margaryan Labs  
**Workstream:** visual upgrade and Studio-to-3D integration  
**Release:** independent beta paths `/studio-v3/` and `/labs-v3/`; no edits to INGU.

## What's new

### Studio cinematic preview
- A premium editorial storefront preview with locally bundled, recompressed generated visuals for Food, Fashion, Beauty and Home.
- Dynamic brand labels, selected merchandise, prices, responsiveness and client colors.
- Visual preview remains illustrative **2.5D**, not a claim of photorealistic WebGL assets.

### Spatial commerce link
- Studio's floor-planner offers three named arrangements: **Aisles**, **Gallery**, **Compact**.
- The `layout` and four bounded `zones` (text + SKU index) are included in a validated, reversible base64url public demonstration link.
- In the WebGL experience, preset layouts change placement and density of a subset of shelves/displays. This is not yet a freeform drag-and-drop interior editor.
- Section names render on four in-world sign materials; a **Departments** guide lists each zone and provides camera navigation inside the relevant scene.
- Merchant title, tagline, color and first 4–6 demo SKUs also continue to transfer.
- Different retailers reuse a common engine; independent merchant accounts and persistent cloud projects are future work.

## Demo URLs
- Studio: https://margaryanlabs.github.io/Margaryan-distribution/studio-v3/
- 3D preview: https://margaryanlabs.github.io/Margaryan-distribution/labs-v3/
- Previous versions remain unchanged.

## Validation performed
- JavaScript syntax check with Node.
- Playwright mobile (390 px) and desktop (1440 px) `set_content` tests for Studio rendering, selection of gallery layout, edited zone name, and decoding the generated URL: **passed**.
- Playwright WebGL-disabled fallback tests confirmed custom merchant brand, four navigable departments, category switching, mobile overlays and no page JS errors: **passed**.
- Manual screenshot review at 390px and 1440px.
- **Outstanding:** full GPU-based WebGL performance and visual checks on physical phones, IndexedDB persistence across real URL reloads and checking scene collision on all layouts.

## Security and honesty
- All inventory and prices are test data.
- Share links store a reversible JSON config; no private catalogs, biometrics, accounts or passwords belong in those URLs.
- No real payment, delivery, user accounts, AR try-on or AI model API are connected.
- Personal images and full catalog uploads remain browser-local and do not transfer to the 3D engine.

## Next iterations
1. Configurable furniture and store fixtures in separate asset bundles with LOD & mobile perf budgets.
2. Merchant-scoped auth/storage; upload, edit and version real 3D scene objects, with client permissions.
3. Sync more than four departments and map per-product positions.
4. Actual sales-flow integration and privacy/accessibility testing before B2B pilots.
