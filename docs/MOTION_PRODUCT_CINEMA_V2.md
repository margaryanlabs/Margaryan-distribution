# Motion OS / Editorial Cinema V2 — production specification

## Goal
Turn a brief into an editable, **brand-truthful** marketing film rather than
a repeating orbital-text slideshow. This upgrade modifies existing
`/motion?mode=cinematic` without changing Quick Studio, source-proof films,
licensed music/voice import, WebGL 3D shots, or offline 1080p H.264 mastering.

## Included — actual implementation

**Promptence / Product Cinema** ships ten separate, time-addressable Canvas
concept compositions:

| Beat | Distinct visual mechanism | Truth gate |
|------|---------------------------|------------|
| question | Customer question bubble and active question mark | No pretend live AI screenshot |
| answer | An answer structure being revealed | Labeled schematic only |
| gap | Two-sided comparison with open question marker | No fictitious client absence |
| sources | Real graph-style 2D source relationships | Abstract; no named domains |
| diagnose | Diagnostic review rows with visual focus | Hypotheses, not verified causes |
| priority | Prioritization board with numbered stages | No fake financial/product scores |
| approve | Human approval verification motif | Concept only |
| implement | Four connected workflow stages | Not a report that implementation happened |
| remeasure | Paired schematic curves | Not empirical performance delta |
| close | Minimal brand-stage construction | Official mark rendered separately |

The ten are available in the **Scene Inspector** product-story selector.
The launcher creates an **eight-shot** story (8 is the existing supported
interactive-film limit) that samples the most relevant beats. The two
remaining beats are available as replacements in the picker. Includes English,
Russian, and Armenian authored copy; Noto Armenian text fitting remains
measured via the existing QA checks.

**Transitions:** `cut`, `dissolve`, `wipe`, `slash` (existing);
`zoom`, `slide`, `grid`, `flash` (new). All use the same deterministic
Canvas frame renderer (browser preview and workstation FFmpeg path). A
controlled flash does **not** rapidly strobe: there are no repeated flashes
in the default authored sequence. Do not claim WCAG flash-safety without
real photometric evaluation.

**Editorial quality selector:** Basic preserves old auto-cut grammar;
Premium uses quieter slide/dissolve/cut choices; Signature uses authored
8-step cuts with visible mask typography and scene-specific overrides.
Modes do not promise a measurable resolution improvement or generate new
photographic video pixels.

**Titles:** per-shot `editorial`, `mask`, `kinetic`, `minimal` reveal,
saved in project JSON and Director Pack. All glyphs remain browser-rendered
text and follow the original fit/safe-area constraints. QA reports dense
headlines and duplicate concept compositions instead of silently dropping
words or inventing shorter advertising copy.

## Usage, zero keys

1. Open `/motion?mode=cinematic` and select **Promptence**.
2. Click **CREATE PRODUCT STORY / 8 CURATED SHOTS**. Review the 8-shot film.
3. Set Quality to **Signature** (already selected in the preset).
4. Choose any shot. Under **PRODUCT STORY** change among ten distinct
   compositions. Set camera, transition, title reveal, narration copy and
   duration. Use the existing timeline to reorder shots and align voice.
5. Review visual contacts and export locally; **verified real product screen
   media must still be uploaded separately**. Avoid claiming these schematic
   cards are genuine AI answers.
6. For H.264 and approved audio, use the existing FFmpeg master workflow.

If a text brief explicitly asks for Promptence's `product story` /
`product UI` / `продуктовый ролик`, the keyless storyboard director
selects this authored story. It is not an LLM inference.

## Honest remaining constraints

- This is ten concept art motifs, not a text-to-video generative model, and
  not ten prerecorded video clips. A premium impression still depends on
  real product evidence, music, natural human/TTS audio, editorial choice,
  and QA of the output.
- Fully composited real interface video and a commercial Remotion runtime
  are not yet integrated into this particular pipeline. The existing
  source-first film and Quick Studio are kept separate.
- No accounts or API credentials, no AI agents, no external assets or
  third-party uploads were added by this feature.
- Maximum film duration is still 64 seconds in the Cinematic browser editor;
  longer films belong to existing operator-native sequencer workflows.
- A successful Vercel TypeScript/Next build does not prove artistic quality,
  client factual correctness, vocal intelligibility or browser GPU stability.

## Engineering validation

`npm run motion:test-editorial` checks the ten-beat library, localized
storyboarding, round-trip serialization, 8-shot bound, quality-mode
cut sequences, canvas state restoration, no cut paint, and invalid field
sanitization.

Retain existing `npm run motion:test-production`, `npm run typecheck`,
`npm run build`, and visual/audio evaluation of produced frames.
