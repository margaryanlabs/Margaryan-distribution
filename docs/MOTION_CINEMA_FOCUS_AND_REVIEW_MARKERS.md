# Motion Studio — Cinema Focus and Director's Markers

## What changed

The existing Cinematic Studio keeps all seven editing workspaces,
source-first footage, Precision Cut, Voice Booth, the Feature Film assembler,
portable film bundles and its public commercial contact page.

### Cinema Focus

- In the live player toolbar choose **CINEMA VIEW** to hide the properties
  inspector, expand the monitor, and make the picture the centre of the app.
- Choose **EDITOR VIEW** to restore the inspector without losing edits,
  playback location, approved source bytes or project state.
- Clicking any left work-rail tool automatically returns to editor mode.
- Layout preference is saved locally when browser storage permits. Nothing
  is uploaded or sent to an AI model.
- Mobile keeps the same editor filmstrip with a larger player when enabled.
- **⌨ KEYS** in the project bar shows accessible shortcuts:

| Key | Effect |
| --- | --- |
| Space | Play / pause the live preview |
| Left / Right | Move playhead by 1 second |
| Shift + Left / Right | Move playhead by 0.1 second |
| Alt + 1…7 | Select Create, Assets, Scene, Audio, Look, Review, Export |
| F | Toggle Cinema Focus |
| ? | Open / close shortcut list |
| Esc | Close shortcut list or leave focus mode |

Film shortcuts do not run when typing in a form, editing content, using
a focused button or link, exporting, rendering, or browsing the separate
Feature Film workspace.

### Director's Markers (inside REVIEW)

Real human review is essential. A technical preflight passing does **not**
mean an advertisement is ready to be sold or distributed.

- While reviewing the frame, tap **✎ NOTE** beside the monitor. The
  existing **REVIEW** inspector opens to a local timecoded note composer.
- Type a human observation, required edit or **blocking** issue.
- Each note receives an absolute timecode, unique private identifier,
  the scene identifier, author-selected priority and open/resolved state.
- **GO TO FRAME** selects the recorded shot and seeks to the timestamp.
- Mark a note resolved or reopen it; this does not imply that a license,
  factual claim or final master has been approved.
- **SHOW ALL**, **SHOW OPEN**, remove, and export a plain-text director's
  note sheet suitable for a voice artist or video editor.
- Notes stay local to this browser, with a bounded 60-entry queue. Media
  remains outside of the note JSON.

**Project identity caveat:** the note queue is keyed to brand + title +
film seed for a local draft. This is intentionally not a shared CRM.
Export notes before renaming a film or changing devices. Scene IDs must
match uniquely to permit frame jumping. If an original shot is deleted
or duplicate identifiers make the link ambiguous, the note remains
visible but is marked **SHOT UNLINKED**, avoiding false reassignment.

## Security / honest production

No local media files are sent to GitHub, provider APIs, or the public
Chat Director channel. All notes are stored via browser-localStorage
(if available) and export text only on explicit user action.
No real client reviews or production results are fabricated.

### Release proof

`npm run motion:test-focus-notes` exercises:

- Stable per-draft storage scope, max 60 markers, input sanitization,
  anti-duplicate IDs, and status immutability.
- Accurate source-scene ID relinking and fail-closed orphan handling.
- Exported note text is labelled as *human comments*, not independent QA.
- Integration of keyboard shortcuts and actual CSS focus state.

The test is part of the Vercel `prebuild` release gate.

### Still necessary before a claim of finished commercial-quality film

Review original Promptence screen recordings, licensed audio and human
narration in the browser, then render the final MP4, inspect every cut and
listen to it on an actual mobile device. This UI/production-workflow work
cannot by itself prove finished film aesthetics, codec fidelity, data truth,
audience conversions or paid enquiries.
