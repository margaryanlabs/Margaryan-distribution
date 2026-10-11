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

- The browser authors multiple chapters but does not yet have one continuous NLE preview across all chapters; this is real sequenced mastering, not a single free-form editor.
- Requires the operator's workstation. No hosted MP4 job queue, automatic video generator, free human TTS voice, subscriptions or multi-tenant storage is claimed.
- Real cuts at chapter boundaries, not frame-smooth cross-chapter transitions. Manual editorial and source review required.
- Final film may be too long for some social-discovery placements. Produce different platform edits.
- Public GitHub/Chat Pack workflows must never receive private client assets, secrets, unlicensed clips or confidential briefs.
- A passing Next/TypeScript build is NOT sufficient to claim that a professional final MP4 has passed human AV review.

## Validation

Run npm run motion:test-sequence for 3 chapters × 8 scenes × 8 seconds (192 seconds), malformed input rejection, unsafe-path checks and a true no-render --dry-run. Also run npm run typecheck && npm run build and an actual local two-or-more-chapter audiovisual encode before launch. Test mobile browser save/import, storage quota, unsaved state and Unicode captions.
