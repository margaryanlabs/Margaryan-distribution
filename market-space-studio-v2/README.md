# MARKET SPACE Studio 2.0 — Margaryan Labs

An independent, local-first beta merchant workspace. Does **not** touch INGU Shop, paid Vercel, or Railway.

### Implemented
- Create, select, duplicate and delete multiple store projects; client-side draft persistence in IndexedDB (localStorage fallback).
- Four retail verticals: food, fashion, beauty and home.
- Up to 30 sample SKUs per store, editable prices, emoji, stock and search, CSV import.
- PNG/JPEG/WebP photo uploads (<2.5MB each), recompressed and stored only in the user's browser.
- Four-zone floor-plan editor with assignments and room map (currently a **2D planning draft**, not WebGL geometry).
- Brand name, color and slogan; live responsive 2.5D visual preview.
- Backup/export and import of project JSON. Personalized 3D demo links connect to the existing /labs-studio/ engine (only first 6 food / 4 other products, without images or layouts).

### Privacy & scope
- **No user accounts, cloud database, orders, real stocks or payments.** Projects and photos remain only in the browser. Browser data can be lost; export JSON backups.
- The demo URL embeds names, colors and sample prices in reversible base64url (not encryption). Never put secrets or private product data in a share link.
- Uploaded SVGs and script files are rejected; image files are canvas-recompressed. UI text uses textContent.
- The 3D engine's existing fashion/beauty/home try-ons remain demo simulations, not camera/AR fitting.

### Testing
Chromium + Playwright DOM interaction tests performed at 1440×900 and 390×844: store/project navigation, create/duplicate/delete, SKU edit/add, CSV import, local image upload, four zones, export JSON and generated 3D URL decoding; no JavaScript page errors. The test sandbox blocks direct web navigation, so **real device WebGL, deployed end-to-end 3D and IndexedDB persistence across reload remain unverified**.

### Next
Authentication and tenant-scoped database, cloud media storage, true geometric floor-plan editing, real merchant inventory API, checkout integration, real-device QA.

Docs owner: Margaryan Labs · 2026-10-25.
