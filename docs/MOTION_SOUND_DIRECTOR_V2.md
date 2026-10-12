# Margaryan Sound Director v2 — actual speech-driven mixing

**Deployment:** same original Margaryan Motion Studio and owned Railway Chromium/FFmpeg worker. No voice/audio/video SaaS API and no third-party generative video model are introduced.

## What changed

Until v2, narration and music were combined with fixed music gain `0.16`. The music stayed just as quiet during *pauses* in speech, and the final encoded AAC was not measured for loudness. A renderer could therefore finish a technically valid MP4 even if its audio was badly balanced.

- `scripts/motion/audio-mix.mjs` cleans imported narration's low-frequency rumble (80 Hz high-pass) and gently compresses dynamic range.
- It retains an audible music bed (`0.62`) and derives an **actual audio sidechain** from the approved voice waveform. FFmpeg `sidechaincompress` reduces the score when voice is active and releases it between sentences. This is NOT scripted volume automation, and is NOT a replacement for listening.
- A final limiter and single-pass EBU R128 `loudnorm` target **-16 LUFS / -1.5 dBTP** are applied. These are engineering targets and may differ from measured results.
- Every rendered MP4 with an audio track now goes through `scripts/motion/qa-master-audio.mjs` which **measures the final encoded AAC**, checks non-silence, integrated loudness and peaks. The numbers are written into `*.render-report.json`; explicit human-listening and licensing flags remain false.
- The **owned Railway cloud worker** now reads that real render report and refuses to mark an MP4 `complete` unless the final AAC audio passes these measured gates. After seven days, soundtrack, caption and private director review sidecars expire together with the MP4.
- Problematic drafts get audio QA warnings. Commercial `--release` **fails closed** on measured audio problems rather than silently passing.
- Existing `--voice` still accepts **only locally authorized** WAV/MP3/etc. No private audio upload or voice cloning is implied.

## Reproduce

```bash
npm run motion:test-audio
npm run motion:test-sound-director
# with local Motion Studio running, a real consented voice recording and
# an editable project:
npm run motion:master -- path/to/project.motion.json out/review.mp4 \
  --voice path/to/approved-narration.wav \
  --url http://127.0.0.1:3000/motion
node scripts/motion/qa-master-audio.mjs out/review.mp4
```

A genuine FFmpeg sidechain fixture (speech-frequency tone active only in part of a film) was tested offline: the same 440 Hz background music component measured approximately **0.2534** between speech and **0.0407** during speech. This is signal-level proof of ducking, **not** an advertisement-quality voice sample.

## Remaining production requirements

1. The **cloud** Promptence preset is still original music-only. Producing an authentic humanlike voice requires an approved, tested local neural voice model on a capable machine or a consented human recording. The existing `scripts/motion/local-chatterbox-voice.py` is an *optional* GPU tool, not a verified Railway workflow (current render worker has only 1 vCPU / 3 GB RAM).
2. Sidechain mixing must be reviewed by listening to narration over the actual scene cut, not just checking LUFS.
3. Film edit and real-world image authenticity remain governed by the existing release QA, independent of the audio change.
4. No new Railway paid render is automatically launched by this patch. On approval and sufficient quota the user may launch a new review draft via the existing owner console.
