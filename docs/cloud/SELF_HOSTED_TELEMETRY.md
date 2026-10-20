# Markarian Cloud / Own Prometheus Telemetry

This is a real, read-only API integration for the **self-hosted** metrics server. It is not a simulation. It requires an actual accessible Prometheus server; there is no included metrics hosting and no client secrets.

## Configure on the protected Distribution server

- \`CLOUD_PROMETHEUS_URL\`: trusted HTTPS **origin** of Prometheus (e.g. \`https://metrics.internal.example\`), or HTTP loopback for same-host testing. Do not use paths, query strings, embedded credentials, or arbitrary user-supplied addresses.
- \`CLOUD_PROMETHEUS_TOKEN\` (optional): Bearer token for a protected reverse proxy. If omitted, the endpoint must remain private behind a firewall/VPN. Never open Prometheus's management/API endpoint publicly without strong auth.
- \`DISTRIBUTION_BASIC_USER\` and \`DISTRIBUTION_BASIC_PASSWORD\`: mandatory owner login for the Cloud panel and for the API even without a proxy.

\`GET /api/cloud/telemetry\` queries only these fixed PromQL expressions: \`count(up)\`, \`sum(up)\`, and \`prometheus_tsdb_head_series\`. All requests have 6-second timeouts, disallow redirects and bypass caches. Metric labels, hostnames, query strings, internal addresses and credential values are **not** returned. If a metric is missing or the server is offline, its value is \`null\`, never an invented zero.

The UI exposes monitored scrape target counts, reachable targets and active time-series. **These are Prometheus scrape targets, not user traffic, overall uptime, CPU usage or proof of project health.** Initially the Ops pilot in \`deploy/cloud/ops\` scrapes only its own Prometheus process. Node exporters, per-service jobs, logs and alerting must be installed and tested before we can claim comprehensive monitoring.

To test without a VPS, run:
\`node --experimental-strip-types --test scripts/cloud/test-telemetry.mjs\`

After connecting a real VPS, validate target reachability, metrics freshness, TLS, access control, alerts and restore independently.
