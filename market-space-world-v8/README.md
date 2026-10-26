# MARKET SPACE V8 — Interactive Lite fallback

Margaryan Labs · standalone virtual mall experimental release.

## User problem addressed

Some Android in-app browsers and devices refuse a WebGL rendering context. Previous releases showed a photographic backdrop while the shop interface remained visible, appearing broken.

## V8 behavior

- Keep full WebGL 3D path unchanged when the browser supports it.
- If a WebGL context is unavailable or the user opens `?mode=lite`, use a **separate Canvas 2D renderer** with perspective-projected aisles, store walls, floor grid, racks, shelf products and shopping zones. This is interactive 2D perspective, not WebGL or photorealistic 3D.
- Camera state drives both renderers, so tour, joystick, touch-look and shop switching remain functional in Lite mode.
- Provide a clear warning that WebGL is unavailable, then allow continued use with the interactive scene; static photo is the final fallback only if Canvas 2D also fails.
- Use a capped canvas device-pixel ratio and draw at reduced rate in Lite mode to help mobile performance.

## Live pages
- [V8 full / auto fallback](https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/)
- [Force Lite directly in grocery](https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/?mode=lite&world=food)

## QA performed in this environment

- Chromium Playwright `set_content` at 390×844 and 1440×900 with WebGL disabled, no unhandled JavaScript errors.
- `liteWorld` canvas renders at viewport size; photographic fallback opacity becomes 0.
- Switched all five sections (mall, food, fashion, beauty, home) while Canvas 2D remained active; no JS errors.
- Public GitHub Pages V8 URLs verified reachable with correct document title.

## Limits

- This improves compatibility but **does not make WebGL available** on restricted browsers.
- The Lite store is simplified 2D perspective with procedural walls and shelving, not a textured 3D engine. Real GPU WebGL and mobile interaction should still be tested on physical devices.
- All pricing, products and orders remain demonstrations; no customer data or payment handling.
- Older versions and INGU Shop remain unchanged.

Next: profiling on real Galaxy Fold/mobile browser; optimize 2D renderer, strengthen scene interaction hit testing and provide explicit user-selectable 3D/Lite switch.
