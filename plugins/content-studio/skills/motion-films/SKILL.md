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
3. Return the secure fragment-only editor URL from the tool to the user. Tell them to click INSPECT and then APPROVE. Do not claim an MP4 already exists.
4. On revisions, ask for or reuse the exact current MotionProject pack; call revise_motion_film with scoped changes. Do not edit mediaId or claim to access local media.
5. User reviews the preview and exports inside the existing Motion Studio. Original video, music and voice files require user-approved local media and appropriate rights.
6. Never claim unbounded free generation: ChatGPT plan usage limits, browser performance, storage and optional hosting still apply.

## Product boundaries
Public beta tools are stateless and free to call. They do not authenticate customers, verify subscriptions or store projects. Monetization, OAuth, tenant branding and inside-ChatGPT video playback remain separate planned work. No unattended publication.
