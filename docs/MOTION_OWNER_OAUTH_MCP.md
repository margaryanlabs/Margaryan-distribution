# FIRST-PARTY MARGARYAN MOTION — OWNER OAuth MCP (2026-10-12)

## What this adds

**NOT** a Higgsfield/third-party render API. The existing Railway `motion-render-worker` has already finished a real original Motion H.264/AAC MP4 (6,738,038 bytes, job `71932994-d25e-4c8a-a08c-5f72b1058ba3`). This work connects **eligible** ChatGPT MCP clients to the owner queue through actual OAuth 2.1 Authorization Code + S256 PKCE, verified private access tokens and explicit operator consent.

Two *separate* MCP endpoints coexist:

| Address | Permissions | Authentication |
| --- | --- | --- |
| `https://distribution-web-production.up.railway.app/api/motion/mcp` | Five existing **public**, read-only Director tools | None |
| `https://distribution-web-production.up.railway.app/api/motion/mcp/owner` | Four **owner-only** tools: history, status, queue one fixed Promptence film, five-minute MP4 link | OAuth2 S256 + Distribution operator Basic-auth human approval |

Public MCP NEVER queues a render, discloses private job state, or provides download tokens. The owner service NEVER accepts arbitrary shell commands, files, HTTP URLs, browser scripts, customers' private data or billable third-party generators.

## Real OAuth flow

1. Connect the **owner** endpoint from a ChatGPT web workspace with approved custom/write-capable MCP apps.
2. The server responds `401 WWW-Authenticate: Bearer resource_metadata="https://distribution-web-production.up.railway.app/.well-known/oauth-protected-resource"`.
3. ChatGPT fetches standard `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`; the latter advertises **S256**, `authorization_code` and `refresh_token`, DCR and no client secret.
4. ChatGPT dynamically registers a restricted **HTTPS-only ChatGPT/OpenAI redirect** at `/api/motion/oauth/register`. No arbitrary redirect hosts or `localhost` registrations are permitted.
5. The owner visits `/api/motion/oauth/authorize`, authenticates **using existing Distribution Basic operator credentials**, sees requested permissions and presses **Approve Connection**. A SameSite/HttpOnly double-submit cookie proof prevents cross-site submission.
6. Server issues a single-use five-minute code, bound to `client_id`, exact redirect, resource, approved scopes and PKCE verifier.
7. Code exchange provides an opaque, **one-hour** access token and a rotating **30-day** refresh token. Only **SHA-256 token hashes** persist in the existing private Postgres.
8. The owner MCP checks access on **every** request. `motion_owner_render_create` additionally requires the `motion:render` scope, acknowledgement of Railway compute charges and **human approval** in the connected ChatGPT app.

**Note:** Full write-capable custom MCP apps depend on actual account/workspace plan. This code does **not** install a plugin into your account and cannot bypass ChatGPT Plus/Business/Enterprise permission policies.

## Owner tools (exact names)

- `motion_owner_render_history`: current private jobs (read).
- `motion_owner_render_status`: live status for an ID (read).
- `motion_owner_render_create`: **write**, consumes billable Railway CPU/RAM/storage, fixed `promptence_cinema` only. Requires arguments `{"preset":"promptence_cinema","acknowledge_railway_compute_charges":true,"confirm_review_draft":true}` and independent OAuth scope `motion:render`.
- `motion_owner_download_link`: owner-approved completed job yields a **5-minute HMAC-signed URL** for the MP4. It is a bearer capability and should not be forwarded: anyone possessing the link can download until expiry.

**Private queue bounds:** 1 concurrent render; 3 jobs in any 24-hour window; H.264 1080x1920; 11-minute processing timeout; <=120MB MP4; 7-day protected worker volume. These are guardrails, not a financial charge cap. First preset is an editorial review draft with **native procedural music only**; it is not a high-quality voiced, legally approved advertisement.

## Railway configuration

On the **existing** `distribution-web` service only:

```
MOTION_OWNER_OAUTH_SIGNING_SECRET=(random >=48-character generated secret)
MOTION_RENDER_ENABLED=true
```

All other worker/database/private network env vars stay as they are; **do not put the OAuth signing secret on the worker**.

Existing `proxy.ts` exceptions are intentionally narrow: public OAuth metadata, registration/token, protected owner MCP transport and HMAC-signed `/api/motion/share/:uuid`. `/api/motion/oauth/authorize`, `/motion/render`, `/api/motion/render-jobs`, CRM and existing Distribution actions remain protected by Basic. Authenticated chat actions are never performed through unauthenticated public MCP.

## Negative tests

```bash
npm run motion:test-owner-oauth
npm run motion:test-native-mcp
npm run typecheck
npm run build
```

After live deploy, check:

- Unauthenticated `POST /api/motion/mcp/owner` -> `401` with OAuth discovery URL.
- Public MCP still reports the original five safe tools and cannot queue a render.
- Unknown DCR redirect -> `400` (no registered malicious client).
- Metadata shows issuer, exact resource and S256.
- Consent page triggers operator Basic challenge for outsiders.
- `/api/motion/render-jobs` is **still** Basic protected.
- `/api/motion/share/:uuid` without signature is `403`.
- Valid owner OAuth token sees four tools; `motion_owner_render_create` without `motion:render` scope is `403`.
- A real owner-approved job moves `queued→running→complete` and signed MP4 downloads from the private Railway volume.

## Rollout caveats

- ChatGPT account installation is ALWAYS done by the owner using supported app settings. **No ChatGPT account token is accessible to us** merely by creating the server.
- DCR currently has a 20-client hard cap (no bulk cleanup UI). Restrict registrations to recognized exact ChatGPT/OpenAI callback origins and paths.
- Disconnect/revoke UI for OAuth tokens is not yet implemented; if compromised, rotate `MOTION_OWNER_OAUTH_SIGNING_SECRET` and revoke tokens in DB, or disable `MOTION_RENDER_ENABLED`. Existing issued DB tokens do not depend cryptographically on the signing secret: for full immediate invalidation revoke in DB or disable/rotate the service token verification design. (A proper session revocation UI is a required next privacy improvement.)
- Mastering a film from an owner-supplied script, genuine private app footage or external professional narration is **not** in this fixed-preset owner queue yet. Those require per-asset rights/approval, isolated uploads and explicit operator governance.
