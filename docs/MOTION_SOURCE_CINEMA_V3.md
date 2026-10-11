# Motion OS — Source Cinema V3 and synchronized sound

**Scope:** In-place upgrade of the existing Cinematic Studio, not a new app,
agent, remote service, AI video/voice model or API-based workflow.

## What now changes actual rendered pixels

An approved real screenshot or recorded MP4/WebM/MOV attached to a Cinematic
screen shot gains shot-specific art direction:

| Control | Behavior | Original evidence |
|---|---|---|
| Floating card | Existing restrained card, with original source | Original pixels |
| Theater | Larger source surface under editorial type | Original pixels |
| Split | Product-interface panel opposite headline (landscape) | Original pixels |
| Immersive | Full-bleed genuine video with a dark readability scrim | Original pixels |
| FOCUS X/Y | Moves cropping window across decoded original | No invented UI |
| ZOOM START/END | Bounded 1.0–2.0 optical zoom; smooth keyframe easing | No generated data |

The crop uses **source-coordinate drawImage**, not distorting source aspect
ratios. It is deterministic for a project and timestamp: browser preview,
quality contact sheet, and offline Playwright→FFmpeg export share the same
camera math. All directions serialize in the project and can be modified
by a `motion-chat-v1` scene patch issued in this ChatGPT conversation.

**Example Chat Patch:**
```json
{
  "protocol": "motion-chat-v1",
  "action": "patch",
  "expectedBrand": "promptence",
  "expectedTitle": "REPLACE WITH EXACT OPEN PROJECT TITLE",
  "changes": [{
    "target": "scene",
    "index": 1,
    "set": {
      "sourceLayout": "theater",
      "sourceFocusX": 0.3,
      "sourceFocusY": 0.6,
      "sourceZoomStart": 1.0,
      "sourceZoomEnd": 1.2
    }
  }]
}
```

**Important:** if the source has small labels, a deep zoom or narrow crop
may hide evidence, dates, numbers, or disclaimers. This is not automatic
video intelligence: the human producer must choose the focal point and
approve the framing.

## WebAudio recording-sync fix

Previously, the browser soundtrack was scheduled *during preparation*, at
`context.currentTime + 400ms`. Video recording began separately, and an
unwanted silence/drift could appear on the first frame. That is corrected.

Now `createProceduralSoundtrack()` predecodes owner-supplied voice/music
but **does not start any sound source**. The new idempotent
`ProceduralAudioSession.start()` is invoked immediately after the browser
`MediaRecorder.start()`, with a small ~45ms scheduling cushion.

Recorded narration continues to use the user's existing timeline
`voiceStart`, `voiceTrim`, fade-in/out and individual gain controls. Licensed
music has conservative ducking during recorded speech, not a synthetic human
voice. Original procedural music/effects still work without external assets.
The FFmpeg offline master continues using its existing explicit trim/fade and
mixed track timing.

This is tighter alignment, **not sample-accurate browser A/V guaranteed**.
MediaRecorder and browser encoders remain device-dependent. Professional
campaigns should use the offline H.264/AAC master and review results with
headphones.

## QA

New local, dependency-free test:
`npm run motion:test-source-camera`

Checks constrained focus/zoom, accurate aspect ratios on landscape/portrait
sources, all four stage geometries, trusted Chat Patch acceptance/rejection,
and the WebAudio regression that no narration/music starts before the video
recorder invokes `start()`. Tests run in CI along with other Motion suites.

Vercel build/typecheck success verifies that the application compiles. It
does **not** certify real-source decoding on every phone, perfect lip sync,
legal clearance of clips, appearance in exported MP4, or cinematic quality.

## Remaining production gates
- More than 8 shots / 64 seconds in the browser film editor.
- Automatic natural voice generation (no API/model integration yet).
- Cross-editor persistent media/audio scene mapping and multilayer compositing.
- User-provided original Promptence/VETO screen recordings, professional
  narration/mastered licensed sound and human review of exported campaigns.
