# MARGARYAN MOTION OS v1.0 — REFERENCE LAB & MONOTONIC DIRECTOR

## What changed in existing system

The prior Motion OS could render, measure typography, and automatically modify camera shot styles. It did not reliably compare an existing human reference film to its own output. The repair loop could also accept changes that made measured QA worse. This version addresses both.

### In-browser reference lab
From `/motion`:
1. Choose the current film and language (one of 13 portfolio brands).
2. Load a **user-supplied** MP4/WebM/MOV marketing reference into `REFERENCE LAB` (max 150 MB; codec must decode in browser). Its original bytes are not sent to any API, stored in localStorage or committed to Git.
3. Click `COMPARE FILM & REFERENCE`.
4. Eight relative timeline moments are sampled and rendered side-by-side in a contact sheet. The process calculates descriptive luminance, within-frame contrast, color saturation, proportion of dark pixels, edge detail and difference between successive sampled moments.
5. The browser downloads a paired PNG contact sheet and JSON signals plus cautionary notes. No generative image/video tooling and no film footage copying occur.

**Truth boundary:** This is *not* an AI creative quality score, edit-cut detector, video plagiarism check or objective proof that one film is "better" than another. Aspect ratios and story/content can differ, and simple statistics alone do not capture cinematic direction. The reference may inspire a review of the visual rhythm while leaving trademarks and copyrighted original content untouched.

### Actual encoded MP4 reference analysis
A parallel operator CLI measures real, finished MP4/MOV/WebM decoded frames instead of preview-only graphics:

```bash
npm run motion:compare -- ./out/our-film.mp4 ./media/reviewed-reference.mp4
```

Returns local `*.reference-report.json` and `*.reference-contact-sheet.png`. Frame pairs are center-cropped to common 320x180 display area (no aspect-ratio stretching). Source video is never edited, uploaded, or automatically added to the product.

The existing master workflow accepts an optional reference and includes comparison paths/signals in its media report:

```bash
npm run motion:master -- ./approved-project.json ./out/film.mp4 \
  --screen ./approved-product-screenshot.png \
  --voice ./approved-voice.wav \
  --reference ./media/reviewed-reference.mp4
```

This requires the operator's own FFmpeg/ffprobe, Chromium/Playwright and running local Motion Studio. It is NOT remote cloud rendering and does not require OpenRouter credits.

### Safety of automatic scene repairs
The v0.9 `repairMotionProject` occasionally accepted a visual-style change based on a heuristic even if inspection got worse. The director now scores **measured defect debt**, separates serious typography/blank frames from repetition suggestions and **reverts a candidate change when measured debt does not decrease**. The complete attempted-but-rejected change remains in its JSON history as evidence.

This new guard is deliberately conservative: subjective artistic improvement is not inferred from having fewer checks. It never rewrites claims, never changes approved brand colors, never fabricates source UI and never discards original text.

### Blocking actual text overshoot
The visual reviewer now treats **any actual text-geometry warning** (including support copy exceeding line count) as a blocking measured issue, rather than letting some text overflows pass on an incomplete regex.

### Concrete user reference comparison
A baseline eight-frame comparison was produced in the working artifacts between the user's original 35.56-second 1080×1298 marketing reference and the earlier standalone 30-second Promptence director-cut film.

The measurable difference highlights a creative opportunity: the reference contains product-in-context laptop footage and text highlighting, whereas the older Promptence film uses mostly original abstract typography and illustrative UI. Future film work should use authentic, permission-cleared product screenshots and contextual live footage rather than mimicking copyrighted reference frames. **These conclusions require creative judgment; they are not generated from a fake similarity percentage.**

## Tests and limitations

- `npm run motion:test-reference` generates two real 3-second synthetic MP4 assets with FFmpeg, runs the actual inspector, checks meaningful color difference and zero self-comparison error, and verifies the PNG contact sheet exists.
- `web` CI includes the codec/reference contract, conditional on the GitHub Actions runner actually starting. The existing repository's GitHub Actions jobs have reported infrastructure failures with no step logs; this release does not claim green CI until status confirms it.
- Vercel preview build verifies Next.js build and TypeScript compatibility, NOT hardware-dependent local media encoding.
- Human approval remains mandatory for multilingual grammar, soundtrack rights, authentic screenshots and artistic storytelling.

The update leaves Supabase, CRM, authenticated operator endpoints, external contacts and paid video models unchanged.
