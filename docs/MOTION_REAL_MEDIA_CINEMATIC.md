# Motion OS / Cinematic true-source media v1
Date: 11 October 2026

## What changed
The existing Cinematic Studio can now place **genuine local screenshot or
moving MP4/WebM/MOV** on each of its up to eight shots, with a separate
asset ID and adjustable source inpoint. These are decoded original pixels,
not screenshots or a fake AI dashboard generated on the fly. Every "screen"
scene can reference a different file from the private, approved Media Library.

- **User path:** Cinematic → MEDIA LIBRARY → upload a clip with role "video" →
  review rights and tick **APPROVED** → choose shot on VIDEO track →
  **USE AS MOVING VIDEO SHOT**. Edit **TRUE VIDEO INPOINT** in Scene Inspector.
- **Preview:** the media registry reads browser-local File objects, seeks
  paused playback to the correct source timestamp, and plays the genuine
  HTMLVideoElement while the shot is active. The muted recorded source video
  does not inject unknown or unlicensed audio into the chosen soundtrack.
- **Browser export:** actual decoded frames are drawn in the existing Canvas
  compositor, with the original text, 3D artwork, authorized brand assets,
  voice/music tracks, and existing transitions.
- **Offline master:** the FFmpeg/Playwright frame bridge accepts user-supplied
  files through a local **media map**, seeking the actual source video frame
  for each output timestamp. It blocks missing files, decoding failures and
  shots that extend beyond the real source recording instead of silently
  freezing the last decoded frame.
- **ChatGPT operator:** the portable JSON pack carries only the approved
  asset identifier and numeric source inpoint. Your files never appear in
  the Chat Pack. The editor supports patches of both fields.

## Offline 1080p MP4 example

If your Chat Pack scene includes
`{"kind":"screen","mediaId":"media-01-source","mediaStart":3.2}`:

1. Save your validated ordinary Motion project JSON as `film.json`.
2. Prepare a local `approved-media-map.json` containing actual reviewed
   file paths, not public URLs:

```json
{
  "media-01-source": "/path/to/your/approved/promptence-screen-recording.mp4"
}
```

3. With `npm run dev` and local Playwright/FFmpeg installed:

```bash
npm run motion:master -- film.json out/promptence.mp4 \
  --media-map approved-media-map.json --fps 30
```

For legacy `screen` shots with no ID, the existing `--screen` option
remains available. For narration/music use existing `--voice`, `--music`
and per-project timeline audio edits.

### Source truth and acceptance

- Local files are never uploaded to ChatGPT, any model API, the Vercel backend
  or an external editing service.
- All scene start/end times must be covered by the actual source clip;
  no frozen-frame substitutes are allowed.
- The local reference-to-file map is **not embedded in project JSON**.
  When opening on another device, upload media again and attach it to
  the same scene or supply a new valid media map for offline rendering.
- Browser MediaRecorder is a realtime recorder and is device/browser dependent.
  If a clip fails to play in the browser, the result is not automatically
  approved for publication. Offline mastering with exact seeking and a
  reviewed contact sheet is preferred for important campaigns.
- Vercel build readiness checks type safety and compilation, not actual
  photo/video rights or aesthetic quality. **A human must review the exported
  MP4 on a phone with headphones**, including cuts, source-frame continuity,
  vocal level, logos and claims.

### New test coverage
`npm run motion:test-real-source` checks ID serialization, exact
video source inpoint math, missing-media blocking, short-video rejection,
browser-local video play/pause semantics and safe Chat Pack media patches
using a synthetic test decoder (no invented advertising visuals).

## Limits, next phase
- Cinematic still supports max 8 shots / 64 seconds; the existing offline
  sequencing path is used for longer material.
- Real source media appears in the existing card composition. The next
  visual upgrade should give the film director true crop/focus keyframes,
  picture-in-picture layers and proper video-source waveform/audio decisions.
- This does **not** implement automatic AI voice, autonomous agents, generative
  photorealistic footage or the ability to magically operate a browser tab
  directly from the ChatGPT conversation.
