# Markarian Cloud — scalable multi-node fleet (implementation V1)

The existing Markarian Cloud stack is the control plane. This extension adds a **provider-neutral placement engine** and a reviewed fleet inventory for staging, extending the earlier single-VPS-only capacity view. It does **not** create servers or make the system automatically highly available.

## What the implementation actually does

Run from Node.js 22+ in the repository root:

```sh
node --test scripts/cloud/fleet-plan.test.mjs
node scripts/cloud/fleet-plan.mjs --plan "$(pwd)/deploy/cloud/fleet/staging.example.json"
```

The second command is intentionally read-only. It returns JSON placements and per-node free CPU, memory and disk estimates; it never asks for a hosting API token. Review-only placement uses exit code 3; missing capacity/HA or malformed manifest uses exit 1. **No command ever grants a production deploy.**

- Each node has a zone, eligible service pools, physical limits and OS reserve. This model is independent of VPS vendors and has no built-in monthly spend or server-count ceiling.
- Stateless application replicas are placed separately when possible. A service with `requireZoneSpread` must have at least two independent zones, and if the second cannot be placed it is explicitly marked unplaced.
- VETOGRAM and Promptence data pools are independent. Data workloads remain private, and `stateful` service replication is deliberately not fabricated: each stateful service is a single primary until **separate, proven** replication and failover orchestration exists.
- All resource figures in `staging.example.json` are staging estimates, **not measured production load**. Expected RAM/CPU fit is not measured database IOPS or HTTP concurrency.

## Topology after owning multiple servers

1. **Edge/application nodes:** terminate public HTTPS at a real reverse proxy/load balancer with working health checks. Run VETOGRAM and Promptence as stateless HTTP containers with exact immutable image digests and reviewed source SHAs. Coolify can coordinate deployments, but do not assume its panel alone provides database HA.
2. **Private data services:** VETOGRAM's Neon-v6-compatible Postgres and Promptence's full Supabase (PostgreSQL, Auth, Storage, Realtime, gateway) are separate security and recovery domains. Keep database credentials and admin consoles off public listeners. Supabase has RLS and Storage/Auth requirements not satisfied by `postgres:16` alone.
3. **Job workers:** run cron/queues via dedicated internal workers with idempotency, lease locks and distinct per-project secrets. Never run both old Vercel Cron and new jobs against customer data at once.
4. **Observability:** keep metrics and operations in a separate pool; local Prometheus/Valkey compose already exists at `deploy/cloud/ops/compose.yaml`, which itself is a single-host starter. Add external uptime checks, alert destination and out-of-band recovery.
5. **Backup and restore:** encrypted **offsite** backups, database WAL/PITR if required by business RPO, object storage copies, signing/encryption key escrow and staging restore drills. Single-VPS snapshots are not full disaster recovery.

## Infrastructure milestones for a real high-availability claim

- [ ] Confirm **two genuinely independent host/zone failure domains** in provider; a label named `zone-b` on the same machine is not isolation.
- [ ] Configure a real private network (provider private LAN or WireGuard), firewall deny-by-default, proxy routing and DNS; verify no public 5432/6379/Grafana/Coolify.
- [ ] Build actual containers, pin digest, inspect SBOM/dependencies and test the products on the target architecture.
- [ ] Choose database high-availability topology deliberately: Postgres primary/standby, automated failover, split-brain prevention, connection failover, WAL retention; **do not** deploy two primary containers and call that replication.
- [ ] Verify Supabase services retain consistent signing keys, published/secret keys, Auth users, Storage objects, Realtime and migration ordering. Run two-tenant RLS tests.
- [ ] Prove offsite encrypted backups, actually restore datasets including objects and keys onto empty staging, and measure RPO/RTO. Add alarms if backups expire or fail.
- [ ] Configure rolling/canary deploy, health probes, crash loops, resource pressure alerts, release rollback, staging OAuth/payment redirects and Telegram single-webhook cutover.
- [ ] Run a controlled failure drill (stop a replica and separately a worker/data node). Confirm what survives and document what **doesn't**. RPO/RTO are empirical, never assumed.
- [ ] Only then consider live customer migration one product at a time. Existing cloud services remain until rollback and data consistency are demonstrated.

