---
name: motion-films
description: Create and revise short motion-graphics films using Margaryan Content Studio from a ChatGPT conversation.
---

# Motion films from ChatGPT

Use the connected Margaryan Content Studio MCP tools for user requests to produce a motion-graphics video or modify a Motion Studio project.

## Creative direction
- Write a deliberate editorial arc, not eight generic slogans. In 2–8 shots, make the opening hook recognizable, clarify the problem, show the product or offer, and close with one specific CTA.
- Draft RU, EN or HY natively according to the user's language.
- Preserve legible headlines and safe mobile reading time. Shot duration 2–8 seconds; at most 8 shots and 64 seconds.
- For an external customer's brand, use the current generic "labs" demo style and explain the current white-label limitation; never silently pretend the customer logo will appear.
- Do not invent conversion rates, testimonials, AI provider quotes, screenshots, real product features or verified client results.
- The tool does not create moving photographic footage, voices, music licenses or a finished video file. It creates a motion-chat-v1 draft and a launch link to Motion Studio where the Canvas engine previews/renders graphics.

## Workflow
1. Design a concrete storyboard from the user's prompt, following supplied references, typography and tone.
2. Call create_motion_film with all scenes and their timing. ChatGPT does the language/model work in the chat; the tool does not call a paid OpenAI API.
3. When MCP Apps UI is supported, show the interactive first-party live Canvas preview in ChatGPT: PLAY, scrub shots and use EXPORT VIDEO on a supported browser. Download codecs vary (MP4 or WebM) and the preview is motion graphics without generated music/voice.
4. Offer the private fragment-only full editor link for full scene/asset controls. In Motion Studio click INSPECT and then APPROVE. Do not claim an MP4 exists before the user actually exports a file.
5. On revisions, ask for or reuse the exact current MotionProject pack; call revise_motion_film with scoped changes. Do not edit mediaId or claim to access local media.
6. User reviews the preview and exports inside the existing Motion Studio. Original video, music and voice files require user-approved local media and appropriate rights.
7. Never claim unbounded free generation: ChatGPT plan usage limits, browser performance, storage and optional hosting still apply.

## Product boundaries
Public beta tools are stateless and free to call. They do not authenticate customers, verify subscriptions or store projects. Monetization, OAuth and tenant branding remain separate planned work. An MCP Apps nested first-party canvas preview exists in the current branch, but has not been installed and tested on ChatGPT's actual client and requires a public owned domain plus iframe/CSP review. No unattended publication.

## Feature films (ChatGPT → Film Sequence Studio)

For a 65–192-second motion-graphics concept film, do not cram the brief into
eight extra-long shots. Plan an editorial arc with **9–24 individually authored
scenes**, each 2–8 seconds, then use `create_motion_feature_film`. A 120s film
can contain 16 scenes of 7.5s, grouped into two titled chapters.

Tool output returns a `motion-sequence-v1` manifest via a one-click
`editorUrl` link. The user opens the link in a Motion Studio deployment
that includes Sequence Studio (the importer is in PR #57), reviews the whole
film, chooses APPROVE, then selects and refines each chapter.

This link must not include client secrets or private media: the URL fragment
hides the payload from the HTTP request but is NOT encryption. A 26k fragment
size limit avoids unusably huge links. For films beyond the 3-chapter tool
limit, use Sequence Studio's local chapter editor/manifest instead.

Never claim the feature tool returns a playable MP4. Rendering a multi-chapter
MP4 requires the explicit, operator-local `npm run motion:sequence` workflow
with Chromium and FFmpeg, followed by human audiovisual review. If Sequence
Studio is not deployed or the MCP endpoint is not available to the customer,
give accurate manual JSON/film-manifest steps instead of a broken connector
claim.

## Longer projects
When the separately developed Motion Pro Sequence Studio is deployed and reachable, create_motion_feature_film can draft a 65–192 second 9–24 shot, multi-chapter production. Do not claim its generated link works until Sequence Studio is merged, deployed and tested; its full MP4 assembly remains an operator-local workflow, not ChatGPT inline export.
