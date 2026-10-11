# Margaryan Motion Studio — Film Release Review Desk

**Purpose:** Turn a technically complex editor into a transparent,
actionable production-quality workflow. This is an upgrade to the existing
Cinematic Studio's **REVIEW** panel, not an AI quality-rating model, new
project, paid inference product or external uploader.

## What operators see

In **REVIEW → THE PRODUCTION DESK**:

- **Actual source coverage** across all selected product-interface scenes.
  A real screenshot/video is distinguished from authored animation,
  browser-only legacy footage and a missing source file.
- **Visual shot map**: shot number, time, headline, source kind and an
  immediate button taking the operator to the scene or Media Library.
- **Technical blockers**: current Motion structural QA and genuine-source
  decode/timeline issues, with direct actions instead of a giant error list.
- **Recorded human voice** vs. editorial voice cues: the latter do not
  magically imply narration. Real voice timing is checked against the
  edited film using the existing audio timeline decoder measurements.
- **Music permissions and truthful claims** are left as human review
  tasks. Importing a video never marks copyright clearance complete.
- **Actual exported master review remains open** until a person watches
  and listens to a completed file. There is no fake 100% quality score
  or automated legal sign-off.
- **SAVE REVIEW MANIFEST** downloads a compact private local JSON
  checklist **without raw media, local source identifiers or original
  footage filenames**. This report is not a release certificate.

## Producer's workflow

1. Attach approved original screen recordings through **ASSETS**.
2. Choose a real product shot in the timeline. Edit copy/geometry in
   **SCENE**, check small UI labels, sources and real evidence.
3. Record a human narrator or import a permitted recording in **AUDIO**;
   review voice timeline placement, sound mix and codec compatibility.
4. Open **REVIEW**, inspect every source tile and follow critical buttons.
5. Export only after the structural check is clean. A technically
   renderable video is *not* necessarily cleared for commercial use.
6. Watch the actual exported video end-to-end, check sound/captions on a
   phone, verify client permissions/claims, and collect explicit owner signoff.

## Technical detail and safety

- Pure evaluator: `lib/motion/release-readiness.ts`. Depends on real
  current MotionQA, selected project shot IDs and browser-only registered
  source metadata. It does not call networks or create fake source files.
- UX: `app/motion/release-readiness-desk.tsx` plus responsive CSS,
  inside existing Cinematic **REVIEW** inspector. Navigation points
  to the existing **ASSETS**, **SCENE**, **AUDIO**, and **EXPORT** controls.
- Dynamic readiness recomputes when edits/asset registration update the
  React page; this is a current-state view, not a server audit history.
- A technically good film always retains *human review required* status
  for claims, rights and the final rendered sample. No arbitrary score.
- `npm run motion:test-release` checks source-detection / overflow
  denial / referential privacy / navigation / deliberately
  un-certifiable commercial release.
- Runs in the **prebuild** gate so Vercel rejects regressions even where
  GitHub Actions has trouble starting runners.

**Not yet validated:** completed owner-supplied Promptence source cut with
professional narration, final MP4 visual/audio playback on actual Android
and desktop, pixel-perfect screenshot review and verified client acquisition.
These require genuine source assets and human review, not more procedural
claims about the technology.
