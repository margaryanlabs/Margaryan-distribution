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
3. When MCP Apps UI is supported, show the first-party live Canvas preview in ChatGPT: PLAY, click an accessible numbered shot to seek directly to that scene, and use EXPORT VIDEO on a supported browser. Selected-shot UI state is saved only through the optional per-widget ChatGPT widgetState bridge; no projects, source files or private data are persisted in that UI setting. The film remains a motion-graphics animation and export codecs vary by browser.
4. Offer the browser fragment-based full editor review link for scene/asset controls; the URL is NOT encrypted and should not contain confidential data. Editor V2 now automatically opens the multi-chapter Sequence Studio when a long-film link contains #motion-sequence-v1=. Explicitly INSPECT and APPROVE before changing local chapter drafts. Never claim an MP4 exists before it is actually exported and checked.
5. For conversational revisions, the user may select a scene in the embedded widget, type a natural-language direction and press ASK CHATGPT TO REVISE THIS SHOT. Where the ChatGPT host supports sendFollowUpMessage, this submits an actual user-requested follow-up to the model (not an unbilled API call, not a silent video edit). Confirm the direction, reuse the exact current MotionProject pack and call revise_motion_film with scoped changes. On labs-branded films, safely change project.clientBrand.name/caption/accent alongside scene copy. No arbitrary media, logos or external URLs are allowed.
6. The native player can record directly in the browser (720p default, optional Full HD/1080p, optional original procedural soundtrack). Its expanded BRAND LOGO & VOICE / MUSIC panel lets users personally select a PNG/JPEG/WebP logo ≤5 MB, narration ≤15 MB, and owned/licensed background music ≤30 MB from their device; the EXISTING Motion Sound Engine mixes narration/music/optional synthesizer into the local video. No OpenAI API, speech generation, provider upload, remote music scraping, ChatGPT token resale or server-side media persistence. These files are browser-local and not carried by the ChatGPT tool arguments or editor link. If the user wants spoken speech, they must supply a lawful recording. The user can reposition the local logo without editing JSON. The player offers SAVE TO CHATGPT after recording, using the host's optional uploadFile({library:true}); success is NEVER guaranteed, and files over 25 MB remain local only. Do not claim upload until ChatGPT confirms it.
7. Never claim unbounded free generation: ChatGPT plan usage limits, browser performance, storage and optional hosting still apply.

## Product boundaries
Public beta tools are stateless and free to call. They do not authenticate customers, verify subscriptions or store projects. Monetization, OAuth and tenant branding remain separate planned work. An MCP Apps nested first-party canvas preview exists in the current branch, and the dedicated public domain is deployed; the plugin has not yet been installed and verified in a real ChatGPT client and nested iframe/CSP review remains. No unattended publication.

## Public beta endpoint

Public MCP: https://studio.promptence.tech/api/mcp. The isolated standalone application is publicly deployed on an owned subdomain and contains no private Distribution CRM routes. It advertises three stateless tools: create_motion_film, revise_motion_film, and create_motion_feature_film. Installation in ChatGPT and actual in-ChatGPT video export still require live client testing.

## Longer films — now available in public Sequence Studio

For a long-form 65–192 second narrated concept, call create_motion_feature_film with 9–24 original scenes, each 2–8 seconds; supply meaningful act/chapter titles and an editorial opening, proof or evidence with accurate sourcing, and CTA. You can also use client_brand_name/client_brand_caption/client_brand_accent for the customer's approved text identity when brand=labs. The tool returns a **multi-chapter project review link**, not a video file. The full screenplay and scene copy are encoded within the browser URL fragment, not encrypted; it may be visible to anyone with the link, the user's browser history or installed browser extensions. Do not embed secrets or confidential customer claims in these review links. Open the editor at that link to inspect and approve the import before changing any existing film.

The publicly hosted /motion page now includes the actual Film Sequence Studio and local browser workprint render. Manual Sequence Studio can produce films up to 300 seconds from up to eight separately editable chapters (subject to validated technical restrictions), with demonstration templates. A browser-generated workprint or a separately mastered local H.264 output is different from a ChatGPT inline rendered video. **Do not promise one-click 300-second generation by the ChatGPT tool**: the current AI-directed tool is limited to 192 seconds; beyond that the user must build additional chapters manually. Do not claim an MP4 exists until actually exported and checked for audiovisual correctness.
