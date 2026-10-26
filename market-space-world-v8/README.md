# MARKET SPACE V8 — Canvas2D compatibility walkthrough

A **Margaryan Labs** experimental mobile compatibility version. INGU and earlier versions remain unchanged.

### Problem addressed
On some Android in-app browsers, WebGL is unavailable, causing the V7 storefront to show a static photo and a warning. V8 uses a separate `<canvas id="liteWorld">` renderer when WebGL initialization fails instead of relying on the static image fallback.

### Added in V8
- Frame-based **Canvas2D perspective renderer** draws ceiling/floor, shelf aisles, merchandise shapes and location transitions. The scene camera follows the existing joystick, touch gestures and autowalk rather than moving a photograph.
- Runs in the same four shop scenes (food, fashion, beauty, home) and the atrium, retaining catalog, basket and UI interactions.
- An optional `?mode=lite` forces the Canvas2D renderer on WebGL-capable browsers for comparison and troubleshooting.
- A compatibility notice distinguishes graphics modes; if Canvas2D also fails, the earlier atmospheric photo remains.
- Keeps WebGL and V7 GLB loading as normal for browsers with functioning GPU.

### Live
- [V8 — normal auto-detection](https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/)
- [V8 — force Lite mode](https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/?mode=lite)

### Checks and limitations
- JS static syntax: `node --check` passed.
- Canvas renderer snapshots were generated for mobile and desktop in this development environment; exported UI and movement snapshots were inspected.
- Public URL was fetched with the expected V8 title, proving publishing. **Not yet independently verified** end-to-end on the user's Android device or across all embedded WebView variants.
- Canvas2D is deliberately **stylized pseudo-3D**, not hardware accelerated 3D or photorealism. True WebGL stays preferred whenever available.
- No new accounts, payment processing, cloud catalogue, external media upload or real inventory.

Status: beta; keep V7 intact for comparison.
