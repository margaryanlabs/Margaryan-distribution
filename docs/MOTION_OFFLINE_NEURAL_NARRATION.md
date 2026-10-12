# Motion Studio — offline neural Narration Director (optional English beta)

**Goal:** a more natural voice than the old reference Piper path, generated on an operator-controlled computer and mixed by Margaryan Sound Director v2. No OpenAI API, Higgsfield video generator or SaaS speech API.

## Implementation

`scripts/motion/local-kokoro-narration.py` takes the existing native **Director production pack v1**, checks all shot start/end times and creates a single local 16-bit mono narration WAV aligned to the actual video scene cuts.

- Bounded 8 shots and 64-second project; captions/narration max 240 characters per shot.
- **ENGLISH ONLY** in this tested profile; no false promises of RU/AM output. For Russian, use the separately documented Chatterbox multilingual path (powerful machine required) or a real recorded speaker; Armenian needs a compatible approved voice model/recording.
- The language and selected voice must be from a finite allowlist; extreme speed changes rejected.
- Each spoken line is measured from the actual ONNX waveform. If too long, **fail with a clear message instead of truncating or accelerating**, and leave 0.5s clean tail for native FFmpeg timing.
- Reject silent, clipped, non-finite or too-small voice samples; fade each cue to prevent editing clicks.
- All model files are supplied as local paths, never downloaded automatically from production. Generating requires explicit `--approved-model-rights`.
- `--dry-run` verifies timing and returns JSON without loading a model, network transfers or creating speech.
- `status: WAV_READY_NEEDS_HUMAN_REVIEW` is an engineering artifact status, not an approval of prosody, accent, pronunciation or rights.

## Install on an owner-controlled machine

The open Kokoro-ONNX project documents offline Python speech synthesis using a local `kokoro-v1.0.onnx` model and `voices-v1.0.bin` file. Verify the **exact weights/voice model license**, redistribution terms and SHA-256 of downloaded assets before commercial use. The model assets and any voice samples should remain in private operator storage, not GitHub.

```bash
python3 -m pip install --upgrade kokoro-onnx numpy
npm run motion:voice:offline -- path/to/production-pack.json \
  out/approved-narration.wav \
  --dry-run

npm run motion:voice:offline -- path/to/production-pack.json \
  out/approved-narration.wav \
  --model /private/models/kokoro-v1.0.onnx \
  --voices /private/models/voices-v1.0.bin \
  --voice af_heart --speed 0.98 --approved-model-rights

# FIRST: listen and approve the real audio and revise the editorial text.
# THEN: use native first-party renderer's built-in voice sidechain mix:
npm run motion:master -- project.motion.json out/review.mp4 \
  --voice out/approved-narration.wav \
  --url http://127.0.0.1:3000/motion
```

The existing Sound Director v2 automatically sidechain-ducks music during actual speech, restores music between sentences, normalizes loudness near -16 LUFS and measures final AAC levels in `*.render-report.json`.

## Important boundary: this is **not** an activated Railway voice service

Our running Railway render worker currently uses 1 vCPU and a 3 GB memory limit. This optional Python model and its weights **are not installed there** and have not been verified for runtime or voice naturalness on that host. No extra cloud charges or automatic voice downloads are initiated by this code. A voiced cloud job will require separate capacity profiling, license approval, real listening/QA and a controlled owned worker deployment.

Tests without model or network:

```bash
npm run motion:test-voice-offline
```

See also `docs/MOTION_SOUND_DIRECTOR_V2.md`, `docs/MOTION_VOICE_BOOTH_CLEAN_FILM_V1.md` and `scripts/motion/local-chatterbox-voice.py`. The latter is a separate, more compute-intensive multilingual option; do not confuse either script with a ready one-click professional audio service.
