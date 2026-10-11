# Motion OS — Real Voice Booth + commercial film delivery

## What shipped
The existing Cinematic Studio now contains a **human narration recording booth**
in the audio section. The user presses **START RECORDING** in an HTTPS
browser, grants microphone permission, reads the per-shot teleprompter and
presses **STOP RECORDING**. All microphone tracks are stopped; the generated
File stays in local browser memory until explicitly downloaded, attached to
the film or discarded. No external API, speech cloning, paid transcription,
LLM agent or hidden transfer.

Review recorded take in HTML Audio before pressing **ATTACH HUMAN VOICE**.
The same File is passed to the existing four-track audio editor with
voice start, source trim, fade controls, gain and duration gate. The browser
encoder chooses supported Opus/WebM, M4A or Ogg formats; actual playback and
editability depend on device/browser codec support. Do not assume every
phone can decode and export every MIME codec.

### Technical local microphone inspection

After each take the booth tries to decode microphone samples using browser
AudioContext and reports peak, RMS, clipping share and recorded duration.
Clearly silent (<.025 peak, <.005 RMS, >96% near silence), severely clipped
(>2% samples at >=.995) and <1-second takes are rejected for automatic
attachment. Weak peak and some clipping produce a review warning.

If browser AudioContext cannot decode the captured codec, signal inspection
is labelled **MANUAL REVIEW**, not falsely approved; the recorded take
remains available for listening and manual attachment. Technical signals
cannot certify pitch, timing, intelligibility, speaker identity, emotions,
licensing or truthful brand messaging.

### Studio UI

In **02 / FORMAT → Film Chrome** choose:
- **CLEAN** — no permanent logo, counters, separators or editor metadata
  over the commercial footage. Suitable for immersive client footage.
- **BRAND (default)** — quiet approved brand mark and company name only on
  opening and closing shots.
- **EDITOR** — retains the previous technical HUD, e.g. shot counter,
  timeline line and MOTION ENGINE display for internal review.

This single setting is stored in `MotionProject.filmChrome`, transported in
ordinary JSON, supported in `motion-chat-v1` project patches, and interpreted
by the identical deterministic Canvas renderer used for preview and export.
Older films default to BRAND rather than carrying the previous debugging
watermarks into advertisements.

### ChatGPT direction

You can ask ChatGPT:

> Make the current Promptence film more editorial: use CLEAN delivery,
> preserve all genuine media frames and lower the overall glow.

The manual `motion-chat-v1` patch can set
`{ "target":"project", "set":{"filmChrome":"clean", "visual":{"glow":0.2}} }`
after matching the exact project title/brand and approving it inside Motion.
The site does not directly read private ChatGPT conversations.

### Checks

`npm run motion:test-voice-booth` includes clean/brand/editor JSON roundtrip,
strict project patch values, mic permission lifecycle/code checks and
synthetic signal fixtures for normal speech-level audio vs silence and
digital clipping. The test is not an end-to-end microphone permission test;
review on a real mobile/browser before publishing a high-value campaign.

**Limitations:** Browser permission required for local microphone. Existing
human voice editing and browser MediaRecorder audio/video alignment remain
device-dependent; a high-quality human voice, quiet room, manual microphone
placement and actual headphone playback are still necessary. Original source
media must be supplied/approved by its owner.
