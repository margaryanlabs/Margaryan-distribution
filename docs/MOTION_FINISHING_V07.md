# MOTION OS v0.7 — Film Finishing & Multilingual Production

This is a quality and post-production release for the existing 13-brand Motion OS. It does **not** promise that a generic procedural film equals a professional film without human review.

## 1. Source-accurate type engine
- `lib/motion/typography.ts` measures text with real browser glyph metrics; it no longer silently discards headline lines exceeding the layout.
- Safe-area geometry adapts to portrait, square and landscape. If text cannot fit into the available editorial area, QA flags the shot instead of cropping copy.
- `app/motion/layout.tsx` loads Noto Sans Armenian and Noto Sans where available; Canvas falls back to local supported fonts when offline. A font-availability warning is generated for Armenian footage when the preferred face does not load.
- Verify actual Armenian, Russian and English character rendering in contact sheets before release.

## 2. Editorial subtitles and voice script
- `lib/motion/captions.ts` exports `.srt`, `.vtt` and a language-specific, shot-timed text guide. All glyphs remain editable real text.
- `POST /api/motion/captions` is a bounded stateless no-key tool that uses the same compositor's scene timeline, returns `alignedToVoice:false`, and never uploads or persists narration.
- Studio users can export each sidecar from the export toolbar.
- These are **scene-title editorial cues**. They are not word-level automatic voice transcription or subtitle alignment; a human must align to the actual recorded speech.

## 3. Voice-duration preflight
- Browser reads `audio/*` file duration using local metadata and shows film-vs-voice timeline.
- `FIT FILM TO NARRATION` explicitly stretches or compresses individual shots inside 2–8 seconds while preserving the general pace. It does not slow down/pitch-change the recording.
- The offline FFmpeg master rejects narration that would run beyond the final hold, rather than silently cutting speech.
- A professional soundtrack still requires source-approved recorded or generated speech. This update does not create synthetic human narration for free.

## 4. Frame and layout QA
- `REVIEW ALL SHOTS / CONTACT SHEET` now checks multi-line fit, mobile safe-area overlap, minimum legibility, blank/transparent frames and suspiciously repetitive compositions.
- Browser export now runs the review before encoding, refuses severe failures, and downloads the contact sheet so the director can correct the shot.
- This is measured structural QA, **not an AI aesthetic rating**. Compositor code cannot independently guarantee creativity.

## 5. Offline master bundle
With FFmpeg, ffprobe, Chromium and Playwright installed on an operator machine:

```bash
npm run motion:film -- --brand tun --lang hy \
  --brief "Ստեղծիր TUN-ի համար 30 վայրկյանանոց կինեմատոգրաֆիկ հոլովակ" \
  --out out/tun-hy.mp4
```

After mastering, the system emits:
- H.264 MP4
- eight-frame contact sheet
- `.render-report.json`
- scene editorial `.srt` and `.vtt`
- `-narration-guide.txt`
- original structured project (`motion:film` only)

The media verifier checks codec, audio presence where required, dimensions, black segments and basic duration. It does not assess voice rights, soundtrack licensing or financial claims.

## 6. Test and release boundaries
- CI smoke exercises Armenian subtitles and WebVTT, rejects empty projects, checks voice-alignment honesty and existing films.
- Vercel preview READY only confirms the Next.js compile/deploy. It is not a full browser/UI/audio mix QA.
- The offline MP4 renderer is an operator-side command, **not** a public cloud button. Local Playwright/FFmpeg must still be validated on the render workstation before claiming a particular MP4 has been generated.

**Brand policy:** original source art only, editable real typography, no invented third-party AI quotes, no fake business results, no invented product screenshots, no automatic external publishing.
