# MOTION STUDIO — FEATURE FILM + CREATIVE WORKSPACE

**Release scope:** The existing Margaryan Distribution Motion Studio (not a
replacement web app) supports a single-chapter film editor and a chapter-based
feature film workflow. This release also reshapes the actual visible interface
as a wide-screen director workspace.

## What you can create right now

### A normal campaign (individual chapter)
The existing Cinematic Director still edits **1–8 shots** with the precision
cut, human Voice Booth, original screenshots/video, approved picture-in-picture
images, source camera controls, visual grading and audio. One chapter is
limited to 64 seconds. The original single-chapter web video exporter is
unchanged, as are Quick Studio and Proof Director.

### A 2–5 minute film (one production)
The wide **01 / FEATURE FILM** workspace collects up to eight independently
editable chapters; a full manifest can hold up to **512 seconds**. The
master timeline lays out every act and shot. Individual chapters are opened in
the *same* Cinema editor below. A changed chapter must be explicitly saved.

**From scratch:**
1. In `/motion?mode=cinematic`, select **02 / DIRECT** and edit a short chapter.
2. Go to **01 / FEATURE FILM**, name your chapter and select
   **ADD CURRENT AS CHAPTER**.
3. Select **NEW CHAPTER**, edit the next act and save it. Repeat until the film
   is complete (5–8 acts works for a 2–5-minute production).
4. Use the **MASTER TIMELINE** to navigate acts and see durations.
5. Inspect each chapter, save the project and **EXPORT FULL FILM MANIFEST**.
   This is editable JSON only; privately licensed media remains on your device.

**Curated starting points:**
- **120s Promptence editorial** — 2 chapters, 16 shots. Can be previewed,
  revised and recorded in the browser.
- **300s Promptence director film** — 5 chapters, 40 nonduplicate authored
  Russian shots about AI answers, evidence, diagnosis, controlled changes and
  remeasurement. This is a genuine editorial *storyboard* — not actual
  OpenAI/Gemini provider results or a completed MP4. Full browser workprint
  up to 300 seconds is an opt-in, resource-intensive beta; on older phones,
  individual chapter preview or workstation mastering is safer.

Click a demo to stage it, **APPROVE & SAVE FILM** after inspecting the act
list, then choose a chapter to edit. No demo silently replaces current
chapters, account files or any client data.

## Real local video rendering, not API inference

### In browser (no FFmpeg)
**PLAY WHOLE FILM** composes the original Canvas animation from each saved
chapter sequentially. **EXPORT VISUAL FILM** records that composition
through the browser MediaRecorder: 720p (landscape 1280×720), 24fps,
up to 300 seconds, real time. An optional locally uploaded human narration
and licensed music can be recorded into a compatible MP4/WebM; music is
conservatively ducked when narration is supplied.

**This source-safe browser mode rejects** scene footage/images, independent
image overlays, signature custom art, and spatial GPU scenes for which the
browser workprint engine cannot guarantee original frames or correct decoding.
It doesn't silently replace a real source with synthetic artwork.

This is a **workprint** with device/browser codec dependence, not guaranteed
broadcast mastering. Keep the browser visible; interrupted or hidden-tab
recordings are aborted. The file size safety cap is 120MB.

### Offline final H.264 master (real materials, up to 512s)
On a workstation with **Node >=22, Chrome/Chromium, Playwright, FFmpeg**,
start the local Motion application:

```bash
npm run dev
npm run motion:sequence -- ./film.motion-sequence.json ./out/feature.mp4 --dry-run
npm run motion:sequence -- ./film.motion-sequence.json ./out/feature.mp4 --fps 30 --crf 18
```

For authentic reviewed media and optional original audio:

```bash
npm run motion:sequence -- ./film.motion-sequence.json ./out/feature.mp4 \
  --media-map ./owner-approved-assets.json \
  --voice ./original-voice.wav --music ./licensed-music.mp3
```

Media map example:

```json
{"approved_source_id":"/absolute/path/to/approved-recording.mp4",
 "approved_overlay_id":"/absolute/path/to/approved-original-image.png"}
```

Every chapter is rendered by the existing actual source-aware
`motion:master` pipeline, not an independent fabricated screenshot engine.
Outputs are concatenated using FFmpeg, with duration, codec, dimensions,
audio presence and black-frame warning verified before the final film is
promoted. The `--max-duration 515` opt-in makes longfilm QA possible
without relaxing existing 65-second single-film checks. Final captions
are **on-screen designed title cues**, *not* claimed speech transcription.

> Toolchain and source files stay on the operator's own computer. There is
> currently no hosted MP4 render queue, free model video generation, or
> an autonomous agent acting on behalf of other ChatGPT users.

## Actual visual redesign

The page is an editorial production dashboard, not an overflowing collection
of tiny settings:

- **Matte graphite + controlled brand accent** with generous spacing and
  increased contrast for secondary copy; avoids distracting gold/neon.
- Four linked stages: **FEATURE FILM → DIRECT → CUT → DELIVER**.
- A wide full-width **film assembly canvas** above the existing original
  single-chapter editor. This prevents the master timeline being crammed into
  a 370px sidebar.
- Guided new-user empty state and explicit 120s/300s starters.
- Four-phase workflow, time-coded act timeline, saved/unsaved warnings and
  visible readiness/status. Distinguishes a browser workprint from a
  real-source H.264 local Master.
- Mobile-friendly two-column stage chooser, one-column chapter cards and
  readable touch-target sizing. Focus states and reduced-motion support.

## Verification scope

This branch includes **prebuild-tested**:
`motion:test-sequence` (120s/300s demo, chapter validation, safe FFmpeg dry-run),
`motion:test-film-browser` (film boundary, source exclusions, spatial
GPU blocks), and `motion:test-film-audio` (local consent, MIME/size and
300s audio duration), followed by existing precision editing, overlays and
portable-film source validation, and the full Next.js TypeScript build.

Passing those tests and a Vercel Preview does **not** prove that every
phone can encode the full five-minute film, or that original customer
recordings, narration and music have passed a real audiovisual hearing
review. Always render and inspect an actual finished movie for publication.

## Future professional stages
The next upgrades should include a shared asset-aware longform preview
without re-upload, per-chapter real-source storyboard boards, video waveform
and cue placement, sound-effects track, cross-chapter transitions and a
progressive streaming master that does not keep the full media in browser RAM.
