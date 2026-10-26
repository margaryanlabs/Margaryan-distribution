# MARKET SPACE 8.0 — Canvas Compatibility World

**Margaryan Labs · 2026-10-26**

## Problem
On certain Android in-app browsers and older GPU setups, WebGL context creation is denied. Previous fallback showed a background photo under 3D controls. This looked like a broken static site and the user could not meaningfully walk through the environment.

## V8 fix
- A **Canvas2D perspective compatibility renderer** works without WebGL. It renders dynamically projected floors, corridors, store fixtures, shelves and selected product markers instead of just a background photograph.
- The camera and geometry update on each frame from the existing on-screen joystick, drag-to-look and **▶ Прогулка** tour.
- Existing shop navigation (mall/grocery/fashion/beauty/home), product selection, demo cart, studio-configurable floor plan, and WebGL asset loader stay in place.
- When WebGL works, the full WebGL renderer is still preferred. When unavailable, canvas mode automatically replaces it with clear diagnostic text and no need to install an app.
- A final atmospheric image-only fallback remains if **both** WebGL and Canvas2D are blocked.

## QA performed
- Both inline JavaScript sections passed Node.js syntax checks.
- Browser screenshots captured for 1440px and 390px displays, grocery and mall modes, with autoplay tour. The 390px grocery compatibility screenshot showed rendered shelves and aisle perspective rather than a static photo.
- Source committed to isolated V8 GitHub branch; live GitHub Pages V8 HTML verified publicly reachable with version-specific title.
- V7 and INGU are unchanged.

## Important limitations
- Canvas2D is a **software perspective approximation**, not photorealistic WebGL, and does not render original GLB assets or GPU lighting. Its moving shelves are for navigation, not 1:1 representation of production stock.
- 3D rendering and real-device hardware performance on the owner's Android are **not independently verified**. Embedded browsers vary in Canvas2D and event support. Check the live V8 link on the affected device.
- Demo only, no live commerce, payment, orders or customer media.

Preview: https://margaryanlabs.github.io/Margaryan-distribution/labs-v8/
