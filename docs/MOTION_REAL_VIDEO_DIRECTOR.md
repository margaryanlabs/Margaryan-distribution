# MOTION OS / REAL FOOTAGE DIRECTOR — V2 IMPLEMENTATION
Date: 2026-10-11

## What changed
The prior 10-second proof path displayed one approved screenshot with a camera move. It was better than invented dashboard cards but still risked looking like another static presentation. This tranche adds **real, locally decoded product video frames** to that same path and native film exporter without introducing a new project, generative API or subscription.

### Input types
- Real screenshot: PNG / JPEG / WebP, max 12 MB, at least 800×500 pixels.
- Real video: MP4 / WebM, max 180 MB, 8–300 seconds, at least 720×480 pixels, browser-supported codec.
- Capture can be an owner's smartphone/computer recording of Promptence or the existing operator-only actual public website capture command `npm run motion:capture-video -- out/approved/promptence.mp4`. Do not assume any user's dashboard is available without authorization.
- Source stays in local browser memory; no storage in GitHub, Supabase, server or session. Native CLI reads an explicitly supplied local file.

## Real video preview and film master
`/motion/proof` accepts video and screenshot via the same source-gated upload. It now uses actual HTMLVideoElement decoded frames, not fake pixel art, and changes its source layout according to input orientation.

- Preview: video playback plus fixed film camera moves, timeline scrub, view three acts.
- Browser export: silent review WebM, 540×960. It is a **review only**, not a pro mastering claim.
- Workstation MP4: `npm run motion:proof -- --video ./approved/promptence.mp4 --out out/promptence-proof.mp4`.
- Screenshot fallback: `npm run motion:proof -- --screen ./approved/screenshot.png --out out/proof.png.mp4`.
- For video mastering: `window.__motionProofFrame(t)` seeks the HTML5 video to the target time before drawing the exact composition frame, then sends PNG pixels to FFmpeg H.264 at native 1080×1920 / 30fps. This can be slow on limited workstations. Playwright and FFmpeg required; not a Vercel serverless workload.
- Actual source visual fidelity must be verified. Videos from other companies or fabricated AI provider results are not permitted as authenticated Promptence product evidence.

## Voice policy
No Flite and no automatic synthetic speech. Optional owner-approved human recording or commercially usable good-quality AI voice file; use natural duration and reject spoken tracks longer than 9.7 s. Optional sound bed requires a licensed source. Dialogue has a highpass/lowpass/loudness stage targeting -16 LUFS and music remains low under it. Audio signal processing is **not** proof of natural expressive pronunciation; human review remains mandatory.

```bash
npm install
npm install --no-save playwright
npm run dev

# Real source recording:
npm run motion:capture-video -- out/approved/promptence-real.mp4

# Visual QA and source provenance:
npm run motion:test-proof -- --video out/approved/promptence-real.mp4

# Native film:
npm run motion:proof -- --video out/approved/promptence-real.mp4 \
  --out out/promptence-10s.mp4 \
  --voice approved/natural-voice.wav \
  --music approved/licensed-score.wav
```

## Acceptance gates (NO automatic "premium" grade)
1. Approve 8–10s source footage: is it the real product, current, legally usable, and without private data?
2. Run `motion:test-proof`: controls blocked before source, playback-ready video source, same exact timestamp yields identical frame, non-empty unique frames and contact sheet.
3. Run native Master: FFprobe H.264 1080×1920 10.0s. If natural voice/music supplied, AAC soundtrack exists.
4. Review visual film *at actual Instagram mobile size* against the original provided reference. Verify pacing, framing, camera choreography, true interface, and legibility.
5. Listen to whole film with headphones. Assess emotion, pronunciation, pace, music ducking and sound peaks.
6. If video looks like zoomed slide show or artificial 3D, reject and fix source/camera before building any 168-second edit.

**Validation status:** Vercel Next.js/TypeScript preview build is a code check only. We have not run the local 300-frame source-video MP4 export or completed human creative sign-off in this connector-only development run.

## What is intentionally not done
- No false claim that Remotion, GSAP, WebGL, Claude or Higgsfield already power the film.
- No new account, payment key, paid AI credits or external autoposting.
- No forced generated speech, stock rebrands, fictitious scan scores, automatic screenshots of private dashboards, altered real provider results.
- No promise of Apple-level production without a shot-by-shot review.
