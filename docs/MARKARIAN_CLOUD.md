# Markarian Cloud — Private PaaS Control Plane (V1)

**Repository:** Margaryan Distribution, integrated at /cloud.  
**Status:** Source and read-only Coolify integration implemented. **No VPS purchased, no Coolify instance installed, no domains moved and no applications deployed** by this change.

## Why in Distribution

Cloud is an isolated module within the existing Next.js 16 app. Motion Studio, its render worker, sales distribution, their APIs and deployment configuration are untouched. It is linked in the bottom Workspace Dock via **System → Cloud**.

## What works

- Premium responsive /cloud workspace with Overview, Applications, Deployments, Servers, Migration Lab and Setup.
- Migration Lab is an interactive, **browser-local only** preparation checklist with GitHub-confirmed repository references and CSV clipboard export; it never claims a project is deployed or that a review hypothesis is a finding.
- Honest empty/setup states before infrastructure exists. A planning migration queue is **not** confused with actual deployments.
- GET /api/cloud reads the Coolify self-hosted API from the server using a token kept in environment variables only.
- API paths: /api/v1/applications, /servers, /deployments and /projects.
- Explicit allowlist of returned fields, preventing upstream secrets, environment values, DB credentials and internal configuration from reaching the browser.
- 8-second timeout, no-store headers, bounded results and partial-failure status.
- Regression tests in `scripts/cloud/test-contract.mjs` cover upstream-response normalization, prevention of leaking raw upstream secrets, trusted base-origin rules, HTTP error handling, GET-only adapter and preservation of the existing operator authorization policy. These tests run in the repository CI, when runners are available.
- Cloud is protected by the **existing Distribution `proxy.ts`**. Its established Motion/CRM/worker authorization behavior and matcher are preserved. If Distribution operator Basic credentials are configured, the UI and Cloud API require authentication. Without operator Basic credentials, both the Cloud UI and API are deliberately unavailable (HTTP 503).
- No side effects. No start/stop/redeploy/delete actions.

## Migration Lab / source-of-truth boundaries

The migration catalog in `lib/cloud/catalog.ts` is a manually curated planning aid. `repositoryVerified=true` means repository existence/access was checked through the connected GitHub account on 2026-10-20; it is not a code or runtime audit. Projects without confirmed canonical repositories are labelled unverified. Checkmarks are stored only under the key `markarian-cloud-migration-v1` in the current browser's localStorage and never represent real completed migrations. The export copies a CSV planning report to the clipboard.

## Source-based technical baseline and offline preflight

See `docs/cloud/MIGRATION_SOURCE_AUDIT.md` for actual repository build metadata for Promptence, DAS, RAIOS, VETO Sport and Motion. The Migration Lab displays these as clearly dated source facts, not as deployment statuses.

The zero-dependency operator preflight script checks local environment variable presence and optionally queries Coolify without logging credential values:

```bash
node scripts/cloud/preflight.mjs
# after setting CLOUD_COOLIFY_URL, CLOUD_COOLIFY_TOKEN and operator credentials:
node scripts/cloud/preflight.mjs --online
```

Offline mode reports missing infrastructure as WAIT rather than generating fake deployments. `--strict` and `--online` exit nonzero if requirements fail.

## Disposable pilot and CI recovery

A safe NGINX Compose pilot is provided in `deploy/cloud/pilot/compose.yaml`. See `deploy/cloud/pilot/README.md` for exact Coolify setup, test domain routing and health verification. This has not been deployed anywhere.

GitHub Actions pre-job failures and operator recovery steps are documented in `docs/cloud/GITHUB_ACTIONS_RECOVERY.md`; existing runner failures do not prove a Next.js compilation defect.

## Connect after VPS purchase

1. Buy a Linux VPS. Prefer >= 4 vCPU and 8 GB for a first real-world installation, increasing resources for build jobs and databases; capacity-plan separately.
2. Harden SSH, firewall and backups and install Coolify from official documentation: https://coolify.io/docs/get-started/installation .
3. Set up a domain and HTTPS for Coolify. Enable Coolify API in its admin settings, create a least-privilege **read-only** API token and consider an IP allowlist: https://coolify.io/docs/api/overview .
4. Set the following **server-side secrets** in the Distribution deployment. Do not add tokens to source control or NEXT_PUBLIC_* variables:
   - CLOUD_COOLIFY_URL=https://cloud.your-domain.com (origin only; https required)
   - CLOUD_COOLIFY_TOKEN=<read-only API token>
   - DISTRIBUTION_BASIC_USER=<operator login>
   - DISTRIBUTION_BASIC_PASSWORD=<long unique password>
