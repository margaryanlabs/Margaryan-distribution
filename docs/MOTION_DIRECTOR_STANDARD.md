# Margaryan Labs — Motion Director Standard v3
**Default for all product trailers and short ads.** This is the acceptance standard, not a claim that every effect is implemented in the browser editor.

## Design mandate
A film is not a slide carousel. Every creative request must receive an authored, self-contained narrative and clearly different compositions. For a 15–35 second brand film:

1. **Hook:** Establish a conflict or disruptive truth in the opening 0–2 seconds; readable without sound.
2. **Story:** Show a user's question/problem before showing our product; do not use unsubstantiated metrics or fabricated quotes attributed to AI providers.
3. **Demonstration:** At least one real or clearly marked illustrative interface; demonstrate search, source cards, decision loop, or evidence appropriate to the product.
4. **Reveal:** Author a dedicated hero moment with correct official brand mark and dominant brand color.
5. **Process:** Show actual product workflow using understandable steps, not empty “AI powered” claims.
6. **Closure:** One clear final line, product name and legible URL, held long enough to read.

## Minimum creative quality
- **Visual contrast:** Four distinct composition families across the short: editorial kinetic typography, cinematic motion geometry, illustrative product UI, product/logo hero. A list of seven headlines on the same background fails.
- **Motion hierarchy:** Every shot has a focal point, its own timing, entrance/exit cues, a different depth/scale treatment; leave space for reading.
- **Audio:** A correctly cleared soundtrack, transition design and, where requested, naturally spoken VO ducked into the score. We must never claim voiceover is embedded without verifying the output audio track.
- **Brand fidelity:** Fetch official current brand assets. For Promptence use official emerald #4EE6A1, dark #07100C and ivory #F4F0E7; original Promptence v18 P monogram. No invented logos, sample logos or incompatible palette.
- **Human-centric:** Accessible captions/meaning without audio; safe margins for Instagram/TikTok overlays; no essential text in the top or bottom 12% of the portrait film.
- **Technical target:** 1080×1920, 30 fps, H.264/AAC, faststart, MP4 for a final client asset; optional 1:1 and 16:9 master variants.
- **Truthfulness:** Mark any fabricated demonstration data as illustrative. Never imply actual customer results, guaranteed ranking, model endorsement, or performance claims not verified.

## Keyless production
- Local procedural vector, Canvas2D, PIL/FFmpeg and WebAudio are acceptable and do not require OpenAI/Claude/OpenRouter.
- The web app /motion supports editable storyboards and browser recording. A film-grade master can use a separate offline renderer for reproducible frame-perfect 1080p H.264 exports.
- Commercial-quality voiceovers are not intrinsic to the no-key motion engine: voice generation may use a connected audio provider and must be mixed/verified separately. The embedded WebAudio generator is an ambient synth, not human narration.
- Respect licenses for any external fonts, music, images or footage. Never bundle fonts into shared user assets.

## Required QA before release
1. Review reference film's rhythm/composition rather than copying its assets or text.
2. Check 7–10 frames evenly across the film for alignment, margins, logo correctness, readability, and scene variety.
3. Inspect actual beginning, transition frames, and closing hold; ensure no blank/interrupted frames.
4. ffprobe the exported file; verify width, height, frame rate, duration, video and audio codecs.
5. Listen to the actual output; if no voiceover, label the soundtrack truthfully.
6. Ensure the product page URL and final CTA are correct.
7. Deliver a playable MP4 and optionally a preview contact sheet.
8. When changing the repository, test preview build before merging; do not claim GitHub CI success from a Vercel READY state alone.

## Promptence pilot — 30s director's cut
- 0–3.8: SEARCH IS CHANGING / the answer is the new front page.
- 3.8–8.4: YOUR CUSTOMER ASKS AI / illustrated AI query and answer UI.
- 8.4–12.7: WHAT IF YOU'RE NOT THERE? / explicitly illustrative visibility dashboard.
- 12.7–17.2: Official Promptence monogram and network-orbit reveal.
- 17.2–21.5: Discover → Measure → Diagnose → Improve → Verify.
- 21.5–25.1: Evidence workspace, explicitly illustrative, no fabricated measurements.
- 25.1–30: BE VISIBLE IN THE ANSWER / official mark / promptence.tech.

## How to respond to future creation requests
Assume professional directing, official assets, dramaturgy, typography, sound, originality and preflight QA are included by default. Do not wait for the user to ask for every extra transition or polish pass. Be explicit about limitations: this is procedural creative technology, not a proprietary neural text-to-video foundation model.
