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
