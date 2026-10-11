# Motion OS — Private Portable Production Bundle v1

## Why this matters

A normal Motion Chat Pack contains a storyboard and timing, **not media
bytes**. A shot can refer to a local `mediaId`, but a new browser cannot
find its original MP4. In v1, the **04 / PORTABLE FILM** tab can export
one binary `.motionzip` with the editable project **and** its approved
video/screenshots and current human voice/licensed music, without an API key,
agent, server upload, database migration or connection to ChatGPT.

This is not the finished MP4. It is the **editable production source file**.

## Create the file

1. Open `/motion?mode=cinematic`, choose and finish your current film.
2. Upload genuine footage through **MEDIA LIBRARY**, confirm ownership /
   permission, and attach it to scenes. Supply human voice and score as
   desired.
3. Select **04 / PORTABLE FILM → EXPORT COMPLETE PORTABLE FILM**.
4. Save `motion-<brand>-<timestamp>.motionzip` privately.

The ZIP uses only **STORED** entries, with checked CRC32, contains:
`manifest.json`, one `assets/<id>.bin` per referenced approved source,
and optional `audio/voice.bin` / `audio/music.bin`. Manifest records
original names, types, scene framing, source inpoints, grade, narration
timings and rights-relevant media roles.

No private recording is embedded in the *public* Chat Director channel or
plain Chat Pack. No upload occurs.

## Reopen the complete film on another device

1. Open the Motion Studio in a browser with enough local storage.
2. Navigate to **04 / PORTABLE FILM** and select the `.motionzip` file.
3. Review the staged title, brand, scene count, original media count,
   audio tracks and total bytes. **Nothing is changed during inspection.**
4. Confirm you own or have permission to use all imported original files.
5. Press **IMPORT PROJECT AND APPROVED MEDIA**.
6. Motion restores original file bytes into browser-local IndexedDB,
   generates new media IDs (to protect any pre-existing files), updates
   video shot IDs, and reconnects the human voice and music.
7. Check framing, source authenticity, playback and audio before export.

The project can be reverted via the existing one-step editor Undo, but
imported files are separate approved media entries you can delete manually
in Media Library. Removing an imported media file will make any shot
referencing it fail preflight until restored.

## Security and compatibility

- Hard ZIP cap: **128MB**, up to 22 entries. v1 intentionally refuses
  compressed/encrypted/ZIP64 input and disallows path traversal, duplicate
  file names, unknown extra entries, mismatched source counts and checksum
  corruption. Do not treat arbitrary internet ZIP files as trusted.
- Project can reference up to eight different original source media clips
  under existing Cinematic limits.
- A normal clip can be up to 100MB, screenshots 12MB, narrator 15MB, music
  30MB. The **combined ZIP cannot exceed 128MB**.
- ZIP files contain potentially confidential recordings, customer screens
  and unreleased branding. **Never commit a portable film to public GitHub.**
- Import is deliberately **manual**, never agent-triggered, and requires
  a rights checkbox. The archive is parsed locally.
- Browser memory and IndexedDB capacity are limitations; a large pack may
  fail on older phones. Save irreplaceable originals separately.
- The library stores approved original sources, but the browser cannot
  automatically verify ownership or copyright.
- Strict MIME roles and no executable scripts are supported. Original
  footage may not decode on all devices, regardless of ZIP validity.
- No proprietary codec, AI model or external transcoder is bundled.

## Technical verification

`npm run motion:test-bundle` runs Node's pure ZIP/import tests:
- CRC32 known vector, archive entry roundtrip, corruption and path traversal.
- Source media roundtrip with original bytes preserved.
- Recorded voice + licensed score restored as real File objects.
- New local media IDs avoid overwriting previously saved footage.
- Explicit human consent is mandatory.
- Incomplete/foreign project-media maps are rejected.

`prebuild` also runs that suite before Next.js production builds, making
failures visible through the connected Vercel build even where GitHub Actions
runner startup fails. A real-browser imported-film and exported MP4 test is
still needed for final production proof.

## Role of ChatGPT

The assistant can still write scenes, camera direction, narration and
style as a Chat Pack *without* OpenAI API charges. The `.motionzip`
exists precisely because the user's personal media and voice must **not**
be placed in public Chat Pack JSON. This workflow is a private transfer
between devices, not autonomous two-way chat-to-browser access.
