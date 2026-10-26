# Markarian Cloud — first owned VPS, executable staging handoff

**Status:** staged source only; this runbook does not purchase a server, log into a host or migrate a production application. The existing Coolify, first-node, data, recovery and project release gates remain authoritative. Operate this only on a fresh, owner-controlled Linux VPS.

## Goal and limits

The first success is **one disposable HTTPS NGINX pilot on Coolify**, not a claim of replacing Vercel, Railway or Supabase. Do not move Telegram sessions, payment secrets, OAuth redirects, DNS, student records, market-data workers or any production database until per-project migration and restore checks are proven.

**Sizing:** begin with at least 4 vCPU, 8 GiB RAM, 80 GiB *free* disk for staging; consider >=16–32 GiB RAM and separate analytics/data node for actual apps. These are our conservative pilot thresholds, not vendor minima and not a promise that all products will fit. Self-hosted Supabase recommends 4 CPU cores, 8+ GiB RAM and 80+ GB SSD (https://supabase.com/docs/guides/self-hosting/docker). Coolify minimums and install procedure: https://coolify.io/docs/start-with-self-hosted.

## Operator prerequisites

1. Purchase a fresh Ubuntu LTS VPS under the owner's account. Keep SSH keys and passwords in the owner's private password manager; never paste them into a chat or commit them to GitHub.
2. Create an unprivileged SSH user, use key-only access, block password/root SSH sign-in **after** confirming the second login, enable unattended security updates and an ingress firewall. Limit management panel to VPN/Zero Trust.
3. Protect SSH (22 from a trusted IP/VPN) and public 80/443 for TLS applications; avoid exposing ports 5432, 6379, 3000, 9090, 8000 or Grafana directly. Restrict any temporary first-access Coolify port.
4. Install Docker Engine and Docker Compose plugin from official instructions (or reviewed Coolify installer on a fresh host). Ensure access to the *local* daemon, not arbitrary remote Docker context. Docker group membership is root-equivalent.
5. Install Node.js >=22 and Git. Check out the reviewed Cloud branch and run the full local source quality gate on a separate trusted build machine before promoting real apps.

## Scalable fleet (independent of any single VPS price)

Use `node scripts/cloud/fleet-plan.mjs --plan "$(pwd)/deploy/cloud/fleet/staging.example.json"` to review placement of VETOGRAM and Promptence across separate application zones and private data pools. This is a source plan only, never a deployment or proof of real HA. See `deploy/cloud/fleet/README.md`.

## Verify Coolify connected fleet (after owning servers)

Use the **GET-only** verifier from `scripts/cloud/fleet-live.mjs`: store a private node UUID mapping in a mode-0600 file, configure an owner-held read-only Coolify API token, and run `--verify /absolute/staging.example.json --bindings /absolute/private/fleet-bindings.json`. It verifies source/server UUID identity and reachable/usable health. **Zone names are operator claims, not independently verified failure domains.** Consult `deploy/cloud/fleet/README.md`.

## Optional cost review (no service changes)

Run the read-only hosting budget estimator in `scripts/cloud/budget-gate.mjs --example`, then create an owner-only quote file and `--assess /absolute/private/quote.json`. It blocks stale quotes, missing tax and hosting-cost categories, estimates above the cap, and unverified provider metered limits. **Even a reviewed estimate is not a real vendor spending limit or purchase approval.** See `docs/cloud/COST_POLICY.md`.

## Safe checks (no service changes)

From the exact repo checkout on the owned VPS, run:

```sh
node scripts/cloud/vps-preflight.mjs --plan
node --test scripts/cloud/vps-preflight.test.mjs
node scripts/cloud/vps-preflight.mjs --check --json
```

`READY_FOR_DISPOSABLE_PILOT` confirms only host prerequisites. **It never authorizes production or database migration.** Missing Docker socket access, CPU, RAM, disk, or OS evidence results in `NOT_READY` with a nonzero exit. JSON contains named pass/wait checks, not IP addresses, tokens or server details.

## Coolify + disposable real deploy

1. Review the published install instructions at https://coolify.io/docs/start-with-self-hosted. Run the official installer on the fresh secured VPS after inspecting it, not unreviewed shell code.
2. Put the Coolify panel behind owner-only access and configure TLS/domain. Create a dedicated GitHub App scoped to this repository.
3. In Coolify create `markarian-cloud-pilots` > `staging`, point a **test** subdomain at the VPS and deploy `deploy/cloud/pilot/compose.yaml` with the adjacent `index.html`, **not** the production app. It listens internally on 8080 without a host port.
4. Configure least-privilege read credentials privately. Follow `docs/cloud/FIRST_NODE.md` and run `node scripts/cloud/first-node.mjs --verify --json`; confirm the exact disposable pilot marker via HTTPS.
5. Separately deploy a low-risk staging app after build and health checks, using `docs/cloud/STAGING_DEPLOY.md`. Do not remove old deployments.

## Database and worker rollout (not part of pilot success)

- **VETOGRAM + Promptence source portability:** use `node scripts/cloud/app-portability.mjs --audit vetogram /absolute/Telegram-story-bot` and `--audit promptence /absolute/ai-revenue-navigator` on actual reviewed checkouts. This inventory cannot approve production and flags Vercel-only start commands, hardcoded links, cron schedules, and managed database assumptions.
- **Postgres durability pilot:** disposable private `deploy/cloud/db-pilot/compose.yaml`, generated secret via `scripts/cloud/prepare-db-pilot.mjs`, instructions at `deploy/cloud/db-pilot/README.md`. This tests persistence only; it is not the production database.
- **Supabase:** official self-hosted Docker stack, each project separated where needed. Follow `docs/cloud/SELF_HOSTED_DATA.md`; Auth, Storage, Realtime, email and callback URLs are not supplied by bare Postgres.
- **Queue and monitoring:** private `deploy/cloud/ops/compose.yaml`, using `scripts/cloud/prepare-ops.mjs`. Do not publish ports.
- **Encrypted offsite backup:** separate failure domain and real restore per `docs/cloud/RECOVERY.md` and `docs/cloud/RESTORE_LAB.md`. Storage objects and application secrets need independent recovery plans.
- **Agents:** Sentinel, Guardian and Supervisor remain read-only until private tokens, timers and incident evidence exist.
- **Production:** require SHA-matched source build, HTTPS staging smoke, real offsite restore, auth/webhook parity and rollback per product. See `docs/cloud/RELEASE_EVIDENCE.md` and `docs/cloud/RELEASE_GUARDIAN.md`.

## Open blockers

The stacked Cloud PR chain (#92 -> #93 -> #95 -> #96 -> #97 -> #98 -> #99 -> #100 -> #101) is unmerged. Actions have failed before tests. This repo has no `package-lock.json`, so the Cloud workflow's previous `npm ci` could not work; the workflow now uses the same unlocked `npm install` as main until a reviewed lockfile is committed. **This is not reproducible dependency pinning or proof of build success.** No VPS, database migration, live restore or production cutover is claimed.
