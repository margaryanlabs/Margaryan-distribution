# Markarian Cloud — Legacy Provider Bridge (Read-only)

**Purpose:** See Vercel, Railway and cloud Supabase *inventories* in the owner console while transitioning to our self-hosted systems. This is not the self-hosted Supabase data plane, a cloud bill report, or a deploy controller.

## Environment variables (server-only)

- CLOUD_VERCEL_TOKEN — Vercel access token
- CLOUD_VERCEL_TEAM_ID — optional Vercel team ID (\`team_...\`)
- CLOUD_RAILWAY_TOKEN — Railway account/workspace token granting project-list access
- CLOUD_SUPABASE_PAT — scoped Supabase PAT with \`projects_read\`

**Never use NEXT_PUBLIC_*** for any provider token. Never ask the browser to paste credentials. The tokens belong in the existing backend's secure environment/secret store. Railway tokens can be broad and not intrinsically read-only; the endpoint deliberately exposes only a fixed read query, but protect the token itself as a powerful credential.

### Endpoint and security

- Protected \`GET /api/cloud/providers\` via the existing proxy, fail closed when operator auth is missing.
- Vercel: \`GET https://api.vercel.com/v9/projects?limit=100\` (optional fixed team ID).
- Railway: fixed \`POST https://backboard.railway.com/graphql/v2\` with GraphQL **query**, never a mutation; \`projects(first:100)\`.
- Supabase: \`GET https://api.supabase.com/v1/projects\`.
- Timeouts 8 seconds, cache no-store, redirects forbidden, fixed endpoints only.
- Provider payloads projected onto \`id,name,kind,status,detail\`; error bodies and secrets not returned; status \`inventory only\` for Vercel/Railway projects because project existence does not prove a deployed healthy service.
- Pagination is not implemented beyond first 100; \`limited\` flag represents known pagination.
- No write actions, restart, deploy, delete, DB SQL, secrets listing or provider account management.

**Source of truth:** until the proper credential is configured, that provider appears \`not_configured\`, not as a working integration. Console access must be protected by VPN/Zero Trust and MFA before handling production secrets.

Docs: https://vercel.com/docs/rest-api , https://docs.railway.com/integrations/api , https://supabase.com/docs/reference/api/introduction .
