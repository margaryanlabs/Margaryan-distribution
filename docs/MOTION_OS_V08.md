# MARGARYAN MOTION OS v0.8 — Camera, Original Score, Source-Faithful Product Screens

## What shipped in code
- **Scene-bound original soundtrack**: `scripts/motion/score-film.mjs` synthesizes a deterministic PCM16 44.1 kHz WAV. Mood changes by brand/scene, kick pattern changes by shot type, electronic transition whooshes follow exact cut timestamps. No licensed samples, voices, network calls or AI model credits.
- **Reliable MP4 audio by default**: `npm run motion:master` automatically synthesizes and mixes this score into H.264/AAC unless an approved external `--music` is given or `--silent` is explicitly set. Uploaded narration remains separate from licensed/generated music; its length is checked, and the original score is ducked underneath it.
- **Actual software 3D projection**: `lib/motion/camera-rig.ts` calculates x/y/z rotation, pinhole depth projection, perspective foreshortening and authored small camera dolly/drift for visual sets. It is **not GPU ray-traced photorealistic 3D**. Real text/logo assets stay on separately protected planes.
- **Original product screens**: Screenshot image slots are browser-local PNG/JPEG/WebP uploads, up to 12MB. Selecting `Real product screen` in a scene renders the **actual uploaded pixels** inside a camera-driven UI frame. Images are never generated, sent to a server, persisted in LocalStorage or embedded in saved JSON. Without the image, structural QA blocks publishing.
- **Reproducible offline screenshots**: `npm run motion:master -- project.json master.mp4 --screen ./approved-shot.png` injects the operator-supplied source image directly into the local Chromium instance. Do not claim it was sourced from a repo unless its provenance has been reviewed.
- **Public-source acquisition**: `npm run motion:capture -- --brand promptence` captures actual anonymous public desktop/mobile home screens only from a small official-site allowlist. Playwright blocks cross-site scripts/network and never shares cookies; all screenshots and a SHA-256 provenance report are stored in ignored `out/motion/screens` with `PENDING_HUMAN_REVIEW` status. Nothing is auto-committed, auto-published or presented as a customer result.

## Operator commands
First install project dependencies, Playwright Chromium and FFmpeg on an authorized workstation, and start the local Next.js app.

```bash
npm run dev

# Generate your storyboard with keyless director, then deterministic H.264/AAC + original soundtrack.
npm run motion:film -- --brand tun --lang hy \
  --brief "Ստեղծիր 24 վայրկյանանոց կինեմատոգրաֆիկ գովազդ TUN-ի համար" \
  --out out/tun-hy.mp4

# Record a source-faithful public screenshot from an allowed brand (separate operator workflow).
npm run motion:capture -- --brand promptence --out out/motion/screens
# Inspect captures and SHA-256 manifest manually; ensure no personal data, third-party rights, or incorrect UI.
# Do NOT treat captures as marketing-approved until a person signs off.

# For a source-screen shot, set kind=screen in a motion-project.json and supply reviewed screenshot.
npm run motion:master -- ./motion-project.json ./out/master.mp4 \
  --screen ./out/motion/screens/promptence-desktop.png \
  --voice ./media/approved-voice.wav

# Skip original score only if silence is truly intended:
npm run motion:master -- motion-project.json film.mp4 --silent

# Test synthesis contract (no FFmpeg, no external keys):
npm run motion:test-score
```

## Quality and truthful reporting
- A successful Vercel build proves the public Studio compiled; it **does not prove** the complete offline render and voice pipeline ran. The `motion:test-score` test verifies deterministic audio data; operator media verification checks actual FFmpeg encoded output.
- Source screenshots can contain personal data even on a public page. A human must review captures before advertising. Never capture logged-in dashboards automatically.
- Music is synthesized from scratch, has no third-party copyright samples and does not impersonate a composer. This does not confer music rights for an outside score provided by an operator.
- Do not invent statistical performance, cash returns, client testimonials or claims of live product behavior. Source-faithful screenshot does not itself verify data provenance.
- The offline system requires Chromium, Playwright, FFmpeg and a running local Studio; Vercel functions do not perform heavy MP4 rendering yet.
- This release does **not** implement autonomous AI art criticism, actual lip sync, GPU 3D geometry/Blender/Cycles, or turnkey remote GitHub screenshot capture. Those remain future work.

## Verification performed
- Synth script exercised on an offline 12.6s TUN sample: ffprobe confirms 44.1kHz PCM16; rerun outputs byte-for-byte identical SHA-256.
- Standalone proof encoded a 2.0s H.264/AAC MP4 from that original WAV soundtrack with local FFmpeg.
- Actual production Studio Vercel preview is verified separately before merge.
- End-to-end local Studio-to-MP4 with approved screen injection still requires render-workstation testing before release claims.
