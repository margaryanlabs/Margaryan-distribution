# MARKET SPACE V8 · Interactive Lite Compatibility Mode
**Margaryan Labs / Independent demo / 26 October 2026**

This release addresses the Android browser screenshot where the WebGL context failed and the virtual mall displayed **a static background photograph** despite active shopping controls.

## New rendering behavior

1. On full WebGL support, continue using the existing 3D renderer, four GLB model files, lighting, and walkable navigation.
2. When creating a WebGL context or compiling/linking its shaders fails, automatically switch to a **separate Canvas 2D renderer** on `#liteWorld`. The software perspective renderer builds floors, aisle grid, shelf structures, colored product packs, signage, rooms, product markers, and visual depth from the live scene's collision obstacles and hotspots.
3. Existing camera position/yaw/pitch, touch joystick, mouse/touch drag, guided tour, world switching, product proximity, 4 vertical sector modules, cart and catalog continue to run without WebGL.
4. Compatibility notification has been moved from a large center blocking panel to a smaller top banner. The banner can be dismissed. The UI announces **interactive 2D** and the reason is kept in a local title for diagnostics, rather than asserting the browser alone caused the issue.
5. `?mode=lite` is a deterministic troubleshooting and QA switch to force the 2D walkable renderer, even if WebGL is normally available.
6. The canvas renderer is capped at 1.35 device-pixel ratio and drawn every second animation frame (~30 FPS maximum) for low-end devices. On WebGL context loss, the fallback renderer activates instead of leaving a blank scene.

## Public test pages

- World: https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/
- Studio: https://margaryanlabs.github.io/Margaryan-distribution/studio-v8/
- Force 2D: https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/?mode=lite
- Previous GLB world remains: /labs-v7/.

## QA performed

- Both pages' inline scripts passed a JavaScript syntax check (Node VM).
- Playwright Chromium `page.set_content` with forced lite renderer at 390×844 and 1440×900 successfully instantiated the separate 2D canvas, rendered non-empty RGBA pixels, visited grocery sector, ran automatic tour, opened catalog, and reported zero JS page errors.
- Mobile/desktop screenshots were reviewed: unlike V7, the fallback shows **perspective shelves that change with camera position**, not a static backdrop.
- Remote GitHub Pages availability and live-user Android/WebGL still require separate verification.
- This is **software-projected 2.5D**, not native WebGL3D; it intentionally has simplified materials, geometry and no advanced GLB lighting when WebGL fails. The earlier photorealistic photo is only a last resort if even Canvas 2D is disabled.

## Open issues
- The Canvas renderer does not use exact GLB mesh geometry or render real uploaded product image textures. Simple product pack colors and emoji billboards provide navigation context.
- Texturing/perspective composition and performance may differ across Android WebView, Chrome and Samsung Internet.
- GPU WebGL compilation and context loss need hands-on device QA before production use.
- No real products, prices, payment or merchant backend. Fitting scenes remain stylized demos.

## Release boundaries
Only new `market-space-world-v8/` and `market-space-studio-v8/` experiments; do not modify INGU Shop or overwrite V7. The full asset pack remains under `assets/v7/` on the same GitHub Pages origin.
