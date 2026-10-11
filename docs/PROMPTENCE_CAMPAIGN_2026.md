# PROMPTENCE — 2026 CAMPAIGN / THE ANSWER IS THE NEW FRONT PAGE

**Length:** 36.5 seconds. **Shots:** 8. **Primary format:** 9:16. **Languages:** EN / RU / HY (HY copy needs native proofreading). **Product URL:** https://promptence.tech.

This is a separate *Director's Cut* of the original Promptence Signature Film, not a replacement for the 33.8-second original or a Higgsfield/Quick Studio film.

## Native Motion OS workflow
Open `/motion?mode=cinematic` and select **PROMPTENCE CAMPAIGN / 36.5 SEC**. The client uses `createPromptenceCampaign()`, the original eight-shot signature artwork/approved Promptence logo, local original score, reference review, director QA, subtitles and export.

A portable English project is checked in at `editorial/motion/promptence-2026-36s-directors-cut.motion.json` and can be imported through the existing Studio project editor without the new button.

A stateless endpoint is available at `GET /api/motion/signature?cut=campaign&lang=en&format=portrait`, with `cut=original` preserving the old behavior.

For local **real Chromium-to-FFmpeg** workstation mastering, start the Next application locally and use:

```bash
npm run dev
npm run motion:signature -- --cut campaign --lang en --format portrait --out out/promptence-campaign-36s.mp4
```

As always, this native export is **not certified** until Playwright Chromium, FFmpeg and the rendered artifact pass manual review on the workstation. The GitHub/Vercel build alone is not video-production validation.

## Film beats
| Seconds | Movement | On-screen copy |
|---|---|---|
| 0.0–4.3 | Search portal, physical depth and lens motion | THE FRONT PAGE HAS CHANGED |
| 4.3–8.5 | AI question surface, buyer-intent camera motion | YOUR CUSTOMER ASKS AI |
| 8.5–12.9 | Missing-mention illustration | WHAT IF THEY NEVER SEE YOU? |
| 12.9–17.4 | Signal/source constellation and scan beam | MAKE THE INVISIBLE VISIBLE |
| 17.4–22.3 | Three operating-system stages | DISCOVER. MEASURE. DIAGNOSE. |
| 22.3–27.0 | Evidence-to-verification loop | FROM SIGNAL TO ACTION |
| 27.0–31.3 | Re-measure illustration without fictitious delta | MEASURE AGAIN |
| 31.3–36.5 | Official Promptence mark, call to action | BE PRESENT IN THE ANSWER / PROMPTENCE.TECH |

## Separate offline concept master
A separately authored **36.5-second playable H.264/AAC MP4** was produced in a local Python/FFmpeg offline compositor with moving original conceptual graphics, exact official approved logo, and an **original synthesized instrumental score**. This demo is **not** proof that the Motion OS browser/Chromium film exporter produced those same frames. It is designed as an artistic reference that can be compared against native Motion Studio shots and the user's earlier reference video.

The currently rendered visual export has a native 720×1280 source and an upscaled 1080×1920 social-media delivery variant. **Never represent the upscale as a native full-HD render.** No narration was embedded in the film; an independent voiceover may be prepared and manually aligned for final production.

## Factual / source boundaries
- AI answer cards, search-surfaces, response analytics, before/after graph, and process steps are **illustrative concept UI**. Not captured from a current live model session, not a real provider ranking, and not a validated customer improvement.
- Do not insert fabricated results, logo endorsements, clients, rankings, or revenue outcomes. Do not imply new sales.
- Before advertising as real product footage, record and replace UI motifs with owner-approved current Promptence screen recordings; check accuracy in production.
- Any speech and soundtrack need final audio leveling, intelligibility, licensing and device inspection. Native Armenian typography needs proofreading. Public distribution requires owner review.

*There is no paid Higgsfield generation, external footage import, unauthorized publication, or change to the original signature film.*
