# Margaryan Motion OS — Multi-track Edit Suite v1

This is an **in-place extension** of the existing Cinematic Studio, not a new app.
Quick Studio, the Proof Director, source screenshot provenance, film generation,
native Canvas/Three.js compositions and the existing FFmpeg master remain intact.

## What is actually editable

A horizontal multitrack editor below the canvas shows:
- **VIDEO** — scene blocks sized by their real duration. Tap any segment to select it.
- **COPY** — the actual shot headline/eyebrow timing, not AI-transcribed speech.
- **VOICE** — an operator-imported local audio file, with an actual decoded waveform,
  start-time placement, start-of-source trim, fade-in and fade-out.
- **MUSIC** — optional owner-approved audio file, source start trim and fading.

The ruler is an interactive time scrubber. Edits to shot length/ordering in the
existing Director Desk update timeline positions automatically.

Voice and music fades, start offsets and source trims are applied to the real
browser output via Web Audio API. The offline `npm run motion:master` FFmpeg
path reads the same project audio fields and uses `atrim`, `adelay`,
`afade`, looping and AAC mixing. Invalid voice placements fail closed:
no hidden truncation or speeding up the narration. Imported music remains
lowered under narration. The visual + audible preview uses local media
elements (browser-real-time synchronization, NOT sample-accurate waveform alignment).

## Workflow

1. Enter a brief and select a brand. Generate/edit scenes and choose
   camera/transition/3D style as before.
2. Upload a narration file (recorded or made offline via approved TTS).
   Upload a music file you may legally use.
3. Open **05 / EDIT SUITE** under the canvas. Move the voice start and
   trim source if necessary; watch clip length and the overflow guard.
4. Fine-tune scene duration, typography, 3D and cuts in Director Desk,
   and fade lengths in the audio timeline. Use Play to listen and watch.
5. Download the project JSON and Director Pack. Only edit metadata is
   persisted; reattach your media when reopening the draft.
6. Export a browser video or use operator-local FFmpeg:
   `npm run motion:master -- project.json out/master.mp4 --voice voice.wav --music licensed.mp3`.
   Run `npm run motion:verify -- out/master.mp4` and review the resulting audio/video.

## Non-goals / honest constraints

- This is now a genuine four-lane **basic timeline editor**, not yet a
  fully free-form NLE (no stacked video layers, blade-tool cuts or
  cross-device project media library).
- There is **no integrated Remotion commercial runtime**. The existing
  output is Canvas/Three.js + Web Audio (browser), or FFmpeg/Chromium (CLI).
  Remotion is subject to its own licensing and is not required for this
  free/no-key workflow. A future optional adapter should be isolated.
- No generated or cloned voice is created in browser; a separate local
  Chatterbox CLI remains optional. The app doesn't pretend that
  licensed music is supplied for free.
- Waveform is a rough channel-one peak envelope, not a diarized transcript.
  Titles/SRT are editorial on-screen cues, not forced-aligned narration.
- Browser previews may have media-element drift, especially when CPU/GPU
  is under load; verify the final MP4 audio rather than relying solely
  on an interactive preview.

## Validation

`npm run motion:test-production` validates scene and audio schemas,
serialization, clip overflow, and director edit cues.

`npm run motion:test-audio` checks generated FFmpeg filter graphs,
source trim, voice delay, fades, source looping and narration overflow.
Both tests use synthetic durations and do not require cloud model APIs.

Vercel Next build/type-check proves compilation, not that a human creative
director approves the shots or that every browser/device will export correctly.
GitHub Actions runner state must be assessed separately from a successful
Vercel deployment.