5. Refresh /cloud. A real deployment is not reported until Coolify reports it. Production migrations are a separate activity.
6. Connect GitHub to Coolify using a dedicated GitHub App or authorized token; start with a low-risk project, test its build/health/HTTPS/webhooks and rollback.
7. Plan Postgres/Redis/Auth/Storage migrations separately; Coolify is not a drop-in replacement for Supabase's Auth, Realtime, Storage and Functions.
8. Create offsite scheduled backups and test **restoration**, not just backup creation.

## Security boundaries

- The cloud API is read-only, protected by the existing Distribution operator policy, and additionally fails closed when operator credentials are not configured.
- The optional public setup page cannot read the Coolify API if owner Basic credentials are missing.
- Backend never sends the Coolify Bearer token to the client.
- Only a trusted **configured** Coolify base URL can be requested. The UI cannot accept arbitrary URLs.
- No API state is persisted to disk or DB.
- Put all operator screens behind a VPN or zero-trust access policy before real production usage, rather than relying on Basic auth alone.
- No arbitrary-shell runner or multi-tenant container scheduling has been implemented.

## Validation

Repository CI already runs npm run typecheck and npm run build. Verify Cloud after merging with:

1. With no Cloud vars: /cloud loads the onboarding UI; /api/cloud returns 503 while operator Basic credentials are unset.
2. With operator credentials set: anonymous /cloud and /api/cloud requests return 401.
3. Authenticated /api/cloud without Coolify vars returns mode=setup and empty real lists.
4. With Coolify vars set: backend makes read-only requests and returns allowlisted live inventory; invalid token displays a degraded status, never fabricated success.
5. Confirm existing /motion, /sales, /intelligence unaffected.

## Roadmap (NOT implemented)

- GitHub App and managed repository import.
- Approve-to-deploy, preview environments, build logs, rollback.
- Live resource cost and service health metrics.
- Managed backups and restore test reports.
- Dedicated cloud frontend and isolated auth provider for multi-tenant use.

Coolify docs: https://coolify.io/docs/api/overview

## Verified offline API contract (2026-10-20)

Eight independent Node 22 tests passed on the copied Cloud adapter using mocked fetch calls. No real Coolify server is required. This is **not** a production Next.js build or browser integration test.

### Coolify server status mapping

The Coolify `GET /api/v1/servers` response exposes `settings.is_reachable` and `settings.is_usable` booleans, not a standard top-level `status` field. Markarian Cloud now derives `healthy`, `unreachable`, `not ready` or `unknown` from those values, without assuming a server is healthy when data is missing. No server was contacted in this PR.

## Command Center and manually added projects

Command Center is the default /cloud view. Its service data is read-only from Coolify, and a clear data-source availability flag prevents failed upstream calls from being misrepresented as zero services. Manually added project names and normalized GitHub paths are stored **only in the current browser's localStorage** under `markarian-cloud-projects-v1`; there is no server persistence, cross-device sync, repository write, project provisioning or credential collection. The operator may remove only this local planning entry — **not** a real deployment.

The /cloud UI and /api/cloud both fail closed with HTTP 503 until the existing Distribution operator Basic credentials are configured. Before hosting real customer resources use VPN/Zero Trust, SSO/MFA, scoped roles, audit trails and separate permission-controlled write flows; Basic alone is not an appropriate long-term multi-tenant access model.

## Self-hosted Supabase source preparation

`node scripts/cloud/prepare-supabase.mjs --plan` displays the pinned release and operator instructions without side effects. `--prepare /absolute/new/path` downloads the exact official self-hosted Docker release to a **new directory**; it never starts a service or creates credentials. `--verify /absolute/path` checks configuration field presence without printing any values. See `docs/cloud/SELF_HOSTED_DATA.md` for manual secured deployment, backups and disaster recovery. Four new offline tests run in CI.

## Provider connection statuses

