# Motion OS / direct public ChatGPT film channel (no autonomous agent)

## One-click handoff from this ChatGPT conversation
The user's request is to let **ChatGPT itself act as the creative director**
and the existing Motion Studio act as renderer, without integrating a paid
ChatGPT/Claude video API, running a separate AI agent, giving the website
a GitHub API token or copy/pasting JSON on each new film.

This is implemented as a **public static GitHub → Vercel channel**:
`public/motion/chat-ops/latest-public.json`.

1. **In ChatGPT:** "Create/update the approved *public* Promptence cinematic
   film and publish to our Motion Studio's public Chat channel." The assistant
   uses authorized connected GitHub tools to edit this JSON in the existing
   `margaryanlabs/Margaryan-distribution` repo, opens a normal PR, verifies
   Vercel Preview, and merges only after successful checks. No browser-based
   AI API call is required.
2. **Vercel Git integration:** publishes the static file at
   `/motion/chat-ops/latest-public.json` on the project's normal domain.
3. **In Motion Studio:** Cinematic → **00 / PRODUCTION WORKSPACE** →
   **01 / CHAT PACK** → **LOAD LATEST PUBLIC CHAT CUT**.
4. The browser GETs **its own same-origin static JSON only**, not user files
   or data from ChatGPT. It enforces `motion-chat-v1` schema and existing
   source/shot validation. The loaded film is only staged as editable text.
5. **Manual consent:** click **INSPECT / PREVIEW CHANGES**; review all shots,
   then **APPLY APPROVED CHANGES**. Undo is supported. A published public
   film can never silently overwrite the user's active project.
6. **Private/personal films:** continue using *COPY FULL PROJECT* and
   paste/import/export JSON manually. Never put secret customer details,
   unpublished business material, account IDs, credentials or private media
   inside public static files.

### 36.5-second working example
The initial file contains eight Russian Promptence shots, signature-quality
grading and source-honest conceptual graphics. No provider response, customer
metric, test dataset, conversion uplift or ranking is invented. Voice is only
a narration cue; the site does not synthetically speak it.

### Security and boundaries
- The public JSON is literally publicly accessible on the site's origin.
  This is **only** a distribution channel for deliberately public ad copy.
- The website has no GitHub token, model API key, remote code execution, webhook
  or unauthorized access to this ChatGPT conversation.
- A connected GitHub tool can update the public file **only while executing a
  user-directed chat request**, not in the background. This is not a worker or
  recurring automation.
- No one-click import of unpublished user files from the chat; videos, music
  and voice stay in browser IndexedDB until explicitly attached or provided
  as local files to the offline master.
- New cuts require a Git commit and deployment; the UI does not provide
  continuous two-way chat synchronization. Mobile browsers may cache static
  content; the fetch opts out of normal fetch caching.
- Delivery of a storyboard does **not** prove that any finished video has
  been artistically reviewed or that a specific voice/model output exists.

### Validation
`npm run motion:test-chat-channel` checks protocol/sanitized storyboard,
36.5s runtime, exact scene beats, local-media absence and unsafe secret-like
content. Vercel Preview build/typecheck must pass before merging.

## Next step
Introduce an account-authenticated private inbox if confidential creative
drafts should be transferred without copy/paste. That requires explicit
permission architecture and is intentionally **not** implemented by quietly
exposing a static file.
