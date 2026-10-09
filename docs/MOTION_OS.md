# MARGARYAN MOTION OS — Portfolio Core v0.4

## Running capabilities

Studio at /motion is a self-contained programmable motion-graphics editor. It is not a pretrained text-to-video neural network and not yet a dedicated cloud render farm.

The portfolio catalog (lib/motion/portfolio.ts) contains ten product IDs, editable creative direction and provenances. Private repo identifiers are intentionally not included in the publicly deployed client code. Four original source-verified marketing SVGs are bundled: Promptence, INGU, VETO SPORT and VETO PRIVATE; other product logos are pending review. Unapproved logos fall back to typography and a visible warning rather than fake generated icons.

The local director supports English, Russian and Armenian, specialized seven-shot Promptence copy, and product-specific closing messages. Product compositions include symbolic vector motion for AI search, crypto market decisions, restaurant operating systems, fashion editorial, Dubai architecture, automotive discovery, Telegram controls and Armenian exports. These are illustrated concepts, not fake live screenshots.

The media pipeline supports uploading a narration file in the browser for optional voiceover plus an original synthesized backing score. A single audio stream is captured with the canvas. Voice is not automatically generated without a separate voice provider. The existing export is browser MediaRecorder, usually WebM, with browser-dependent MP4 compatibility.

## Source discovery without leaking private GitHub data

Run the brand scanner from an authenticated operator machine:
  npm run motion:scan -- owner/repo [branch]

It reads GitHub repository trees, ranks candidate marketing SVG/PNG marks, finds style files and high-signal CSS colors, and emits a review-required metadata manifest. It never exports source code, secrets, credential values or arbitrary private files.

Public GitHub repos can be scanned without a token (rate limits apply). Private repositories require a separately authorized operator-scoped GITHUB_TOKEN or the connected GitHub app during the assistant workflow. A public website cannot access the user's private GitHub repositories without authorization. Never expose GitHub tokens to the browser or in logs, and never publish unreviewed private repo content.

Workflow: identify repo with authenticated GitHub connection → scan current source → review official logo and brand tokens → copy approved public marketing assets into the Distribution bundle → build director-approved storyboard → render frames → upload approved VO if needed → run QA → produce final media.

## Production quality gate

Browser QA reviews: nonempty scene copy, structural story arc, composition variety, duplicate headlines, risky guarantee language, selected language versus script, scene durations, approved logo provenance, and representative rendered frames for transparency/blankness. It deliberately reports source-pending logos as warnings.

Full media checks on an exported file:
  npm run motion:verify -- path/to/export.mp4 --require-audio

The verifier uses ffprobe for codec, resolution, duration, FPS, audio presence and formats, and FFmpeg blackdetect if available. It can catch technical failure but cannot guarantee aesthetic quality, lyric/music licensing, localization correctness or factual validity.

No invented AI vendor answers, customer performance improvements, financial results or ranking guarantees may be portrayed as factual. Any graphics simulating workflows must be labeled illustrative.

## Production-standard creative process

1. Inspect the latest real product repo for logo, fonts, brand colors, design components, copy and product purpose.
2. Develop narrative (hook, customer problem, illustrated mechanism, product reveal, evidence-based process, CTA) with at least 3 composition types.
3. Make separate language adaptations for EN, RU and HY. Ensure Armenian glyph coverage and exact font rendering in a real visual test.
4. Render from real marks and procedural geometric/UI motion, not inconsistent synthetic logos or fabricated screenshots.
5. Mix verified speech and music at controlled levels; check actual encoded audio stream.
6. Preview at least 8 frames plus first/last holds in each target aspect ratio; check text safe area for Reels/TikTok and mobile.
7. Verify output at 1080x1920 or another selected format and test audio, frame pacing and MP4 compatibility when delivered.
8. Publish only after a human approves the content, factual claims and creative output.

## Technical and security boundaries

The studio remains keyless for motion graphics, local script composition and export. Private-repo sync requires GitHub authorization; commercial TTS requires a voice provider or previously recorded VO; deterministic H.264/AAC and 3D/complex Remotion need additional worker infrastructure. Those production features are not falsely marked complete.

Only /motion and the existing stateless /api/motion/storyboard are public. This update introduces no new anonymous access to Distribution CRM, GitHub tokens, outbound contacts, protected operator routes, billing, or execution systems.
