# Motion PRO — Film Sequence Studio v1

The original Cinematic Studio stays a bounded 1–8 shot / <=64 second editor. Sequence Studio now groups up to eight independently editable chapters into one versioned long-form film: max eight chapters × eight shots × eight seconds = 512 seconds.

## Browser workflow — no OpenAI API

Open /motion?mode=cinematic and use Sequence Studio in the director sidebar. Create your first chapter with existing Cinema/Chat Operator, save it with **ADD CURRENT AS CHAPTER**, and use **SAVE ACTIVE CHAPTER** after any edits. Choose **NEW CHAPTER**, edit another normal 1–8 shot film, and save it. Chapters are editable individually with the **EDIT** button. The sidebar tracks cumulative duration and shows unsaved-change warnings. Use **EXPORT FULL FILM MANIFEST** to download a JSON file containing chapter metadata and scene instructions, not original media bytes, keys or network links.

You can provide the file to ChatGPT to rewrite an entire film or individual chapters, then import the result. This is a local file exchange, not an automatic agent. Drafts persist to browser localStorage only, not to a cloud storage account. Editing a new chapter does not automatically change the other saved chapters.

## Workstation mastering

Prerequisites: Node >=22, running local Next Motion Studio (npm run dev), Chromium/Playwright (npm install --no-save playwright), FFmpeg/ffprobe, sufficient CPU/storage.

First inspect the timeline without running Chrome or FFmpeg:

~~~bash
npm run motion:sequence -- path/to/film.motion-sequence.json ./out/feature.mp4 --dry-run
~~~

Then render each real chapter and concatenate actual H.264 video streams:

~~~bash
npm run motion:sequence -- path/to/film.motion-sequence.json ./out/feature.mp4 --fps 30 --crf 18
~~~

For owner-approved footage, pass the same local asset map already used by Motion Master:

~~~json
{"approved_media_0123":"/absolute/path/to/approved-source.mp4"}
~~~

~~~bash
npm run motion:sequence -- path/to/film.motion-sequence.json ./out/feature.mp4 --media-map ./approved-assets.json
~~~

Optional owner-provided, approved narration and licensed music:

~~~bash
npm run motion:sequence -- path/to/film.motion-sequence.json ./out/feature.mp4 --voice ./approved/narration.wav --music ./approved/licensed-track.mp3
~~~

Global audio uses silent per-chapter masters, then mixes continuous voice/music onto the full film. Without global audio the film contains separate original synthesized chapter soundtracks (and may have musical discontinuities at the joins). --silent produces a silent film and is incompatible with external --music/--voice.

## Output

- feature.mp4: real local video output, H.264 and AAC unless explicitly silent.
- feature.on-screen.srt: timed designed titles only, not claimed speech transcription.
- feature.chapters.json: editorial navigation timecodes.
- feature.sequence-report.json: final codec, duration, chapters, audio and QA scope.
- feature-sequence-parts/: original chapter video, review contact sheets, director QA, recorded input projects.

Every chapter is sent to the EXISTING render-master.mjs path, preserving genuine source decoding and per-shot coverage gates. The script verifies each chapter with verify-render.mjs and checks stitched film duration, dimensions and audio with ffprobe.

## Known limits and next work

- **New browser workprint:** saved graphic-only chapters can be previewed consecutively and recorded as one 720p/24fps silent WebM/MP4 file up to 192 seconds using the existing Canvas engine. This is real browser recording, but not a multi-track NLE or a frame-perfect FFmpeg master. Capturing in a background tab is deliberately cancelled.
- Genuine approved source-video/image-overlay mastering, continuous voice/music and full H.264 QA still require an operator workstation with Chromium and FFmpeg. No hosted MP4 job queue, automatic video model, free human TTS voice, subscriptions or multi-tenant storage is claimed.
- Real cuts at chapter boundaries, not frame-smooth cross-chapter transitions. Manual editorial and source review required.
- Final film may be too long for some social-discovery placements. Produce different platform edits.
- Public GitHub/Chat Pack workflows must never receive private client assets, secrets, unlicensed clips or confidential briefs.
- A passing Next/TypeScript build is NOT sufficient to claim that a professional final MP4 has passed human AV review.

## Validation

Run npm run motion:test-sequence for 3 chapters × 8 scenes × 8 seconds (192 seconds), malformed input rejection, unsafe-path checks and a true no-render --dry-run. Also run npm run typecheck && npm run build and an actual local two-or-more-chapter audiovisual encode before launch. Test mobile browser save/import, storage quota, unsaved state and Unicode captions.

## ChatGPT one-click feature-film import (beta)

