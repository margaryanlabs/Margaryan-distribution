# Motion OS — Precision Cut picture editing (October 2026)

## Built in the existing Cinematic Studio

The video timeline now has a separate **06 / PICTURE EDITOR — PRECISION CUT**
immediately below the existing multitrack edit suite. The production editor
can perform real non-destructive picture operations:

| Control | Changes | Unchanged |
| --- | --- | --- |
| MOVE EARLIER / MOVE LATER | Selected shot's position in the sequential storyboard | Its original approved image/video, source inpoint, cue and camera settings |
| DUPLICATE SHOT | Inserts an identical design/approved still shot after the original, with a hard cut and cleared duplicate narration cue | Original project content |
| SPLIT AT PLAYHEAD | Divides one shot at the current film playhead into two adjacent scenes | Combined film time, original underlying source bytes and unrelated scenes |
| UNDO LAST PICTURE EDIT | Restores the previous editable project and shot selection if no other scene edit has happened since | Original browser-local assets |

**Real footage continuity:** If a moving source-video scene starts at
source 3.5s and is split into two four-second scenes, the first part reads
source 3.5–7.5s and the second begins at 7.5s. It does **not** replay the
first frame of the video or pretend there is new source footage. The
first shot uses a CUT transition to prevent overlap of the same decoder.

**Real second-layer images:** An approved still overlay window is split
across the timeline. Example: an 8-second scene has an overlay visible
between 1 and 6 seconds; cutting the scene at 4 seconds yields an overlay
window 1–4 in the first clip and 0–2 in the second. No imaginary overlay
clip is inserted where it wasn't visible.

**Camera continuity:** Bounded optical source zoom keyframes are
interpolated at the cut. The first clip ends at exactly the zoom with which
the second begins.

## Existing limits preserved

- The Cinematic frame renderer still supports **up to eight scenes**,
  with individual durations between **2 and 8 seconds** and a cumulative
  maximum of 64 seconds.
- You must position the playhead so **at least 2 seconds remain on each
  side** before selecting SPLIT.
- Duplication of moving source video is deliberately blocked because blindly
  duplicating a real recording would replay footage and could produce false
  continuity. Use SPLIT for genuine chronological source editing.
- The operation changes editable project metadata; it does not destructively
  transcode or re-encode the original source clips.
- Voice/music timeline editing and source-rights checks remain in the
  existing suites; the user should listen to the final audio track and
  check shot transitions after picture changes.
- This is the first precision-edit set, **not** a full multi-camera
  keyframe/layer timeline or proof of a finished high-quality ad.

## Tests and release gate

The new `npm run motion:test-precision` runs isolated tests for:
reorder, duplication, original-project immutability, real video inpoint
continuity, overlay time-window carry-through, optical zoom continuity,
invalid cut positions and the eight-shot safety limit.

The suite is included as the first **prebuild** test before the existing
independent-image-overlay and portable-project tests. The resulting
Vercel build is rejected if this contract fails, even if GitHub Actions
does not acquire a runner.

Next meaningful work should prioritize real-device exported film creative
review and a long-form chapter/sequence architecture, instead of silently
raising the 8-scene cap without considering memory/audio/render performance.
