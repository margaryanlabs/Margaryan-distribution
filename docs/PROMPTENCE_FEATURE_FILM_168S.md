# PROMPTENCE / THE ANSWER IS THE NEW FRONT PAGE — FEATURE FILM 2:48
**Production date:** 11 October 2026 · **Length:** 168 seconds · **Platform target:** Instagram Reels / TikTok / Shorts · **Frame:** 9:16 at 30fps.

## Why 2:48 instead of a 20-minute reel?
Instagram can support longer videos, but content beyond 3 minutes is not recommended to new audiences under its current public help guidance (checked October 2026). This cut is designed to explain the entire commercial loop while retaining eligibility for broad discovery. The best reel is not necessarily the longest allowed.

## Actual independent rendered campaign asset
An independently authored **actual playable 168-second video** was rendered locally in the assistant's working container using a dedicated original Python/Pillow/OpenCV director with FFmpeg. The exported H.264/AAC social delivery file was 1080 × 1920 at 30 fps **upscaled from a natively rendered 720 × 1280** procedural composition. Original generated score, 22 chapters (the Motion OS 23-step manifest splits final end card), portable SRT subtitles, thumbnail and complete storyboard were created. This actual film does **not** include spoken narration.

**Critical identity:** The independent rendered MP4 is *not* claimed as a verified Motion OS Chromium native Master. Its aesthetics and per-frame content may differ from the Motion OS segment renderer. Native Motion OS integration uses existing procedural graphics and is implemented as a separate operator-only three-part compositor CLI (below). Do not pretend the two outputs are pixel-identical.

## Existing Motion OS integration
The original `/motion` single-film editor is deliberately kept at its existing 8-shot limit, avoiding regressions for existing brands and the signed-off 33.8s Promptence original/36.5s campaign.

The new script uses **the existing local Motion Master** to render a versioned `168s` authored manifest as three distinct, safe, bounded original films (8 + 8 + 7 shots), then concatenates them to one MP4. It does not change the public Next.js interface, create fake source screenshots, use any paid video API, access private services or send customer information.

```bash
npm run dev
npm install --no-save playwright
npm run motion:feature -- --out out/promptence-feature-168s.mp4
# optionally, after you approve and obtain your own real voice-over recording:
npm run motion:feature -- --out out/promptence-voiced-168s.mp4 --voice ./approved/narration.wav
```

FFmpeg and Chrome/Chromium must be installed locally. Each native render has existing QA/report artifacts. The concatenated film must be reviewed in full on phone. This command can take considerable time and disk space and was **not run in this GitHub PR's CI or Vercel**; Vercel is not a media rendering workstation.

## Commercial narrative
1. Buyer asks AI instead of opening a company site.
2. A shortlist is formed and a business can be missing.
3. Promptence shows a framework to measure AI recommendation visibility.
4. Enter brand/domain/market/category and define real buyer intent.
5. Distinguish observed model results from inferred explanations.
6. Inspect verifiable provider answers, sources and competing mentions.
7. Diagnose a supported, actionable visibility gap.
8. Require owner approval before changes, then verify publication.
9. Repeat identical questions and compare only comparable measurements.
10. Include local context and sectors, finish on a clear free-check CTA.

**Every AI answer and interface illustration used in the independent film is concept art, not a captured live Promptence API scan.** There are no invented client outcomes, revenue deltas, source domains, or model rankings. Any additional live screenshot/recording must come from owner-approved production session and disclose context.

## Publish acceptance gates
- Review final H.264/AAC, 168.0 s, proper 9:16, audio + visual on actual Android/iOS Instagram preview.
- Check no typos in headline/CTA, and all 22 scenes legible without audio.
- Record a human-approved authentic English spoken narration and align it before calling the film a finished professional voice-over ad.
- Capture/replace conceptual cards with actual approved Promptence interface video to close the current reference-quality gap.
- Supply accessible captions (SRT), Instagram cover, and final human-approved caption copy.
- Never label simulated AI model answers or source cards as real observations.

The film is a *long-form launch explainer*; do not artificially extend the previous 36.5s short campaign by looping its scenes.
