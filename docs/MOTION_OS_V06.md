# MARGARYAN MOTION OS v0.6 — Portfolio-first Creative Intelligence

## Why this release
Motion OS must not lose an active Margaryan Labs product simply because it was not on a short static template list. This update incorporates:
- **TUN (formerly AURA LifeOS)** — goal-first real-estate decision intelligence. Original source: `aura-lifeos-guide` (private); the current product is **TUN**, not a separate public listing marketplace.
- **HAY Engine** — Armenian-first speech, language and creator technology. Its current project logo mark is derived from the actual React `components/HayLogo.tsx` markup, and the active source CSS defines `#D9FF63` / `#090A0B`.
- **Reality Engine** — scenario/Monte Carlo/second-order-effects decision support; **its current repo describes a demo/single-browser MVP**, not connected enterprise data.

This makes **13 named Motion OS brands**. General Realty is not automatically relabeled Zenith/TUN or introduced as if it were a Margaryan Labs internal product; repo names do not prove marketing ownership. Alias decisions need source review.

## Verified versus component-derived artwork
- HAY Engine brand artwork under `public/motion/brands/hay-engine.svg` extracts the same mark paths from its actual React source, with color grounded in source CSS; no image diffusion.
- TUN's active `BrandMark.tsx` is a nested CSS circle/light mark rather than a single repository SVG. The `tun-component-preview.svg` is reconstructed from that component **for preview only**; it is explicitly marked `component-derived` and remains pending visual sign-off.
- Reality Engine has no approved logo asset in the currently reviewed repo tree: use truthful typography fallback rather than inventing a symbol.
- Never publish a clip as brand-final if required mark, marketing facts or legal permissions have not been reviewed.

## Original three-language campaigns
`lib/motion/special-campaigns.ts` contains seven individually authored cinematic shots for TUN, HAY Engine and Reality Engine in English, Russian and Armenian. Unlike reusing generic slogans, each campaign follows a real differentiating story:

TUN: which property? → what is the user's goal? → person-first → risks/trade-offs → curated choices → reveal → action.

HAY: Armenian is not a fallback → pronunciation and meaning → Armenian-first creation → language to media → preserve names/numbers → reveal → action.

Reality Engine: decisions branch → base/bull/bear/stress → scenarios → second-order effects → uncertainty → reveal → risk-aware action.

All data visuals are illustrative, never described as live provider readings, guaranteed financial results or evidence of user outcomes.

## Visual review at a real frame level
The new `reviewMotionVisuals` routine renders real sampled frames **in-browser** across every shot. It:
1. Preloads the allowlisted brand artwork.
2. Samples a middle and near-exit frame for sufficiently long scenes.
3. Measures pixel transparency/contrast to flag possible blanks.
4. Heuristically flags unusually similar adjacent shot frames.
5. Generates an annotated, four-column PNG contact sheet for human art direction.

The Studio now has **REVIEW ALL SHOTS / CONTACT SHEET**. It downloads a shareable review PNG (not proprietary font files). The report is not a guarantee that the film is beautiful, a translation is accurate, or third-party content is licensed.

## Missing-product detection and protected workflow
`npm run motion:discover -- margaryan-labs margaryanlabs` enumerates accessible GitHub repositories and saves a **local** proposed-review manifest under `out/motion/portfolio-review.json` (ignored by Git). Unmatched repositories become review candidates; they do not automatically become public marketing campaigns.

Use scoped `GITHUB_TOKEN` only inside an operator environment; an unauthenticated Motion Studio cannot read private repos. Missing candidates should prompt an owner to verify the new product's correct name, repo identity, current design, brand mark and legal permission before publishing. This safeguards against abandoned demos and renamed projects.

## Future premium-grade production gates
The existing offline H.264 renderer remains in `scripts/motion/render-master.mjs`. Per-film full production QA still requires:
- operator Chromium + FFmpeg processing and inspection of the final encoded file;
- checking Armenian font/glyph rendering in **actual rendered frames** (no generated-language image text);
- voice duration alignment and listening tests;
- authentic approved source visuals;
- human director approval for creative quality;
- frame sampling at hook, midcuts and final logo hold.

No new paid video AI keys, Supabase tables, credential disclosures or unreviewed external publishing were introduced.