Command Center shows a four-provider status strip. **Coolify** is live only after its read-only API succeeds. **Railway, Vercel and Supabase** are explicitly marked not connected to this application; although external connector tools may be available to ChatGPT, they are not inherited by the deployed website. No fake cross-provider statuses, costs or aggregated customer counts are presented. The next stage requires separate server-side read-only integrations, strict token scopes and consistent provider schemas.

## Legacy Provider Bridge (Vercel / Railway / hosted Supabase)

Server-side read-only metadata adapters are implemented in `lib/cloud/providers.ts`, API `GET /api/cloud/providers`. They require explicit private environment tokens. See `docs/cloud/PROVIDER_BRIDGE.md` for scoping, limits and privacy. This is a migration observation bridge, **not** a replacement for self-hosted data hosting or production deploy operations.

## API defense in depth

Both `/api/cloud` and `/api/cloud/providers` independently validate operator HTTP Basic credentials in Node.js using timing-safe SHA-256 comparisons. The existing root proxy continues to protect all Cloud pages and nested API paths. No Basic username/password means HTTP 503; invalid/missing credentials mean HTTP 401. This is an **interim owner-only access scheme**: self-hosted multi-user operations require SSO/MFA, permission-scoped roles, tamper-evident audit trails and preferably private VPN/Zero Trust access.

## Unified Cloud Studio

`/cloud → Cloud Studio` now offers twenty navigable modules (Deploy, Compute, Data, Operations, Security), searchable and filterable. For four supported Coolify inventory resources it shows live counts and first six records only if that API source succeeded. Non-inventory modules are labelled **Setup / Roadmap**; do not interpret the visible capability list as implemented hosting functionality. No production commands or write APIs are exposed.

## Our independently hosted infrastructure (primary direction)

Command Center now links to **Our Infrastructure**. This workspace is the central readiness map for self-hosted Compute, Data, Queue, Metrics, Recovery and Trust. It separates inventory observed from the connected Coolify instance from repository source readiness. We are NOT depending on Vercel, Railway or hosted Supabase for this target architecture, though the existing Distribution web deployment currently needs a live host before migration. Operations Compose for Valkey + Prometheus + Grafana is in `deploy/cloud/ops`; no public ports, locally generated secrets, no default public admin UI. Operator runbook: `deploy/cloud/ops/README.md`. The managed provider bridge remains an optional migration tool, not the main hosting system.

## Own Prometheus telemetry (read-only, no VPS required to develop)

Cloud OS now includes **Observability** and a compact Prometheus status widget in Command Center. The server-side endpoint `GET /api/cloud/telemetry` supports `CLOUD_PROMETHEUS_URL` and optional `CLOUD_PROMETHEUS_TOKEN`. It validates the configured origin, authenticates operators independently of the root proxy, accepts only three fixed aggregation queries, and omits scrape labels, instance hostnames, tokens and raw upstream data. An unconfigured or unreachable Prometheus reports setup/degraded with null metrics, not manufactured uptime numbers.

See `docs/cloud/SELF_HOSTED_TELEMETRY.md` for the secure connection and known limitations. The Ops Compose currently collects Prometheus self-metrics only, **not CPU/RAM/application health until exporters are installed**. Focused Node 22 offline tests of the telemetry parser and fetch adapter passed 5/5, plus a standalone TypeScript typecheck. The full repo build still requires a functioning runner.

## Markarian Recovery

Operator-only streaming encrypted PostgreSQL backup to Restic added at scripts/cloud/recovery.mjs. Review docs/cloud/RECOVERY.md before setting offsite credentials or running any backup. It does not migrate production databases, manage object storage, perform retention cleanup or guarantee a working staging restore. Browser only shows preparation instructions; backup execution stays out of web APIs.

## Recovery Center

The navigation now includes an owner-only Recovery Center with four operator stages: preflight, encrypted streaming PostgreSQL backup, read-only archive inspection and manual staging restore drill. The browser can copy non-secret CLI commands but cannot trigger backup/restore mutations. Repo source is available at `scripts/cloud/recovery.mjs`, with 11 locally passing mocked process tests and a runbook at `docs/cloud/RECOVERY.md`. Completion is not recorded until an external real restore and sign-off; the UI shows missing evidence as unknown, never invented success.

