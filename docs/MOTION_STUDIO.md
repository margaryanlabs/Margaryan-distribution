# Margaryan Motion Studio — v0.2 Keyless Engine

**Live route:** /motion inside the existing Margaryan Distribution project.

## What changed

Motion Studio no longer requires OpenAI, Claude, OpenRouter, Supabase, generated API keys or paid credits to create a storyboard or render a motion video. It is not marketed as a local LLM: this is a **procedural motion-graphics engine plus deterministic, language-aware rule-based story director**.

### Architecture

- lib/motion/director.ts — multilingual briefing grammar, Russian/English/Armenian copy library, quote extraction, topic matching, creative pacing, seeded variations, structural safety.
- lib/motion/studio.ts — canonical scene schema, parser, saved-project compatibility, presets, formats and timeline.
- lib/motion/render-engine.ts — deterministic Canvas2D animation: perspective lattice, orbital signal nodes, kinetic tracks, animated network lines, glowing procedural particles, title easing and scene transitions.
- lib/motion/sound-engine.ts — optional original WebAudio synthesis recorded as an audio track along with the video, without API requests, licensed audio files or paid credits.
- app/motion/page.tsx — entirely browser-based prompt-to-storyboard, preview, editing, project import/export and local recording. **No fetch call is made to construct a film.**
- app/api/motion/storyboard/route.ts — optional stateless API for other trusted workflows. This uses exactly the same keyless director and no external model or database. JSON body is bounded.
- proxy.ts — only /motion and /api/motion/storyboard are exempted from operator auth, because they are stateless and contain no secrets or CRM access. Other Distribution routes retain existing protection.

### User workflow

1. Open /motion. The page must work with no credentials.
2. Select VETO, Promptence, RAIOS or Margaryan Labs and 9:16, 1:1 or 16:9 format.
3. Describe the video in Russian, English or Armenian. Select a specific language and visual style if needed.
4. Press **CREATE FILM / NO API KEY**. The storyboard is assembled locally, including a 5-shot composition and brand-specific text, in milliseconds.
5. Scrub/play the canvas. Edit timing, scene type, headline, eyebrow and support text; add/remove shots.
6. Optionally enable ORIGINAL SYNTH SOUNDTRACK. Press EXPORT VIDEO. Recording happens in real time using CanvasCaptureMediaStream + MediaRecorder, typically saving WebM in Chrome, and native MP4 only in browsers with that MIME type. Sound is mixed locally and is not played during preview.
7. Save/restore a JSON project. Browser autosave is localStorage, not cloud persistence.

### Verification

- Running npm run typecheck and npm run build should succeed.
- scripts/smoke.mjs asserts /motion loads, the API rejects malformed prompts, storyboards differ by theme and brand, identical briefs produce identical projects, and Cyrillic copy is preserved.
- Verify a real export in desktop Chrome/Edge and on an Android device; browser recording is NOT guaranteed on iOS or background tabs.

### Honest limitations

- This is **not** neural text-to-video, pretrained AI model or a clone of Claude. It can direct and render motion typography/geometric diagrams without inference costs.
- It cannot yet generate photorealistic people, licensed footage, voiceover, commercial/licensed music, original 3D objects, proprietary logos or full Remotion-level complex timelines. Optional WebAudio provides original ambient synthetic sound, not a commercial composition.
- 30 FPS is requested, not guaranteed, on each device. Export is **real time**, and MP4/H.264 is not universal through MediaRecorder.
- Procedural data visuals are abstract illustration, never live financial market data.
- The public keyless endpoint uses no paid inference; it must still obey normal hosting abuse/traffic controls.
- No marketing automation, messages, external posts, repository secrets or database state are touched.

### Next technical direction

- Optional local FFmpeg/Remotion render worker for consistent H.264 MP4 exports and sound; CPU/cloud compute still has a cost, but no AI credits required.
- True multi-track timeline with explicit keyframes and reusable animation presets.
- Licensed media assets and local sound synthesis; proper brand packs supplied by the team.
- If wanted in future: **optional** locally hosted open-weight language/video model, with real infrastructure and licensing requirements. It must not be conflated with this deterministic keyless engine.
