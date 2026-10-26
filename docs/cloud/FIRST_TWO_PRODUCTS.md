# Markarian Cloud — first two production candidates: VETOGRAM + Promptence

**As of 2026-10-26: prepared, NOT deployed.** This document records actual repository source and the remaining evidence before buying/activating a VPS. It does not grant authority to migrate customer data, sessions, trading, OAuth or payments.

## Source ownership and independent storage

| Surface | Source and correct branch | Actual data boundary |
| --- | --- | --- |
| Cloud control plane | `margaryanlabs/Margaryan-distribution` Cloud stack, draft PR #115 | Coolify's private config DB + separate operational metrics |
| VETOGRAM | `margaryanlabs/Telegram-story-bot`, V4.11 draft PR #185, portable staging PR #186 | Current REBORN **Neon PostgreSQL provider**, schema v6 with owner-scoped OTP leases; encrypted Telegram sessions, private archive and media storage |
| Promptence | `margaryan-labs/ai-revenue-navigator`, public V14 main, portable staging PR #337 | Current managed **Supabase**, Auth/RLS/Storage, provider measurements, client tenants, payment verification, OAuth credentials |

**Never restore a Neon database into Promptence's Supabase, or apply a Promptence schema to VETOGRAM.** Independent credentials, backups, objects, grants, migrations and blast-radius boundaries must remain.

## Architecture for one starter VPS

Coolify + reverse proxy + Docker workloads:
- VETOGRAM Node API + public WebApp container built from `Dockerfile.selfhost`.
- Promptence TanStack Start/Nitro Node container built from `Dockerfile.selfhost`.
- Private data services: either independently isolated Postgres instances (Neon-compatible VETOGRAM data) and a full official self-hosted Supabase project (Promptence) **after** successful independent restore. Avoid public 5432/6543, Valkey, Grafana, Studio and Coolify management endpoints.
- Dedicated internal schedule runners with private auth and per-job idempotent leases.
- Prometheus/Grafana/Sentinel for observability, plus genuinely off-host encrypted backups covering databases, object storage, app secrets and recovery runbooks.

**Capacity warning:** a 32 GiB single machine may host light pilot load, but that is not measured capacity. On one server all apps, the database and Coolify share a failure domain. No automatic high availability, regional failover, point-in-time recovery or zero-downtime migration is promised.

## Mandatory staged acceptance order

1. On a trusted complete checkout of each review branch, run all recorded tests (not merely component fixture tests). For Cloud run `node scripts/cloud/local-ci.mjs --full`. Resolve the pre-step GitHub Actions failure or use an independently observed complete local release receipt.
2. Audit each actual checkout: `node scripts/cloud/app-portability.mjs --audit vetogram /absolute/Telegram-story-bot`; same with `promptence /absolute/ai-revenue-navigator`. For Promptence run its own `node scripts/selfhost-source-gate.mjs --audit`. Blockers must be resolved and rechecked.
3. Provision secured Ubuntu VPS, install Coolify and run `vps-preflight --check`, then a disposable NGINX HTTPS pilot. This has not happened.
4. Run disposable Postgres pilot; then test official Supabase Docker with private network, correct version and generated secrets. Perform encrypted offsite backup and a REAL restore (including separate Storage files) before importing any customer data.
5. Migrate **copies**, not live sources, into isolated staging databases. Verify version compatibility, extensions, migration ledger, owner/tenant RLS, 2-account isolation, deleted media policy and cryptographic keys. Full Auth/User identities may require sign-in again when JWT keys change (official Supabase restoration guide).
6. Launch staging containers with test domains. For VETOGRAM verify Node API parity, real authenticated Test Telegram bot, one webhook owner, code/QR login, signed background worker triggers, archive/anti-delete event persistence, Story rights, AI budget limits and media recovery. **Never reuse the live Telegram bot token in staging.**
7. For Promptence validate frozen public dependency registry install, actual Nitro output, Free AI Check, Supabase tenant Auth/RLS, four replacement worker schedules, Google OAuth, signed payments/refunds and outbound reply cancellation. **Do not** point a staging instance to real customer database with write privileges.
8. Collect SHA-specific build receipts, HTTP/HTTPS runtime smoke, rollback proof, failover/backup restore timings, external uptime and alert delivery. Only then approve an explicit one-product-at-a-time production DNS/webhook cutover. Keep old hosting available during rollback window.

## Source-verified blockers

**VETOGRAM:** current server starts via `vercel dev`; draft PR #186 adds optional native Node startup but full live API parity has not been demonstrated. Legacy archive notification pointed to `telegram-story-bot-murex.vercel.app`, addressed in draft PR #186. Neon v6 was applied to the existing provider, **not** restored onto owned infrastructure. Staging Telegram bot/sessions, encrypted media archive recovery and all signed workers still need independent end-to-end verification.

**Promptence:** four Vercel Cron schedules, hardcoded managed Supabase public URL/build identity and `bun.lock` entries pointing at a Lovable package mirror. Draft PR #337 adds a Nitro Docker staging image and a blocker detector but does not remove database pinning or re-resolve dependencies. Existing OAuth/billing/client activation and migrations need a complete safe cutover.

**Cloud:** stacked PRs remain draft, full CI/Next.js build not confirmed, no first host, no offsite restore, no observed live container and no customer cutover. Any claim of complete managed Vercel/Supabase/Railway parity would be premature.

## Official references

- Supabase self-hosted Docker: https://supabase.com/docs/guides/self-hosting/docker
- Supabase managed -> self-host restore: https://supabase.com/docs/guides/self-hosting/restore-from-platform
- TanStack Start Nitro hosting: https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- Coolify how it works: https://coolify.io/docs/core/how-coolify-works