## Examples, costs and growth

`deploy/cloud/fleet/staging.example.json` models **four nodes**: two stateless app zones and independent VETOGRAM and Promptence data nodes. The service data pools are illustrative assignments, not hostnames, secrets, or actual provider availability zones.

There is no fixed $50 policy, no arbitrary machine-count ceiling and no automatic scale-out restriction built into Fleet Planner. Spend monitoring is a separate, optional business control in `scripts/cloud/budget-gate.mjs`. Provisioning additional machines **always requires explicit owner-directed credentials and purchase actions**; this source does not buy anything.

The existing `Capacity Planner` remains a **single-node estimate** with custom CPU and RAM fields. The fleet JSON tool is the source of truth for multi-node placement until a proper live inventory and verified orchestration backend exists.

Related drafts: Markarian Cloud #115, #118; VETOGRAM #186; Promptence #337. All remain staging/review-only until actual host and application checks pass.

## Live Coolify node reconciliation (GET only; source implementation V2)

Coolify documents the self-hosted REST API at `https://<owner-coolify-domain>/api/v1`. `GET /servers` requires a bearer token. The authoritative API docs are https://coolify.io/docs/api/overview and https://coolify.io/docs/api/endpoints/servers/list-servers. Create a **read-only team-scoped token** using Coolify's API permissions and enable the API with an IP allowlist, preferably accessible through VPN/Zero Trust.

When an owned Coolify host and deployment servers exist:

1. Ensure `CLOUD_COOLIFY_URL` is the trusted HTTPS Coolify panel origin. Never send a token to an untrusted site.
2. Copy `bindings.example.json` to **an owner-controlled secret directory outside the repository**, replacing placeholder server UUIDs with exact UUIDs from Coolify. Preserve exactly one UUID for each planned node. This is a mapping, not a proof that zones are independent.
3. Set permissions on the binding file and API token file to mode 0600; own them as the user invoking Node. Do not add them to git, screenshots, chat, or logs.
4. Run the source-only check first. This performs **no network requests**:

```sh
node scripts/cloud/fleet-live.mjs --plan "$(pwd)/deploy/cloud/fleet/staging.example.json"
```

5. On an operator-controlled host, with the read-only API enabled, run the GET-only reconciliation:

```sh
export CLOUD_COOLIFY_URL="https://cloud.example.com"
export CLOUD_COOLIFY_READ_TOKEN_FILE="/private/secure/location/coolify-read.token"
node scripts/cloud/fleet-live.mjs --verify "$(pwd)/deploy/cloud/fleet/staging.example.json" \
  --bindings "/private/secure/location/fleet-bindings.json"
```

The CLI queries **only** `GET /api/v1/servers` with no redirects, an 8-second timeout and a bounded 1 MiB response. Tokens stay in local private files and never appear in the JSON receipt; network errors are sanitized. It checks the planned node ID ↔ selected Coolify UUID, rejects duplicate identities, and requires `settings.is_reachable === true` AND `settings.is_usable === true`.

**What it proves:** the connected Coolify server records match the reviewed manifest and Coolify reports them reachable/usable at that moment.

**What it does NOT prove:** that the servers occupy separate physical zones, have the planned vCPU/RAM/disk capacity, can communicate over the required private network, have matching application image SHAs, have working load balancing, tolerate failure, or have a replicated and restorable database. The receipt always has `independentFailureDomainsVerified=false`, `databaseReplicationVerified=false`, `canClaimHa=false`, and `canDeploy=false`. Even a complete match exits with review-only code 3 rather than a production-ready code 0. Missing or unhealthy server, unsafe private file, invalid inventory or inaccessible API exits 1.

**Still mandatory:** verify actual cloud provider account topology, health probes and load balancer behavior, real Docker image/runtime across machines, offsite backups and a **real** restore, least-privilege networking and authentication, plus a controlled failover drill. A UUID binding and healthy API status are not evidence of those properties.
