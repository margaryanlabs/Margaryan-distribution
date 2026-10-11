# MOTION OS / AUDIO FINISHING + COMPARATIVE VISUAL REVIEW

## Why this branch exists
Previous Promptence films sounded like robotic TTS and repeated static slides. First we changed to real source-video frames. This stage adds **a real recording/score workflow** and a **source-vs-directed visual check** inside the existing Proof Director rather than creating another long advertising film.

## Implemented in /motion/proof

1. Owner selects an actual source MP4/WebM or screenshot of Promptence.
2. **Real audio import**: a voice recording WAV/MP3/M4A compatible with the browser, max 30 MB and **9.8 seconds**; optional licensed soundtrack under 50 MB. Files remain exclusively on the device. Audio lengths, decode, and near-silence are checked; the system never fabricates speech or stretches playback speed.
3. Press **Play** to hear the voice and quiet music while previewing the 10-second film. Source clips themselves remain muted, avoiding double narration.
4. Switch **DIRECTED CUT** vs **RAW SOURCE / BEFORE** to judge whether the edit really improved the approved product footage. A before/after view is more honest than automatic "premium" confidence ratings.
5. Download **REVIEW 9 KEY FRAMES** contact sheet with chosen timestamps .38, 1.30, 2.13, 2.71, 3.62, 4.94, 6.24, 7.82 and 9.25 seconds. Compare images and motion continuity.
6. **EXPORT 10s REVIEW** mixes uploaded voice/music locally through Web Audio + MediaRecorder into a WebM with Opus sound (where browser supports it). The session starts only after the source video and encoder are ready, instead of allowing a long period of empty leading voice. Export remains explicitly review-only.
7. Native operator-only Master continues to output 1080×1920 H.264/AAC through FFmpeg with high-pass/low-pass and dialogue loudness normalization (no Flite, no fabricated provider answers).

**Neither the voice nor media files upload to GitHub, Vercel, or database.** No paid model/video APIs.

## Manual quality gate

- **Video:** watch actual exported WebM from start to finish; test raw/director toggle and nine-frame sheet. Compare to original reference, reject bland/cliché effects.
- **Voice:** verify human-quality pronunciation, intonation and pauses by listening on headphones and on phone. A good codec cannot fix poor recorded speech.
- **Mix:** speech must lead; verify audible voice after export, absence of clipping, clear music ducking, appropriate start/end.
- **Product truth:** show real captured website. Do not claim artificial model responses are observed measurements.
- **Final approval:** proceed to 30s or 168s ONLY after this ten-second result passes human sign-off. Avoid hard-coded marketing adjectives in QA reports.

## Technical verification (workstation)

Requires local Next.js server + Playwright Chromium and FFmpeg. The browser-only audio acceptance fixture is explicitly synthetic **for testing only** and cannot be published:

```bash
npm run dev
npm install --no-save playwright
npm run motion:test-proof-audio
```

The test uploads its own 1440×900 fixture labelled **TEST FIXTURE - NOT AN AD**, an 8.2-second tone WAV, and checks that the entire 10-second review WebM contains both H.264/VPx-compatible browser video and *an audible audio track*. The test artifact is in `out/motion/proof-audio-contract`. Passing a fixture test is **not** a creative acceptance or proof of the naturalness of a voice.

To create a final H.264/AAC master from an approved source video and recorded WAV:

```bash
npm run motion:proof -- --video ./approved/promptence-real.mp4 \
  --voice ./approved/natural-narration.wav \
  --music ./approved/licensed-score.wav \
  --out ./out/promptence-proof-master.mp4
```

## Reality check
Next/Vercel compile status is not an actual MP4 creative review. The in-browser video review export must be exercised on an actual supported Android/iOS Chromium/Safari browser and *the completed MP4 must be played* before advertising this as professional. No one should claim a feature-film campaign has been completed by this implementation branch.
