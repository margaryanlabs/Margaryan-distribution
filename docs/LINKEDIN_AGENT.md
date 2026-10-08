# LinkedIn Agent — governed private-message copilot

Location: **/linkedin**, linked under Revenue flow in the workspace dock.

## What already existed

- `lib/integrations/linkedin.ts` publishes posts through an approved publishing token.
- `app/api/outreach/linkedin/draft` prepares a one-off prospecting draft.
- The revenue OS keeps lead context, promptence offer data, and generic email inbound-reply classification.
- **No personal-message inbox reader or DM send adapter exists.** A LinkedIn publishing token or Metricool publishing connection does **not** grant access to personal DMs.

## What this implementation adds

- Private LinkedIn assisted inbox: enter an existing CRM lead or a contact name, paste the actual latest inbound DM, optionally paste preceding conversation context, and select product/language.
- Intent detection, next-best-action, factual contextual reply draft with existing `classifyInboundReply`, opt-out/negative hard stop.
- Persisted conversation queue, AI decisions, operator-confirmed sent messages, 50-import idempotency keys, and 100 most-recent message history items in the existing durable checkpoint.
- Copy-to-clipboard and human send via LinkedIn web UI, followed by an explicit **I sent this** confirmation. Confirmation records **operator assertion** only, not independently verified provider delivery.
- Revenue lead-stage sync and cancellation of pending outbound actions when the person opts out, declines, or responds positively.
- Fail-closed on private data when Basic operator authentication or a durable CRM store is missing.
- Read-only status reports `inboxReadAvailable=false` and `directMessageSendAvailable=false`, independently from post publishing readiness.

## Activate

1. Deploy the branch after passing CI.
2. Configure `DISTRIBUTION_BASIC_USER` and `DISTRIBUTION_BASIC_PASSWORD` on the runtime before using the private screen. Keep credentials server-side.
3. Configure either `DISTRIBUTION_DATABASE_URL` (Postgres) **or** both `DISTRIBUTION_SUPABASE_URL` and `DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY` for checkpoint persistence. Do not put personal conversations in an ephemeral demo.
4. Set `OPENAI_API_KEY` to enable model-generated classification and replies; without it the existing conservative rules/fallback apply.
5. Open `/linkedin`. Choose an existing lead (optional), paste the latest real incoming message with optional context, click **Analyze & draft reply**, review, copy, send personally on LinkedIn, then click **I sent this**.

## API contract

- `GET /api/linkedin/agent`: authorized operator reads stored threads and truthful capability flags.
- `POST /api/linkedin/agent`: JSON `{importId, threadId?, leadId?, contactName?, company?, profileUrl?, language?, productId?, latestInbound, context?}`. `importId` is an operator-generated unique client id for idempotency; use same one on retry.
- `PATCH /api/linkedin/agent`: JSON `{threadId}`. **Does not call LinkedIn**: confirms an external human send of the prepared draft for tracking.
- All mutation routes require same-origin browser calls, Basic operator auth enforced via Next proxy and durable state.

## Access limitations and safe path forward

LinkedIn forbids unauthorized automated scraping and bot DM sends. **Do not add cookies, scraping, Playwright session hijacking, rotating proxies, unofficial messaging endpoints or autonomous inbox polling.** LinkedIn Pages messaging has approved partner integrations, which are distinct from personal-profile DMs. An eventual verified, approved partner adapter must be added separately with granted scopes and explicit permission checks; never turn an existing post-publishing token into a purported DM token.

This release intentionally does **not** provide a ChatGPT connector capable of reading/sending private DMs from this chat. A future custom MCP/approved partner connector is a separate integration and depends on provider permissions.
