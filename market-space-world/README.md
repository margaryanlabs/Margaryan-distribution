# MARKET SPACE · by Margaryan Labs

**Product:** Immersive commerce platform for brands and retailers.  
**Positioning:** One spatial commerce engine, multiple retailer experiences, tailored to the merchant’s catalog and identity.  
**Scope:** This directory is an isolated prototype within a temporary development repository. It is **not** an INGU Shop feature.

## Live concept (2026-10-25)

- One interactive virtual mall / hub with destinations: grocery, fashion, beauty, home.
- Real-time WebGL rendered interiors when supported; atmospheric image fallback otherwise.
- Navigation via touchscreen joystick/drag, keyboard, or automated walkthrough.
- Interactions: grocery product cards, clothing outfit/size/color selection, beauty tone simulation, room setting simulation.
- Cross-store demo cart now records **selected variants**, displays them in basket, updates prices when selected SKU changes, and persists during the session.
- Links to share an individual section using `?world=food|fashion|beauty|home|mall`.
- Margaryan Labs branding and in-world company panel, with privacy-respecting **session-local** counters for section visits, item views and cart additions.
- Rule-based assistant scripted showcase, not connected to a language model.
- All merchandise, prices, inventories, discounts and checkouts are demonstrative. No actual orders or payments.

## Intended B2B offer

The **MARKET SPACE Engine** supplies shared navigation, rendering, catalog/cart and merchant configuration. Vertical-specific modules extend the engine:
1. **Food Space:** storefront aisles, grocery catalog, recipes, delivery slots, substitutions (future).
2. **Fashion Space:** outfits, variants, size recommendations, virtual fitting (currently a stylized simulation; real try-on is future R&D).
3. **Beauty Space:** color exploration, routine builder, camera-driven trial by consent (future).
4. **Home Space:** configurable sets, spatial room design, accurate measurement and AR placement (future).

**Monetization hypotheses (not validated):** one-time tenant setup + license/support; bespoke enterprise add-ons.

## Release boundary & development

- This project lives within `market-space-world/`; do not merge into unrelated apps.
- Keep any public demo separate from production systems and clearly label simulated capabilities.
- Do not collect biometric images or use camera permissions until consent, retention, and privacy safeguards exist.
- Treat demo usage counters as local instrumentation, not evidence of conversion lift.
- Do not represent WebGL device QA as complete until tested on real Android/iOS and low-end GPUs.

## Next engineering milestones

1. Extract the single-file demo to a dedicated repository and make a modular `renderer / tenants / catalogs / cart / config` architecture.
2. Add a merchant config panel: tenant name, branding, store layout, SKU feed & inventory sync; validate data contracts.
3. Connect one pilot catalog with a fast 2D fallback and compare conversion/retention against the 3D experience.
4. Upgrade 3D assets and LOD/performance, and build real try-on/AR only as separate opt-in modules.
5. Run mobile visual/performance QA, payment security review, and accessibility testing before real orders.

## Checks performed

Standalone syntax validation using Node.js and Chromium Playwright interaction flows at desktop (1440px) and mobile (390px). Validated wardrobe variant, beauty and furniture variant selections, basket totals, and Margaryan Labs panel. Test browser blocks WebGL; visual GPU QA on actual mobile remains open.

© Margaryan Labs — MARKET SPACE concept and prototype.