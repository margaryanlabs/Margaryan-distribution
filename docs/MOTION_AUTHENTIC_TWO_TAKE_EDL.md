# MARGARYAN MOTION OS / AUTHENTIC TWO-TAKE FILM EDITOR

11 October 2026 — an additive improvement to the existing **Proof Director** and offline Master, in response to the original Promptence director's cut being a repetitive zooming slide show.

## What works

The ten-second source-first pilot now has an actual *edit-decision list (EDL)*:
- **Take 01 / source start (seconds):** which authentic part of the owner's MP4/WebM begins the introductory source footage.
- **Take 02 / source start (seconds):** another authentic portion of the source recording, not the same endless pan.
- **Film cut at:** one deliberately visible editorial cut between 3.5s and 6.5s (default 4.55s).
- **Camera framing:** 0.82×–1.18× source-preserving camera zoom.
- **Composition:** the real media rectangle respects its original aspect, rather than embedding a portrait screen in a wide blank card.
- **Safety:** the system blocks an export when an inpoint would run out of source video before its take ends. Previously this silently froze the final decoded frame and still produced a "cinematic" MP4.

Film timeline: 0–2.42s concise question, 2.42–cut time real first camera take, cut–7.55s authentic second take, 7.55–10s licensed brand finish. Actual products are captured, not fabricated. The browser can **compare RAW SOURCE / DIRECTED CUT** and download nine-frame contact sheets.

## Export/import portable edit project

Use **DOWNLOAD EDIT PROJECT** on `/motion/proof`. This writes a small JSON file with version 1, ten-second duration and these four numeric editorial settings. No product screenshot/video, customer data, account access or uploaded audio is embedded.

**LOAD SAVED EDIT PROJECT** restores these settings into the Proof Director with bounds checking.

The offline Master supports the **same JSON**:

```bash
npm install
npm install --no-save playwright
npm run dev

# Capture owner-reviewed real video — no AI API key:
npm run motion:capture-video -- out/promptence-source.mp4

# Import the video in /motion/proof, edit both genuine inpoints, save
# promptence-proof-10s-director.motion.json and review the nine-frame sheet.

npm run motion:proof -- \
  --video out/promptence-source.mp4 \
  --edl promptence-proof-10s-director.motion.json \
  --voice approved/natural-human-or-licensed-AI-voice.wav \
  --music approved/licensed-score.wav \
  --out out/promptence-proof-h264.mp4

# Or without a project file:
npm run motion:proof -- --video out/promptence-source.mp4 \
  --first-in 0 --second-in 4 --cut-at 4.55 --zoom 1.04 \
  --out out/promptence-test.mp4
```

This workstation-only render uses actual decoded video pixels and native 1080×1920 H.264 at 24–30fps. No PNG slideshow source or 720px video upscale.

## Technical validation

```bash
npm run motion:test-proof-edl
npm run motion:test-proof -- --video out/promptence-source.mp4
```

The first tests source inpoints, cut discontinuity, JSON persistence and no-frozen-video gates without network or customer data. The second requires a running local Next server, Playwright and FFmpeg, renders deterministic 9-frame images and produces an inspection sheet.

Vercel Preview READY verifies Next.js/TypeScript code. **Neither the EDL test nor an end-to-end actual approved MP4 has been executed by the cloud build in this branch**, and the repository's broader GitHub Actions are failing before executing runner steps. Thus visual excellence is **not claimed**.

## Acceptance required before long-form advertising

A director must view the 10s result on a phone, compare source-to-directed edit, and personally listen to the original recorded human/authorized AI voice. Reject wrong pacing, static footage, fake depth, unreadable UI, robotic speech, distorted audio, music that competes with speech, any fabricated claim or incorrect brand use. Only after the ten-second clip succeeds should more shots be produced.

There is still no fully automatic agent converting *any* text prompt directly to premium video. No paid API keys, model credits, account agents or public social posts were used or added.
