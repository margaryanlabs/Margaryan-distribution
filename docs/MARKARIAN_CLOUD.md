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
- Cloud is protected by the **existing Distribution `proxy.ts`**. Its established Motion/CRM/worker authorization behavior and matcher are preserved. If Distribution operator Basic credentials are configured, the UI and Cloud API require authentication. Without those credentials the Cloud API returns 503, and the static setup workspace may be displayed on deployments without sensitive-runtime protection.
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
