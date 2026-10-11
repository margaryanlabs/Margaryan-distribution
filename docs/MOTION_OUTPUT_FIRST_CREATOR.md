# Motion Studio — Output-First Creator v1

## Why this is a major change

The Studio has capable editing tools, but artists, customers and first-time
creators should **never** have to understand H.264, WebGL, source maps,
multi-track export architecture or eight-scene renderers before selecting
a simple objective: what kind of film do I want to make?

The new **choose-a-film launcher** is the first experience on a new
browser visit to `/motion?mode=cinematic`, while existing Quick deep links
still open Quick Studio directly.

A previously saved user can continue their existing project. All users
have **✦ Создать видео** within the Cinematic/Quick editor header and
**✦ НОВЫЙ РОЛИК** in the Cinematic project command bar.

## Five real destinations, clearly differentiated

| What the user chooses | Output expectation | Opens / what works |
| --- | --- | --- |
| Reels / Stories | Short 9:16 clip of *original user footage* | Existing Quick Studio, prefilled brand, format and language. User attaches real MP4/photos before export; no AI clip generation promised. |
| Кино-реклама | Cinematic typographic brand promo | For Promptence with no custom brief, opens the existing human-authored **36.5-second / eight-shot** 2026 Director's Cut; other brands/custom briefs use the original storyboard generator and safe auto-polish. This creates editable motion graphics, not invented product shots. |
| Демо продукта | Product explain video | 8-scene **~38-second** RU/EN/HY script containing **three deliberately empty real-interface shots**. Each needs approved original screenshot/video before export; there are no fictional app screenshots. |
| Большой фильм | 2–5 min chapters | Existing Feature Film assembler / chapter editing / workprint and local master workflows. Clicking the button does **not** falsely claim a five-minute MP4 has been automatically generated. |
| Реальный продукт | Promptence 10-second source-first pilot | Existing `/motion/proof` Director, which requires actual original Promptence pixels. No fake AI ranking, customer claim or approved output. |

Each card has bespoke visual direction, runtime expectation, source
requirements, short real-world description and the **next action**.
Small video-frame graphics inside the chooser are clearly identified
as **artistic representations**, not actual delivered films.

## A two-step decision, not 50 controls

1. Choose a film result from large visual cards.
2. Choose the brand, frame (9:16 / 16:9 / 1:1), title language
   (Russian / English / Armenian), and optionally describe the idea.
3. Press one button specific to that kind of film. The actual correct
   editing surface opens, with the relevant project settings and source
   limits already applied.

The launcher preserves existing users' work unless they explicitly
approve replacement. An existing editable Cinematic project can be saved
immediately as a JSON copy from the same screen. Original browser-only
footage should also be saved as a private Portable Film archive as needed.

## Quick Studio is now more approachable

The existing authentic-source Quick video editor has three prominent
plain-language steps with working jump buttons:

- **Загрузить видео** jumps to the first missing original shot's upload.
- **Изменить текст** jumps to the selected shot copy.
- **К готовому ролику** jumps to the real export control.

Source validity checks, audio and media rights remain the original
production system; the guides don't fake a success state.

## Delivery and release

Tests `npm run motion:test-start` are part of production `prebuild`:
choice constraints, correct mode/project mapping, missing screenshot
honesty for product demos, non-destructive resume/backup, editor handoff,
Quick source-first controls and responsive media queries.

**Not yet proven:** browser screenshots on actual Android/iOS and desktop,
end-to-end physical preview/sound checks, fully human-approved Promptence
MP4, live commercial inquiry delivery (inbox still needs configuration).

This release improves the **first creative decision**, not the backend
generation capability. The local renderer does not gain ChatGPT API
access or cloud TTS/AI-video magic from this UI release.
