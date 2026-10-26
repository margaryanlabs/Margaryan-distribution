# Margaryan Cloud — provider-independent recovery execution plan

Date: 2026-10-26. **Source-only. No VPS bought, no production deployed, no payments or databases modified.**

## Recovery source of truth

- PROMPTENCE code: `margaryan-labs/ai-revenue-navigator`. Canonical old hosting: Vercel `ai-revenue-navigator` / `promptence.tech`. Supabase data-plane: `znklnzfpbcgahalzhlsb` currently INACTIVE. 277 SQL files tracked by its production migration ledger, **not** a backup of rows or Auth/Storage objects.
- VETO code: `margaryanlabs/decision-command`. Canonical old hosting: Vercel `veto-decision-command`. Supabase data-plane: `iabqsmenoiksrnyoxabz` currently PAUSING. ClickHouse on legacy Railway may hold irreplaceable time-series data. Its source schemas do **not** reproduce history.
- Margaryan Cloud: `margaryanlabs/Margaryan-distribution`. Base for this work is the existing stacked Cloud validation branch and **must not be merged/deployed before full CI/build and stage restore tests pass**.

## Railway independence

- No Railway connector, token, payment or active runtime is a dependency for Coolify, domain controls, private mission control or staging.
- Leave `CLOUD_RAILWAY_TOKEN` unset. The existing read-only provider bridge intentionally reports Railway `not_configured`; it must not report incident or block deployment of unrelated applications.
- Historical Railway database/volume data still needs independent provider retention/export confirmation. Unpaid invoices are unaffected by avoiding the runtime provider.
- **Security:** Railway October 21 incident triggered a workspace-specific warning; rotate all possibly exposed Railway-stored AI, GitHub, registry and DB secrets in their originating providers, coordinated with dependent applications. Never reuse those old values on our VPS.

## Do not buy yet

Current Cloud PR chain through #100 cannot pass final build gate because GitHub Actions jobs have failed **before any steps start**, with no full build proof. Do not interpret a green local mock test or READY historical Vercel deployment as new host readiness.

## First staging host purchase gate

1. An actual GitHub runner or protected, reproducible equivalent builds both target runtimes, runs preflights and essential security/authorization tests; preserve logs.
2. Confirm app resource envelopes. For a **web-only disposable** start, approximately 4 vCPU/8 GB RAM may suffice; do not promise a production SLA or colocate high-memory ClickHouse, a full Supabase stack and AI workers on it.
3. Private Coolify operator portal behind VPN/Zero Trust + MFA, scoped GitHub App, container resource caps, TLS, firewall, dedicated per-app secrets, health checks, no exposed DB ports.
4. Establish **offsite encrypted backups** and restore into an isolated empty host. Existing `scripts/cloud/recovery.mjs` handles encrypted pg_dump; existing Restore Lab only proves a disposable DB restore, not Auth and Storage or full product.
5. Deploy a throwaway NGINX pilot; prove error alerts, rollback, resource caps, HTTPS and non-production domains.
6. On success, stage Promptence web and VETO public UI independently, with disabled outbound AI calls, payment processing, cron, collector and trading execution.
7. Only after authorized data restores and negative RLS tests, add app data plane and jobs. Production DNS cutover requires explicit review, recovery snapshot and rollback.

## Finance guardrails

- Do not automatically pay legacy Vercel/Railway bills; first reconcile duplicates/credits and retention trade-offs. Vercel's 2026-10-23 notice reports corrections of historical overcharging.
- Obtain exact remaining total on two Supabase invoices before deciding to pay to export protected customer data. Supabase ticket SU-515975 says data is retained currently but all invoices must be paid to restore access.
- Budget VPS, dedicated offsite backup storage, AI API quotas and email/egress independently. Resource alerts, off-switch and owner-approved spending are mandatory.

See `docs/cloud/SELF_HOSTED_DATA.md`, `docs/cloud/RECOVERY.md`, `docs/cloud/STAGING_DEPLOY.md` and `docs/cloud/CI_STACK_PREFLIGHT.md`. Source references: https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/platform/clone-project .
