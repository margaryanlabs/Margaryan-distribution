# Motion OS — Advanced Editor / Independent Real Image Track v1

**11 October 2026.** Implemented in-place within the existing Cinematic Studio,
not a new application, API integration, worker or autonomous ChatGPT agent.

## Why

The existing film pipeline already supported genuine owner-approved screen
recordings and screenshots as a base scene, speech, music, stage direction and
camera control. It did not support compositing two different **real** visual
materials at once. This release adds the first independent source-aware
layer rather than simply drawing more fake decorative dashboards.

## What is shipped

Each Cinematic scene can contain one **separately timed, approved original
still-image overlay** (PNG, JPEG or WebP) on top of its base motion artwork,
or on top of a separately approved moving source video. It uses actual
decoded HTMLImageElement pixels, not AI-generated product claims. The image
is fitted with preserved aspect ratio into a restrained branded panel.

1. Open **Cinematic → Production Workspace → Media Library**.
2. Upload an authentic photo/logo/product screenshot with the appropriate
   role. Review the original and explicitly mark it approved for use.
3. Select the desired shot in the timeline.
4. Select the approved image in Media Library → **ADD SECOND IMAGE LAYER**.
5. In Scene Inspector, choose its position (four corners), size (16–48%),
   opacity (20–100%), start in shot and duration. Opening/closing fades are
   intentional and visible in the real Canvas output.
6. The new **OVERLAY** row in Multitrack Timeline marks each independently
   timed picture-in-picture clip; click it to edit its parent shot.
7. Preview, review claims, export and inspect the completed result on a
   phone. All settings are persisted in project JSON and may be directed by
   a **manual ChatGPT `motion-chat-v1` patch**.

The separate overlay is composited after background art but before on-screen
text, so typography remains legible. It intentionally does **not** use
original video sound, change the base scene type or silently turn PNG
screenshots into animated video. Only **one** second image is supported per
scene in v1, and the browser timeline still has eight scenes / 64 seconds.

## Same-source portability

`04 / PORTABLE FILM` now includes **all approved base media and overlay images**
in the offline `.motionzip` archive. Original file bytes, scene cue positions,
camera direction, video inpoints, project audio and brand settings survive.
Archive import remaps **both** main-shot and overlay source IDs to newly
imported media files, protecting pre-existing media. The archive still
has a combined 128MB cap, up to 18 media/audio items in its manifest.

An offline H.264/FFmpeg master accepts the still source through the same
operator-local `--media-map` file already used for per-shot source footage.
The browser doesn't upload source images to Vercel or OpenAI, and the public
Chat Pack still contains **only references**, never private media bytes.
If an overlay is absent on a different device, quality preflight blocks
rendering, instead of claiming that a placeholder represents real evidence.
An MP4 incorrectly used as overlay is rejected; for moving source footage,
attach it as the base scene.

### ChatGPT patch example

```json
{
  "protocol": "motion-chat-v1",
  "action": "patch",
  "expectedBrand": "promptence",
  "expectedTitle": "REPLACE WITH EXACT PROJECT TITLE",
  "changes": [{
    "target": "scene",
    "index": 2,
    "set": {
      "overlayCorner": "bottom-right",
      "overlayOpacity": 0.85,
      "overlaySize": 0.30,
      "overlayStart": 0.4,
      "overlayDuration": 3.1
    }
  }]
}
```

Use the current Copy Full Project command and ask ChatGPT to refine this
patch. The user must **preview and explicitly approve** it. The AI does
not gain access to browser-local media or remote application control.

## QA and known limitations

`npm run motion:test-overlays` checks the mathematical layer time gates,
positioning within landscape/portrait/square, fade behavior and bounds;
`npm run motion:test-bundle` tests original main-video + overlay-image file
roundtrip, fresh ID remapping, voice/music and tamper-proof ZIP CRC32.
Both run in **Vercel prebuild** in addition to the ordinary Next/TypeScript
build, independent of GitHub Actions runner availability.

This does **not** prove a fully professional editor with multiple video
overlay tracks, arbitrary keyframe curves, an SFX track, 2-minute browser
timelines or natural generative voice. The photo still needs to be legible
and source rights/claims reviewed by the owner. Validate a rendered film
with original media on an actual browser and phone before publishing.
