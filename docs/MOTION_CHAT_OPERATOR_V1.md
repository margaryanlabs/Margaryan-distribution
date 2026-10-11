# Margaryan Motion OS — Chat Operator & Local Media Workspace v1

## Exactly what this implements

A real **in-place, no-agent** workflow in `/motion?mode=cinematic`:

**ChatGPT (this conversation):** writes a complete storyboard or targeted edit as
strict JSON, while staying responsible for wording, art direction and advice.

**Motion OS (the website):** validates that JSON, previews the changes,
requires a manual **APPLY APPROVED CHANGES** click, and redraws the real film.
The browser can create a keyless starter from its bundled brand information.
No external ChatGPT API key, AI generation credit, background agent, remote
fetch from the browser, or social publishing account is required.

This is **not a live connection between the ChatGPT app and the open website**.
There is a manual copy/paste or JSON file handoff (unless a future explicit,
authorized account integration is designed). I can additionally edit the
application's GitHub code in chats with that connector, but I do **not** have
access to your device's unshared private source clips or browser tabs.

### How to direct Motion from this chat

1. Open Motion → Cinematic Studio → **00 / PRODUCTION WORKSPACE**.
2. Select **01 / CHAT PACK** → **COPY FULL PROJECT** (or download the pack).
3. Paste the project here and ask: *"Make shot 2 clearer, change the type
   reveal to mask, increase motion grade to 0.8, leave all other scenes intact."*
4. ChatGPT generates a `motion-chat-v1` **patch**, not a new project.
5. Paste its JSON into **PASTE MOTION CHAT PACK**, press **INSPECT / PREVIEW**.
6. Motion displays exactly which fields would change, plus the target brand,
   title and number of scenes. Confirm **APPLY APPROVED CHANGES**.
7. A one-step **UNDO LAST CHAT PACK** restores the previous storyboard.
8. Save the project JSON and reattach approved media if opening on a new
   device. No media bytes are packed into exported JSON.

### Full project (create) protocol

```json
{
  "protocol": "motion-chat-v1",
  "action": "create",
  "project": {
    "version": 1,
    "title": "PROMPTENCE / OBSERVE THE ANSWER",
    "brand": "promptence",
    "format": "portrait",
    "language": "en",
    "qualityMode": "signature",
    "visual": {"motion": 0.8, "textScale": 0.96, "contrast": 0.65, "glow": 0.22},
    "scenes": [
      {"id":"scene-1","kind":"kinetic","eyebrow":"DISCOVERY CHANGED",
       "headline":"THE ANSWER IS THE FRONT PAGE.","support":"Observe what AI says.",
       "seconds":4,"transition":"cut","titleTreatment":"mask"},
      {"id":"scene-2","kind":"closer","eyebrow":"INTRODUCING",
       "headline":"PROMPTENCE","support":"promptence.tech",
       "seconds":4,"transition":"dissolve","titleTreatment":"minimal"}
    ]
  }
}
```

This deliberately **does not** invent a provider scan, customer testimonial,
performance figure, external website, voice file or screenshot.

### Targeted patch protocol

```json
{
  "protocol": "motion-chat-v1",
  "action": "patch",
  "expectedBrand": "promptence",
  "expectedTitle": "PROMPTENCE / OBSERVE THE ANSWER",
  "changes": [
    {"target":"scene","index":0,
     "set":{"headline":"THE ANSWER IS THE NEW FRONT PAGE.","seconds":4.5,
       "titleTreatment":"mask"}},
    {"target":"project","set":{"visual":{"motion":0.7,"glow":0.25}}}
  ]
}
```

`index` is **zero-based**. `expectedTitle` and `expectedBrand` must
match the open project exactly; otherwise Motion refuses the patch. No
arbitrary HTML, component code, JavaScript, URLs, filesystem commands,
credential fields, scene mutations by unknown keys, or direct publishing are
accepted. Edits are sanitized against the existing `MotionProject` schema.

### Generate with no source material

Use **BUILD WITHOUT MATERIALS**. For Promptence this opens the bundled
curated 8-shot concept film; for other brands it opens the existing starter.
You can then adjust scenes, global grade, transitions and original synth
score, and export a locally rendered concept. This is procedural motion graphics,
not a claim of prompt-to-photorealistic video.

## 02 / MEDIA LIBRARY

The site has a local IndexedDB store scoped to the current browser origin.
Roles: screenshots, other images, logos, recorded video, voice, licensed music,
and sound effects. Files are imported explicitly, tagged by brand and role,
and are **not** uploaded to Vercel, AI providers or ChatGPT. The user must
check a rights/usage approval box before attaching media to an active film.

Current operations:
- Store, review, preview, approve/revoke, and delete local media copies.
- Attach an approved PNG/JPEG/WebP to the current Cinematic screenshot shot.
- Attach an approved recorded voice or licensed music file to the timeline.
- Transfer an approved real MP4/WebM/MOV from the library directly into
  **Quick Studio Shot 01**. The destination decodes original video pixels;
  remaining Quick shots still require their own approved media. No copy
  is uploaded and there is no claim of generated video.
- Store and preview SFX. True moving-video compositing remains in
  Quick Studio / Proof Director, not faked as an existing Cinematic shot.
  SFX are not yet tied to editable cue points.

Limitations: 40 assets/browser, screenshots up to 12MB, video up to 100MB,
narration up to 15MB, music up to 30MB. Origin quota, private browsing and
mobile device memory can reduce this. Browser storage is not a cloud backup.
Never rely on the library as the only copy of irreplaceable source materials.

## 03 / VISUAL GRADE

Four actual, project-wide timeline settings:
- `motion` (0–1.5): changes procedural art motion speed and directed camera.
- `textScale` (0.75–1): changes title fit within measured safe areas.
- `contrast` (0–1): conservative overall tonal overlay (neutral at 0.5).
- `glow` (0–1): opacity of ambient scene lighting.

Visual grade values are serialized in the ordinary project, travel with Chat
Packs, and are used by **the same deterministic Canvas renderer** during the
local preview, browser export and frame-by-frame offline FFmpeg export.

Signature restraint preset: quieter color glow, measured title size, more
controlled movement. It is a design direction, **not** a guaranteed increase
in visual quality or resolution.

## Technical verification

- `npm run motion:test-chat`: protocol parsing, create/patch round-trip,
  changes remain scoped to requested fields, brand/title mismatch rejection,
  unknown field rejection, invalid transitions, invalid motion grade, length
  limits, and no-op patches.
- `npm run typecheck` and `npm run build`: TS/Next compilation.
- Browser QA still required for IndexedDB quota, file decode, permission
  handling and mobile responsive interfaces.
- GitHub Actions jobs may fail to acquire runners, and Vercel READY is not a
  substitute for a complete exported-film audiovisual quality inspection.

## Next feature gates (not yet implemented)

1. One shared media-aware timeline across Cinematic, Quick and Proof with
   real per-shot video assets instead of separate workflows.
2. Freehand multi-layer editing, keyframe curves, undo/version history
   beyond the last Chat Pack.
3. SFX and music cue sheet, audio loudness meter, speech-alignment tools.
4. Portable project bundle referencing user-owned media, with reattachment
   and rights metadata; not an unsafe giant base64 JSON payload.
5. Trusted interactive chat-to-site connector, only after explicit consent
   and separately reviewed security. **Not** an unauthorized agent.
