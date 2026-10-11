# Motion Studio / Editor Workspace V2
## Objective

The original production engine was capable, but the Cinematic route displayed
hundreds of controls in a long, competing landing-style layout. The new
workspace keeps the complete rendering/editing backend intact and focuses
the working screen around **one film, one player, one selected shot**.

## User interface

**Desktop / tablet landscape:**
- **Left** narrow 7-mode work rail.
- **Centre** live canvas, timeline/playhead, advanced editing drawer.
- **Right** independently scrolling inspector. The preview remains on screen
  while switching modes, and the selected scene's headline and duration are
  always near the top of the properties panel.
- **Above** a compact production identity line: current title, brand,
  aspect ratio, scene count, runtime and explicitly local/no-key mode.
- **Feature Film** opens an optional chapter assembler (up to 300s browser
  workprint / 512s operator-local master, as in the prior implementation)
  without putting the entire 300-second editor above the daily short-film
  workspace.

**Editor workspaces** (click rail or Alt+1…Alt+7, unless typing):
1. CREATE — brief, authored films, local director, supported presets.
2. ASSETS — approved real footage/image library and private Chat Pack.
3. SCENE — focused headline, support, duration, composition, transition,
   camera, optional original-image second layer.
4. AUDIO — genuine human narration, licensed music, levels, fades.
5. LOOK — format, rendering quality, clean/brand/editor finishing.
6. REVIEW — evidence/reference comparison and structural/frame QA.
7. EXPORT — immediate QA/export and save commands, captions and production
   packs in the existing delivery tray.

**Mobile:** the rail becomes a touch-sized sticky horizontal navigation.
Tapping a workspace brings the inspector into view below the central player.
No third-party editor login or model API is needed. The preview remains
the same deterministic, original-media-aware Canvas renderer.

## What was preserved

- Original local-source media approvals, IDs, decode/seek and fail-closed
  footage export gates.
- Full short-film JSON/Chat Pack editing, per-shot camera/source focus and
  picture-in-picture approved still overlay.
- Voice Booth local microphone recording and independent audio timeline.
- Precision Cut split/duplicate/reorder/undo.
- Portable source-complete project ZIPs.
- Product Signature/Spatial shots, production packs, caption exports.
- Distinct Quick Studio and source-first proof tools.
- Separate commercial film enquiry landing, with its protected/private
  optional sales intake. No added automatic outbound sends.

## Honest quality gates

The workspace change improves **navigation and visual hierarchy**. It is
not a finished new video renderer, not a native NLE replacement, and does
not by itself guarantee that a future Promptence video is tasteful.

- Vercel Next.js/TypeScript build and pure-data Motion tests: required.
- Structural workspace smoke test:
  `npm run motion:test-editor-workspace`.
- Production smoke check `/motion?mode=cinematic` returns HTTP 200 and
  desktop markup contains the new rail, Canvas monitor and current project bar.
- **Still needed:** human screenshots on 390px Android/iPhone, 768px tablet
  and >=1440px desktop; scroll/focus and import/voice playback checks;
  whole-film MP4 and real product-source audiovisual review.

## Usage

1. Open the existing `/motion?mode=cinematic`.
2. **CREATE** for a new film or **ASSETS** to attach authentic clips.
3. Select a shot in the visual timeline → **SCENE** opens automatically.
4. **AUDIO** for narration and licensed sound.
5. **LOOK** for final typography and format; **REVIEW** for frame/claim checks.
6. **EXPORT** → use the real QA/export action (or save editable JSON).
7. Select **FEATURE FILM** in the project command bar only when you need
   chapters or a longer story; return via BACK TO EDITOR.

No project bytes or private footage are uploaded when changing workspaces.
