# Markarian Cloud OS — Mission Control V3

Source implemented in existing Distribution repository, not deployed. Real Next.js browser and full build testing remain blocked by GitHub Actions pre-runner failures.

## Four workspace views
1. Infrastructure — Coolify server/deployment records and explainable warnings; unknown source appears as unknown, never fabricated healthy.
2. Projects — exact GitHub repo matches, catalog, project search and hosted/issues/planned filters. Added local project entries stay in the current browser.
3. Data & domains — configured Coolify domain hostnames, legacy Vercel/Railway/Supabase Cloud project inventories via read-only Bridge and optional real ClickHouse diagnostics. Domain configuration does not prove DNS or TLS validity.
4. Agent Watch — deterministic explainable signals only; future autonomous agent roles are deliberately labeled planned. Session Watch refreshes every 60 seconds ONLY while that browser page is open; it is not a background worker.

## Private server-only ClickHouse configuration
- CLOUD_CLICKHOUSE_URL: trusted HTTPS origin for private ClickHouse HTTP endpoint, or localhost HTTP for same-host testing only.
- CLOUD_CLICKHOUSE_USER: dedicated least-privilege ClickHouse monitoring user, read-only at the server level.
- CLOUD_CLICKHOUSE_PASSWORD: private password in secure server environment. Never use NEXT_PUBLIC or enter in the browser.

Authenticated GET /api/cloud/clickhouse sends only a fixed SQL SELECT returning server version and uptime. HTTP request sets readonly=1, uses server-only X-ClickHouse-User and X-ClickHouse-Key, forbids redirects and returns no upstream raw rows or password. Do not expose port 8123 or PostgreSQL/Valkey to the public Internet. ClickHouse documentation: https://clickhouse.com/docs/interfaces/http

## Monitoring source contracts
- GET /api/cloud: Coolify applications, servers, deployments, projects and per-source success flags.
- GET /api/cloud/providers: read-only hosted Vercel, Railway, Supabase Cloud project inventories. Discovery is not uptime.
- GET /api/cloud/telemetry: Prometheus scrape targets and series when a real Prometheus exists.
- GET /api/cloud/clickhouse: read-only ClickHouse uptime and version only.
- lib/cloud/health-signals.ts: deterministic severity-tagged alerts derived from observed app/server/deployment statuses; no fake alerts on unknown sources.

## Future agents, not yet running
Infrastructure Sentinel, Release Guardian, Database Observer, Security Auditor and Capacity Analyst are planned. Before connecting real autonomous agents: separate worker identity, scoped read-only APIs, permission policy, scheduled execution, incident deduplication, durable audit history, test/rollback plans and multi-factor approval for any deployment, database write or restart. The console currently offers no destructive APIs.

## Preview truth
The separately delivered interactive HTML preview uses EXPLICIT simulated states to demonstrate visuals. The actual Next.js UI reads real inventory and shows not connected placeholders when sources do not exist. This PR does not buy a VPS, modify production DNS, create cloud resources or migrate customer data.