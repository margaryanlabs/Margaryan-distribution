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
- For a customer's own brand, choose brand=labs and use client_brand_name (1–36 characters), client_brand_caption, and a readable client_brand_accent in #RRGGBB format. Rendered video uses the client's name and approved accent rather than a Margaryan film watermark. Require the user's right to represent that brand. This is TEXT identity only: logo upload, custom photography, advanced palette/theme and team brand kits remain separate work.
- Do not invent conversion rates, testimonials, AI provider quotes, screenshots, real product features or verified client results.
- The tool does not create moving photographic footage, voices, music licenses or a finished video file. It creates a motion-chat-v1 draft and a launch link to Motion Studio where the Canvas engine previews/renders graphics.

## Workflow
1. Design a concrete storyboard from the user's prompt, following supplied references, typography and tone.
2. Call create_motion_film with all scenes and their timing. ChatGPT does the language/model work in the chat; the tool does not call a paid OpenAI API.
3. When MCP Apps UI is supported, show the interactive first-party live Canvas preview in ChatGPT: PLAY, scrub shots and use EXPORT VIDEO on a supported browser. Download codecs vary (MP4 or WebM) and the preview is motion graphics without generated music/voice.
4. Offer the private fragment-only full editor link for full scene/asset controls. In Motion Studio click INSPECT and then APPROVE. Do not claim an MP4 exists before the user actually exports a file.
5. On revisions, reuse the exact current MotionProject pack and call revise_motion_film with scoped changes. On labs-branded films, safely change project.clientBrand.name/caption/accent alongside scene copy. No arbitrary media, logos or external URLs are allowed.
6. The native player can record directly in the browser (720p default, optional Full HD/1080p, optional original procedural soundtrack). Its expanded BRAND LOGO & VOICE / MUSIC panel lets users personally select a PNG/JPEG/WebP logo ≤5 MB, narration ≤15 MB, and owned/licensed background music ≤30 MB from their device; the EXISTING Motion Sound Engine mixes narration/music/optional synthesizer into the local video. No OpenAI API, speech generation, provider upload, remote music scraping, ChatGPT token resale or server-side media persistence. These files are browser-local and not carried by the ChatGPT tool arguments or editor link. If the user wants spoken speech, they must supply a lawful recording. The user can reposition the local logo without editing JSON. The player offers SAVE TO CHATGPT after recording, using the host's optional uploadFile({library:true}); success is NEVER guaranteed, and files over 25 MB remain local only. Do not claim upload until ChatGPT confirms it.
7. Never claim unbounded free generation: ChatGPT plan usage limits, browser performance, storage and optional hosting still apply.

## Product boundaries
Public beta tools are stateless and free to call. They do not authenticate customers, verify subscriptions or store projects. Monetization, OAuth and tenant branding remain separate planned work. An MCP Apps nested first-party canvas preview exists in the current branch, and the dedicated public domain is deployed; the plugin has not yet been installed and verified in a real ChatGPT client and nested iframe/CSP review remains. No unattended publication.

## Public beta endpoint

Public MCP: https://studio.promptence.tech/api/mcp. Use only the two advertised tools: create_motion_film and revise_motion_film. The isolated standalone application is publicly deployed on an owned subdomain and contains no private Distribution CRM routes. The interactive ChatGPT rendering and optional file library upload still require real installed-client testing.

## Longer films — not currently available through public plugin

The internal experimental create_motion_feature_film planner is intentionally not advertised by the public MCP endpoint. Its 65–192-second project link depends on the separate Sequence Studio PR #57, which is not yet deployed here. Do not tell users to call the unavailable tool or give a broken link. The current public plugin produces 1–8 scenes / up to 64 seconds. For more time, explain this limitation and offer a multipart storyboard without promising a single finished video.
