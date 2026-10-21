# Markarian Cloud OS — Owned Operations Starter

Source only; not deployed. Private Compose staging for Valkey, Prometheus and Grafana.

## What is available after operator deployment
- Valkey: private Redis-compatible cache and worker queue building block. Authenticated user, keys restricted to markarian:* and dangerous commands disabled. This alone does not implement retries, idempotency or durable job acknowledgement.
- Prometheus: time-series monitoring, initially only scraping itself. Other metrics, alert rules and product health are NOT configured.
- Grafana: self-hosted dashboard, private by default, admin password in an external Docker secret.

## Prepare on an owned secured VPS (Node.js 22+, Docker Engine & Compose)
1. Harden SSH/firewall, install Docker and create an offsite encrypted backup destination.
2. Clone the feature branch and review deploy/cloud/ops/compose.yaml. Verify image tags and supported architectures, pin audited image digests before production.
3. Run: node scripts/cloud/prepare-ops.mjs --plan
4. Run: node scripts/cloud/prepare-ops.mjs --prepare /ABSOLUTE/PATH/TO/deploy/cloud/ops
5. It writes three secrets locally under deploy/cloud/ops/secrets with restrictive file modes; they are gitignored and never printed. Do not upload them.
6. Only when ready: cd deploy/cloud/ops; docker compose -f compose.yaml config --quiet; docker compose -f compose.yaml up -d
7. Access Grafana only via private VPN or configured Zero Trust ingress. Do not expose its port 3000 to the Internet. Queue port 6379 is private; clients need an explicitly approved private network.
8. Add real collectors, alerting, log retention, offsite backup, volume restore tests and strong operator identity before production.

## Out of scope and explicit limitations
- No publicly exposed ports, production migrations, managed DNS or Docker start from this PR.
- Supabase/Postgres/Auth/Storage are separate official self-hosted Supabase stack (docs/cloud/SELF_HOSTED_DATA.md). Avoid an unnecessary second database.
- No HA, multi-tenancy, public SaaS billing, encryption guarantees, Redis/Valkey worker semantics, app exporter collection or reliable disaster recovery yet.
- A single VPS failure still takes these services offline; migrate only after staging checks and rollback plans.

Docs: https://valkey.io/download/ and https://prometheus.io/docs/ and https://grafana.com/docs/