The companion Content Studio plugin branch (PR #55) now includes
`create_motion_feature_film`: a ChatGPT-authored 9–24-scene proposal
(65–192 seconds, 2–3 chapters) transported through the URL fragment
`#motion-sequence-v1=<base64url manifest>`. This is **not** a remote
AI-text-to-video render: the model authors the scene copy and pacing,
and the Motion OS preview/editor owns the actual local graphics production.

The Sequence Studio checks the incoming link before modifying any project:
- Base64url characters and length are validated, and UTF-8 JSON parsed with
  strict decoding; fragment is removed from browser history on arrival.
- The chapter count, brand, aspect ratio and 2–8s scene lengths are checked,
  and remote media URLs rejected.
- A visible **ChatGPT → Film / Review Required** panel shows chapter titles,
  total duration and scene count. The user explicitly approves or discards.
  Saved local chapters are not replaced without approval; no existing chapter
  is auto-loaded or rendered.
- A **Master Timeline** shows every saved chapter and the relative duration
  of every shot; clicking an act loads that chapter into the existing editor.

**Combined integration PR #61** brings the feature-film tool and Sequence Studio together on the current main branch while preserving real source media, Voice Booth, approved ZIP bundles and image overlays.
Vercel-ready code is not proof of an installed/approved ChatGPT plugin
or a tested final audiovisual MP4.

The current fragment transport has a 20KB manifest / 26k characters limit.
For longer films, use a local JSON file and Sequence Studio import. Fragment
links are not encrypted; do not share confidential commercial scripts.

**Editorial direction:** Write actual story beats, not repeated abstract
copy. Use product screenshots only from user-approved original footage,
respect official brand marks, and check the complete 120s exported MP4
manually before distributing it.

## Browser visual workprint — no workstation required

Open Sequence Studio and choose **TRY 120s DEMO → APPROVE & SAVE FILM**,
then **PLAY WHOLE FILM** for a continuous chapter-by-chapter preview or
**EXPORT VISUAL FILM** to record the composed graphic frames in the user's
own browser. Browser capture is user-initiated, runs in real time with the
page visible, and exports the codec supported by the device; it never
pretends a silent WebM is an MP4 with professional sound.

The testable `planBrowserFeature` contract refuses chapters containing
approved source-video/screen/overlay bindings or signature art because the
browser preview-only exporter cannot guarantee frame-perfect decoding or
media provenance for them. Those projects must use `motion:sequence` on a
workstation with real media maps and licensed voice/music. The 192s
browser maximum is intentionally lower than the workstation's 512s cap.

Run `npm run motion:test-film-browser` to verify the 120s/192s timeline,
source exclusions, format and duration bounds. A successful TypeScript build
and the contract test do **not** establish actual browser codec support or
mobile end-to-end export; review a real downloaded video before release.

## Real local voice & licensed music in browser export

The Film Sequence **PLAY WHOLE FILM** and **EXPORT VISUAL FILM** tools
now have explicit opt-in local narration and music inputs, using the
existing recording hardware and the Web Audio API. These are
**user-supplied, human-recorded or rightfully licensed files**, not
AI-generated voice, scraped music or a free TTS model. Supported local
audio is bounded to 40MB per WAV/MP3/M4A/OGG/WebM/FLAC file; media rights
must be checked before preview/export is permitted. Nothing is uploaded.

When both tracks are present, the music is lowered to 19% while the
original narrator remains at normal playback volume. Music may loop to
cover the feature runtime; narration does not loop. The audio capture bus
is attached to the Canvas recording stream, monitors through the user's
speakers and is closed (including tracks/decoders) when stopped. Since
not all browsers can MediaRecord the same audio/video pair, the output
is MP4 or WebM according to supported codecs, never misnamed, and
should be reviewed with sound before publishing. This remains a
**browser workprint up to 192 seconds**, not cloud GPU generation.

Validation: `npm run motion:test-soundtrack` checks local-only file
constraints, explicit consent, durations, consent rejection, decoded
audio mix track, music-loop vs narration-once and cleanup; tests were
executed in a fresh Vercel Sandbox, alongside `motion:test-film-browser`,
`motion:test-sequence`, `motion:test-plugin`, and TypeScript typecheck.
These pass but do not constitute an end-to-end browser-decoded media test.

A real Playwright headless chromium test was attempted on the Vercel
sandbox. Even after installing OS shared libraries, the browser closed
while navigating the Next.js page; a downloaded final 120s sound-film
has **not yet been personally audited**. Gate production acceptance on
playback of a real exported MP4/WebM in a browser and on a phone.
