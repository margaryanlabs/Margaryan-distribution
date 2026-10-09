# Margaryan Motion Studio — v0.1

A self-contained programmatic motion-graphics creator inside the existing Margaryan Distribution product at /motion. Marketing Command links to the studio.

## Implemented

- Brand templates for VETO, Promptence, RAIOS, and Margaryan Labs.
- Aspect ratios 9:16 (1080×1920), 1:1 (1080×1080), and 16:9 (1920×1080).
- Editable structured timeline: opener, statement, animated abstract network, closer.
- Scene copy, effect type, durations (2–8 seconds per scene), adding/removing scenes, scrub/play/pause.
- Deterministic code-drawn canvas graphics; no external images or misleading simulated trading figures.
- AI director: POST /api/motion/storyboard converts plain-language brief into constrained JSON via OpenAI Responses API; the API key never enters the browser. Public deployment must have operator authentication and rate/cost controls.
- Local 30 FPS capture with CanvasCaptureMediaStream + MediaRecorder. Preferred output WebM; MP4 if the browser offers it natively. No paid render service.
- Save/load a portable JSON project; autosave active project to browser localStorage.
- Existing CRM, Supabase, outbound approval gates, cron and autopilot are untouched.

## How to use

1. Open Marketing → Motion Studio, or /motion.
2. Pick a brand and aspect ratio. Templates work without a paid AI key.
3. Enter a brief and click GENERATE AI STORYBOARD. Requires server OPENAI_API_KEY and optionally OPENAI_MOTION_MODEL. An unconfigured key returns an explicit error; no fake AI output.
4. Edit scenes, preview and choose EXPORT VIDEO. Keep the tab visible; this version records in real time, so an 18-second film takes approximately 18 seconds plus overhead.
5. Use Save project for portability. Video files are not automatically sent to Instagram, LinkedIn, X, CRM or remote storage.

## Run and security

Use the existing Next.js app and environment. No new npm dependencies, Supabase migrations or provider accounts.

- Existing proxy.ts operator basic auth applies where configured; require operator auth for production.
- JSON storyboards are bounded by a schema; saved/imported JSON is normalized and rendered as text, never executed as code.
- Distribution external sending is not activated by the studio.
- Desktop Chrome/Edge recommended for video recording. Some mobile browsers do not support canvas.captureStream or the selected codec and will show an error.
- Browser/device controls actual recorded frame delivery; 30 FPS is a request, not a frame-perfect delivery guarantee.

## Intentionally not included in v0.1

This is a real editable motion typography and geometric signal animation tool, but not a full Remotion, After Effects, Sora or Claude replacement.

- No audio/music, beat sync, synthetic speech, uploads, asset library, real 3D geometry, cloud render jobs, team projects or cloud persistence.
- No guaranteed frame-perfect H.264 MP4 or publishing to social platforms.
- Brand labels are stylized typography; original proprietary logos and font assets have not been imported.
- No invented performance measurements, ad attribution or ROI claims.

## Next production milestones

Add a Remotion + FFmpeg worker for deterministically rendered MP4/H.264/AAC, keyframes and timeline, licensed music/voice, official brand packs, durable render history, then explicit human-approved publishing integration.
