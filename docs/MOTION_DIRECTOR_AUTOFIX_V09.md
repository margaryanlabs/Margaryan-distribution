# MOTION OS v0.9 — DIRECTOR AUTO-REPAIR & VERIFICATION GATE

This release upgrades the existing film editor and offline master from one-time visual checks into a **bounded, measurable render → inspect → repair → re-render → verify loop**. It does **not** claim a machine can certify top-agency creative quality or automatically prove claims/licensing.

## Operational flow in Motion Studio
1. Compose a film for any of 13 configured brands, in EN/RU/HY.
2. Click **SMART DIRECTOR / REPAIR & RECHECK**.
3. Director renders real middle and near-cut shots, measures title glyph widths and safe areas, and scans for suspiciously similar adjacent scenes.
4. It may change ONLY (a) a scene's typography multiplier down to 0.72 with no removed characters or (b) a non-screen non-closing scene's visual treatment to break repetition.
5. A fresh contact sheet is rendered after each change, up to three passes. No recursion, uncontrolled prompts, API credits or background cloud jobs.
6. Studio downloads a JSON audit and an annotated PNG contact sheet with the final measured state and remaining manual-review items. **UNDO AUTOMATIC REPAIRS** restores the exact prior project.
7. Browser export rechecks actual frames. If a fix is measurable, Studio applies it and asks the operator to review the revised film and press Export again. This prevents silently changing copy or composition in a video the user has not watched.

## Same checks in offline H.264/AAC mastering
The localhost-only Playwright bridge exposes `window.__motionReview`. It runs the same director and returns a sanitized modified storyboard, JSON audit and contact sheet. The offline `motion:master` command:
- receives the source project, and an explicitly supplied --screen real image for screen scenes;
- executes bounded auto-repair before encoding;
- writes `*.director.motion.json`, `*.director-audit.json`, and `*.director-contact-sheet.png`;
- blocks encoding when measurable visual faults remain or structural blockers exist;
- uses the repaired storyboard consistently for all 30fps frames, its original synthesized soundtrack, and caption sidecars;
- retains source image privacy boundaries (offline/local only) and does not publish automatically.

## Structural guarantees and honesty
- **Preserved:** every headline/support/eyebrow word, language script, brand name, uploaded source screenshot, scene duration, meaning of all claims and legal warning.
- **Repairable:** measured mobile safe-area typography overflows and a subset of visually repetitive shots.
- **Not automatically repairable:** unavailable original logo, unlicensed imagery/music, false statistics, mistranslated Armenian/Russian, poor vocal expression, AI answer evidence, source screenshot privacy/rights, subjective cinematic taste. These remain clearly flagged for human approval.
- **No video-generation model, fake UI mock data, private repository crawling, financial transaction or social posting** is introduced by this release.
- Real render-end-to-end with a workstation still requires an authenticated operator, FFmpeg/Chromium/Playwright and actual review of the film. Vercel preview READY means web code compiled, not that an H.264 master was actually produced.

## Usage
```bash
# Browser: /motion → GENERATE → SMART DIRECTOR → inspect PNG/JSON → EXPORT

# Offline source-accurate MP4 with automatic director preflight:
npm run motion:master -- ./project.json ./out/film.mp4 \
  --screen ./approved-product-image.png --voice ./approved-voice.wav

# Reproducible files beside film.mp4:
# film.director.motion.json
# film.director-audit.json
# film.director-contact-sheet.png
# film.render-report.json
# film-contact-sheet.jpg
# film.srt / film.vtt / film-narration-guide.txt
```

The extra director source project is intentionally a local export and not pushed to the original GitHub brand repositories. No external emails, LinkedIn, Instagram, Supabase, payments, or login permissions were changed.
