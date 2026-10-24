# Margaryan Cloud — Agent Supervisor V1

**Current status:** source, protected API, Mission Control UI and offline tests are prepared. The systemd units below are **templates only**. No VPS, timers, live scans, trading checks or notifications have been installed. No production changes.

## Operating model

- Portfolio Guardian: read-only GitHub repository/PR/Actions metadata for two Margaryan Labs owner namespaces. No source-code or production runtime security scan.
- Infrastructure Sentinel: read-only Coolify applications/servers/deployments. No independent external uptime probe.
- Agent Supervisor: reads only **completed private snapshots** from the two above sources. No third-party API token, network call, trade or server restart. Unconfigured/stale/incomplete data yields **unknown**, never "healthy".
- Decision Command appears as a critical GitHub portfolio target. Trading signal freshness, market-data integrity, paper-trading ledger, exchange permissions and live orders are **not inspected** by this release.

Incident ranking is critical, warning, info. Supervisor records a diff and marks a finding resolved only after BOTH private source snapshots are recent. Freshness boundaries: Guardian 6h; Sentinel 5 min; the web report 10 min. "No findings" refers only to the observed sources and does not certify production uptime, database security or readiness.

## Offline verification (before VPS)

Node.js 22+ on a trusted operator machine:

    node scripts/cloud/agent-supervisor.mjs --plan
    node --test scripts/cloud/agent-supervisor.test.mjs
    node --experimental-strip-types --test scripts/cloud/test-agent-supervisor-status.mjs

The scripts have no GitHub Action runner dependency. They do not deploy code.

## Example operator setup — manually on a future secured Linux VPS

1. Create a non-root Linux service account "markarian"; clone the reviewed Cloud branch in /opt/margaryan-distribution. Verify that the systemd service user's PATH resolves `node` to Node.js 22+ (`/usr/bin/env node`); if not, explicitly configure a reviewed absolute Node path in each unit. The template unit files passed an offline systemd-analyze syntax check, but have not been installed on a VPS.
2. Create /var/lib/margaryan-cloud/agents with **0700 permissions and markarian ownership**. Keep all snapshots **0600**. Do not put state in Git, public logs or a web-accessible directory.
3. Create /etc/margaryan-cloud/agents.env, private root-owned 0600, with the following **paths only** (no token values):

        CLOUD_COOLIFY_URL=https://your-secured-coolify-host.example
        CLOUD_SENTINEL_TOKEN_FILE=/etc/margaryan-cloud/secrets/coolify-read
        CLOUD_GUARDIAN_GITHUB_TOKEN_FILE=/etc/margaryan-cloud/secrets/github-read
        CLOUD_SENTINEL_STATE_FILE=/var/lib/margaryan-cloud/agents/sentinel.json
        CLOUD_GUARDIAN_STATE_FILE=/var/lib/margaryan-cloud/agents/guardian.json
        CLOUD_SUPERVISOR_REPORT_FILE=/var/lib/margaryan-cloud/agents/supervisor.json

4. Store token values **only in separate non-symlink 0600 files** readable by the markarian service account. Their parent directories must permit markarian to traverse them. Use narrowly scoped read-only GitHub Actions, Metadata and Pull Request permissions and Coolify read-only inventory. Never paste these values into GitHub, chat, a URL, or a browser.
5. Copy the six reviewed files from deploy/cloud/agents into /etc/systemd/system. Check each WorkingDirectory, ExecStart and service user. Run the three commands manually once, in this order: Portfolio Guardian --diff, Sentinel --diff, Agent Supervisor --diff.
6. Only after reviewing private logs and verifying the three snapshots, enable timers for Guardian (hourly), Sentinel (even minutes), and Supervisor (odd minutes):

        sudo systemctl daemon-reload
        sudo systemctl enable --now markarian-portfolio-guardian.timer
        sudo systemctl enable --now markarian-infrastructure-sentinel.timer
        sudo systemctl enable --now markarian-agent-supervisor.timer

No timers have been enabled by this PR. Service stdout is suppressed to avoid writing private repo names into systemd journal; diagnostic stderr is intentionally generic. Scheduler failures still need an operator or a separately approved notification transport.

7. Mount ONLY the private supervisor report into the authenticated Next.js server, set CLOUD_SUPERVISOR_REPORT_FILE there, and verify GET /api/cloud/agent-supervisor requires cloudOperatorAccess. The browser cannot supply a file path and receives only bounded sanitized findings.

## Future Decision Command specialist

A subsequent independent **read-only** adapter must inspect evidence from Decision Command on worker heartbeat, market data freshness, failed ingest, scoring/backtest/paper-trading consistency and scoped exchange permissions. It must never execute live orders, receive withdrawal credentials or mark a trading strategy safe/profitable. No such pipeline monitor is active yet.

## Release gates remaining

- Complete repository typecheck and production Next.js build (not yet verified).
- Run both new and the rest of Cloud tests in a full checkout.
- Deploy a disposable Coolify pilot with HTTPS/health evidence.
- Test encrypted offsite backup and **real isolated PostgreSQL restore**.
- Provision protected machine identities, audit logs and monitoring for timer failure.
- Approve any app-by-app migration separately. Never switch DNS or customer databases based on Guardian/Supervisor results alone.