## Command Center visual redesign (2026-10-21)

New `app/cloud/command-v2.tsx` replaces the default page's outdated many-card dashboard with a premium editorial operations cockpit: infrastructure topology visual, actual-vs-planned source labels, accessible project filters, operator-local repo registry, expandable projects and prominent owner-infrastructure actions. Built directly into existing `/cloud`, not just an HTML mock. No live provider data is fabricated.

## VPS capacity planner

`/cloud → Capacity Planner` lets the owner evaluate **hypothetical** workload CPU/RAM allocations across host sizes and extra reserve. It intentionally excludes heavy Motion renderer and VETO ClickHouse by default until sizing them separately. It calculates resource fit but does not provision infrastructure, quote hosting prices or derive observed app traffic. Source `lib/cloud/capacity.ts` and offline regression tests `scripts/cloud/test-capacity.mjs`.

## Operator-only real staging importer

`deploy-stage.mjs` prepares and, when explicitly approved, calls the actual Coolify `POST /api/v1/applications/public` endpoint to create a **new staging application record only**. No production write, deployment launch or secret value is exposed by the web UI. This is the first intentionally guarded external write flow for a secured future VPS; it has not been connected to a VPS in this repository. See `docs/cloud/STAGING_DEPLOY.md`.

## Private GitHub staging import support

The standalone operator-only staging importer now supports private `owner/repo` sources through a preconfigured Coolify GitHub App UUID. No GitHub private key, client secret or repository credential is in the manifest. It posts exclusively to the documented `/api/v1/applications/private-github-app` endpoint and remains `staging` only. See `docs/cloud/STAGING_DEPLOY.md`.

## Mission Control V3

Root /cloud now opens app/cloud/mission-control.tsx. Connected-source health, responsive views for infrastructure, projects, data/domains and Agent Watch, with 60-second browser-session refresh. See docs/cloud/MISSION_CONTROL_V3.md. Agent automations remain planned; there are no production write controls.

## Read-only Sentinel V1 observer

A server-run, source-prepared one-shot infrastructure watcher is included at `scripts/cloud/sentinel.mjs`. It reads only three allowlisted Coolify inventories and emits incident changes. With a private operator-owned 0600 state file, `--diff` suppresses repeat notices and refuses to infer recovery during partial provider failures. No background deployment, notifications or autonomous remediation are active. Before setting up a VPS, see `docs/cloud/SENTINEL.md` and run the focused tests. Historical failed deployments older than 24h no longer count as current incidents.

## Sentinel status in Mission Control

The Agent Watch page now displays Sentinel V1's actual last complete observation after a private read-only status file is mounted with `CLOUD_SENTINEL_STATE_FILE`; the server route `GET /api/cloud/sentinel` rechecks operator authentication and returns a redacted, bounded status. It distinguishes setup, recent observation (within five minutes), stale data, and errors. A fresh poll is not an autonomous background agent, and no deployment or remediation writes are exposed. See `docs/cloud/SENTINEL.md`.

## First-owned-node staging evidence gate (2026-10-24)

`node scripts/cloud/first-node.mjs --plan` prints the steps before VPS purchase, without network calls. After an owned VPS has been secured and an isolated identified pilot deployed, `node scripts/cloud/first-node.mjs --verify --json` checks the explicitly selected Coolify server UUID using a private read-only token, plus HTTPS and the public marker of the disposable pilot. This gate is **staging-only** and never deploys, mutates resources, or authorizes production migrations. The command and 9 Node tests have been run locally; full CI/Next.js integration remains unverified. See `docs/cloud/FIRST_NODE.md`.

## Local release gate (no GitHub runner)

The owner can now run `node scripts/cloud/local-ci.mjs --plan`, `--cloud`, or `--full` from a trusted Node 22+ checkout. Cloud mode runs 17 regression suites. Full mode additionally requires preinstalled web dependencies and verifies TypeScript and the actual Next.js build locally. This is an optional independent alternative while hosted GitHub Actions runners are unavailable; it does not change production, deploy resources or waive first-node/backup/restore/rollback prerequisites. The harness itself has offline tests in `scripts/cloud/local-ci.test.mjs`. Runbook: `docs/cloud/LOCAL_RELEASE.md`.
