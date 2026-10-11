# Motion Studio / Interaction Cinema V1 — REAL CLICKS

**Mission:** replace passive website screenshots with recorded, **genuine** browser actions inside the original Margaryan Motion Studio. This is a new source type and creator workflow *in the existing product*, not a parallel application, fake dashboard, AI video API or cloud recording service.

## What the owner gets

From the main Motion Studio **CREATE FILM** launcher choose **Кликающее демо / REAL CLICKS** (first production-ready pilot is **Promptence only**). It creates a safe editable cinematic product storyboard with eight timed media shots, ready for real original video. This **does not automatically start cloud recording**.

On an operator workstation with Node ≥22, **Playwright**, Chromium and FFmpeg:

```bash
npm run motion:interaction -- --out out/motion/promptence-interaction
```

The operator-only capture visits the publicly available `https://promptence.tech` in an anonymous context, dismisses the actual new-visitor onboarding with its real Skip button, and directs actual mouse movement, actual read-only click events, smooth scrolling, and progressive typing into the public Free Check form. The film **never clicks Run Free Scan**, never submits a form, never buys credits or pretends to have observed AI recommendations.

This script presently records this reviewable sequence:

1. Real landing page + mouse focus.
2. Click the public Free Check anchor.
3. Type `promptence.tech` in the domain field (no submit).
4. Type the public brand name.
5. Type the sample market.
6. Type the category.
7. Click the real **Local AI** mode radio.
8. Click the real **AI visibility** mode radio.
9. Click the public **Evidence** navigation anchor.
10. Click the public **How it works** anchor.

The entire browser recording is actual source pixels. Cursor glyph and touch feedback are a local Motion visual layer; page behavior is real and click destinations are verified. Animations are generated without neural inference. Outputs stay in the operator's working directory.

Files in the output folder:

| Path | Purpose |
| --- | --- |
| `promptence-real-clicks.mp4` | Original 1280×720 H.264 footage with visible cursor and real UI actions |
| `interaction-evidence.json` | Action timing, source URL, original video SHA-256 and pending review flags |
| `interaction-film.motion.json` | Original `motion/v1` editable eight-shot cut with exact video `mediaStart` inpoints |
| `interaction-media-map.json` | Local `mediaId` → original MP4 path for native Motion master |

## Turn the take into our actual Motion video

```bash
# Start the existing Motion editor in a local terminal
npm run dev

npm run motion:master -- \
  out/motion/promptence-interaction/interaction-film.motion.json \
  out/motion/promptence-interaction/promptence-cinematic-review.mp4 \
  --media-map out/motion/promptence-interaction/interaction-media-map.json \
  --url http://localhost:3000/motion \
  --fps 24 --crf 19
```

For native **click-synced sound design**, use the real action manifest to add subtle interaction sound effects to our own procedural Motion score. Nothing is sourced from third-party generators:

```bash
npm run motion:interaction-score -- \
  --evidence out/motion/promptence-interaction/interaction-evidence.json \
  --project out/motion/promptence-interaction/interaction-film.motion.json \
  --out out/motion/promptence-interaction/click-scored.wav

npm run motion:master -- \
  out/motion/promptence-interaction/interaction-film.motion.json \
  out/motion/promptence-interaction/with-real-clicks.mp4 \
  --media-map out/motion/promptence-interaction/interaction-media-map.json \
  --music out/motion/promptence-interaction/click-scored.wav \
  --url http://localhost:3000/motion
```

For original **approved** voice/music, use the normal `--voice /original.wav --music /licensed.mp3` options. The existing built-in Motion procedural score is used by default. The film's scenes use the newly introduced **showcase** stage, almost 16:9 inside 9:16, so most of the real website remains visible rather than being destructively cover-cropped. The other familiar camera styles remain available. Browser-local production requires importing both `interaction-film.motion.json` and the real video as a private source; JSON alone is not footage.

## Deliberate quality and security boundaries

- Actual **clicks in a recorded MP4** are visual documentary evidence, **not clickable player hotspots** for the video viewer. True clickable branching web demos require a separate HTML interaction/player mode and cannot be exported as an ordinary MP4.
- `TARGETS` is an explicit allowlist of public controls. Clicking is limited to `#` hash-navigation anchors and known radio buttons with `type=button`. Every action is validated against the live DOM. Typing is limited to named **non-sensitive public demo fields**. A live scan, paid action, submission, account login, permission change or connected private workspace step is disallowed.
- A changed UI selector or unsafe DOM target **blocks recording**, rather than scripting arbitrary clicks and risking a charge.
- No password/cookie/account/customer data is recorded. HTTPS requests are restricted to the official public host and font CDN during capture. Source assets and action logs are stored locally.
- The example domain and other typed fields are **demonstration inputs**, not a completed scan. Actual results require owner-supplied approved footage, never generated mock AI reports.
- `interaction-evidence.json` starts with **PENDING_HUMAN_REVIEW**. After the owner genuinely reviews original capture rights, privacy, copy and claims, voice, and music, the operator can mark the corresponding fields approved. The native `--release --capture-manifest interaction-evidence.json` mode then requires the **unchanged SHA-256** of the original recorded browser video, safe timestamped read-only interactions, approval of all five human gates, acceptable framing and no unresolved critical Director warnings. Approval is never inferred from a successful render. Human review of the final encoded commercial remains mandatory.
- The recording takes time proportional to source actions. There is **no always-on keyless cloud capture service** in this release; Playwright and FFmpeg run locally on a workstation.

## Next engineering levels

1. **Shot-aware camera follows click target** and automatically reframes without hiding product labels.
2. **Record internal workflows** only through consented, isolated demo accounts and separate allowlists; hide secrets and personal data by design.
3. **Native recording UI + local worker queue**, recording progress and retry management from Motion Studio without CLI.
4. **Audio Direction** with approved high-quality local voice, aligned narrator beats, SFX for real actions, intelligibility/loudness checks.
5. **Browser interactive story player** (separate from MP4): semantic hotspots, chapters, replays and accessible keyboard navigation, without pretending a video stream itself can receive original browser clicks.

The target product is **one Motion Studio**: live real-source recording → director → editor → audio → preview → QA → truthful commercial release.
