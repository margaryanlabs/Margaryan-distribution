# Markarian Cloud — Source-based migration baseline
Verified: 20 October 2026. This is an audit of repository build metadata, **not** a live runtime audit. Existing products and databases remain unchanged.

| Product | Confirmed source | Build/runtime hints | Unmigrated scheduling/dependencies |
| --- | --- | --- | --- |
| Promptence | margaryan-labs/ai-revenue-navigator | package.json declares Bun 1.4.1 and TanStack Start/Vite 8 | vercel.json has **4** cron entries; Supabase SDK, auth/OAuth and SSR output require separate verification |
| DAS / Booba | margaryan-labs/das-speak-armenia | Vite build, TanStack Start and Nitro packages | package.json lists **2** worker scripts: speech transcription and data rights; verify actual worker and SSR runtime |
| RAIOS | margaryan-labs/ai-os-foundation | Vite build with mandatory generated icon step; TanStack Start and Nitro | Supabase SDK present; separate data/auth/asset migration needed |
| VETO Sport | margaryanlabs/Vetosport | Next.js 16, build includes node tests | vercel.json has **9** cron entries; replace with server-side scheduler |
| Motion Studio | margaryanlabs/Margaryan-distribution | Next.js 16.3.3; npm; Node >=22 | separate Chromium/FFmpeg renderer, OAuth issuer, sales workers, CRM, private media |

**Important:** installing Coolify only deploys containers. It does not recreate Vercel cron tasks, Supabase Auth/Realtime/Storage, Vercel managed runtime semantics, OAuth callback URLs, or persistent worker state. Do not copy an assumed `npm start` into a TanStack Start service without verifying the generated SSR server after building.

## Pilot order

1. First deploy **nginx:alpine** or another disposable image to validate Docker, reverse proxy, HTTPS and DNS — no production migrations.
2. Then deploy a disposable clone of a low-risk Next.js page to validate GitHub integration and branch previews.
3. Test VETO Sport or DAS in staging *after* their schedules/workers and external dependencies are inventoried. No production DNS changes.
4. Move high-dependency apps (Promptence, RAIOS), Telegram services, trading ingestion and Motion workers only after offsite backups and restore tests.

## Deployment readiness gates

- Confirm repo access in Coolify GitHub App; least-privilege per project.
- Verify actual build commands and framework runtime; inspect `.output`/Docker image before declaring start command.
- Record names of required secrets **without putting values in source**.
- Migrate timers to cron/worker queues with idempotency and distributed locks.
- Compare auth/OAuth callback URLs, Telegram webhooks and domain DNS records.
- Validate storage mount, DB migration and offsite restore.
- Run staging smoke, rollback and cutover playbook before changing DNS.
- Keep temporary old hosting until errors and data sync are resolved.

## GitHub Actions blocker

At 20 Oct 2026, PR #92 jobs `web` and `voice-gateway` repeatedly concluded failure without reported workflow steps or logs. The default branch's recent runs showed the same pre-step failure. This is **not evidence that compilation failed**. Check the repository's Actions run banner, account Actions billing/spending limits, runner availability and workflow permissions in GitHub UI. Code changes alone cannot reliably resolve missing runners.

Local independent verification of the copied `lib/cloud/normalize.ts` behavior on Node 22 passed six normalization/URL/privacy tests and a standalone TypeScript check; repository-wide Next build remains **unverified**.
