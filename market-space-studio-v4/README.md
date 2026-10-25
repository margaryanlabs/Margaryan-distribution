# MARKET SPACE 4.0 · Margaryan Labs

**Experimental, isolated release**. No production INGU changes. No credentials, payment gateway, user accounts or cloud-hosted merchant assets.

## Two connected applications

- [MARKET SPACE Studio 4.0](https://margaryanlabs.github.io/Margaryan-distribution/studio-v4/) — local-first multiple merchant projects, 30 editable catalog items, photos (resized JPEG data URL) stored in same-origin IndexedDB, brand/colors, CSV, layout editor, JSON backup and shop preview.
- [MARKET SPACE World 4.0](https://margaryanlabs.github.io/Margaryan-distribution/labs-v4/) — spatial WebGL virtual mall / grocery / fashion / beauty / home, demo cart, product selection, local store photo atlas, sector signage and navigation.

## What improved vs V3

1. **Local WebGL media:** Studio's **«Посмотреть настоящий 3D-мир»** button saves a snapshot and opens `/labs-v4/` with a local project identifier. On the *same browser + origin*, World reads matching first 6/4 SKUs and limited JPEG/PNG/WebP data URLs from IndexedDB. Loaded product photos are drawn onto the 2048×2048 GPU texture atlas in the relevant fixed product/material slots, and appear in grocery product cards/cart. It does not fetch remote image URLs.
2. **Shelf planogram:** Studio's assignment of one preferred SKU to each of four zones now affects highlighted products on corresponding grocery shelves, rather than only text in the zone map and overhead banners.
3. **Floor visual:** Subtle guided aisle lights and improved Studio preview; 3 floor templates (`aisles`, `gallery`, `compact`) still supported.
4. **Private vs public demo:** Copying a link gives *public catalog text and 3D settings only*; the local-project token is not included. Opening the in-editor preview adds `localProject` to the URL. This **is not access control**. Nothing in demo URLs should be confidential.

## Important technical limitations

- Browser data, including photos, remains **on that device**. It is not available to someone who opens a public link from another computer. Images and selected catalog layouts are not uploaded to the server.
- Images appear on basic boxes as textures, not faithful GLB meshes or true 3D packaging. Scenes are stylized prototypes; not photorealistic.
- Only the first six food or four other-sector catalog items are embedded in the WebGL demo (to preserve the current atlas material layout); Studio allows up to 30 local SKUs.
- Layout choices are templates. Free drag-and-drop 3D equipment placement is not implemented.
- Fashion/beauty/home fitting is simulated. No camera, AR, biometric processing, inventory sync or checkout.
- WebGL may be disabled on older phones or embedded browsers; atmosphere/fallback scene remains.

## QA

- Valid JavaScript syntax checked with `node --check` in both pages.
- Headless Chromium `set_content` at 1440px and 390px: Studio/dashboard/planner and World loaded without JS exceptions, 3 floor template buttons shown. GPU/WebGL unavailable in test environment — fallback mode used.
- Node VM unit checks for local photo bridge: accepting only matching local project/media, rejecting unrelated records or invalid image URLs, rebuilding texture atlas when valid photos are available. Shared world links strip localProject key.
- **Not fully tested:** real-device WebGL render, hosted end-to-end browser interactions and photo persistence across app/browser restarts, due to browser network/navigation restrictions of the testing environment.

## Manual pilot walkthrough

1. On Chrome, visit `/studio-v4/`, choose or create a store.
2. Open **Каталог**, upload a JPEG/PNG/WebP picture for one of the *first four/six* products.
3. Go to **План зала**, change layout and featured item for each zone.
4. Click **Посмотреть настоящий 3D-мир** while on the same device/browser. Inspect shelves and catalogue; look for “ЖИВЫЕ ФОТО ИЗ STUDIO · ЛОКАЛЬНО”.
5. Copy **public** demo URL and open it in private browsing: names and prices should remain, uploaded images should not be present.

**Roadmap:** dedicated codebase, authenticated tenants, managed object storage, catalog feed, custom GLB/geometry, mobile optimization and pilot telemetry.
