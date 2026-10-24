# VETO Decision Command Specialist V1 — local read-only evidence

**Source and tests prepared. Not installed or scheduled on a VPS.** No production migrations, trades, exchange credentials or real worker observations are performed by this PR.

## Grounding in Decision Command

The existing `margaryanlabs/decision-command` Python worker already serves:
- `GET /healthz`: process liveness only. **Never** evidence that trading inputs are fresh.
- `GET /readyz`: deployment readiness including standby/handoff, **not** market readiness.
- `GET /market-readyz`: worker-reported primary market readiness based on its strict internal source-evidence gate. **Not independent market-data integrity validation**.
- `GET /governed-paper-readyz`: readiness of persisted owner-bound PAPER autonomy cycles. Fresh WAIT cycles are valid observations, not signals or trading permission. Explicit `live_order_permission`, `grants_execution_authority`, `proves_ready_trade` flags must all be false.

Read-only worker source: `services/veto_intelligence/veto_intelligence/health_server.py`. Historical docs record blocked Railway billing and PAPER epoch recovery work as of October 2026; this PR **does not assert** those issues are resolved.

## Execution boundary

`scripts/cloud/decision-specialist.mjs` calls **exactly four fixed GET endpoints** on a loopback-only origin specified via `CLOUD_DECISION_HEALTH_ORIGIN=http://127.0.0.1:PORT`. Redirects, public origins, arbitrary URLs, API credentials and response bodies larger than 8 KiB are refused. There is no HTTP POST, database read, exchange API access, order submission, trading recommendation or autonomous repair.

For a worker on another host, use a reviewed restricted loopback tunnel or a same-host operator-only worker deployment. **Do not expose VETO diagnostic endpoints publicly merely to enable these tests.** Bind the worker diagnostics to localhost.

A valid complete scan emits only bounded, preselected status labels and signals. A failed/incomplete poll is `unknown` and never replaces previous findings. The only persisted data are owner-private JSON receipts in an operator-owned directory (0700) with file mode 0600.

## Offline tests

From repository root, Node.js 22+:

```sh
node scripts/cloud/decision-specialist.mjs --plan
node --test scripts/cloud/decision-specialist.test.mjs
```

The focused specialist tests cover failure and safe states. This is **not** a live VETO observation or proof of profitable trading.

## Future operator pilot (no VPS configured)

Set `CLOUD_DECISION_HEALTH_ORIGIN=http://127.0.0.1:8787` (replace port with a verified local-only worker health port). Create `/var/lib/margaryan-cloud/agents` owned by `markarian` with mode 0700; run as that non-root account:

```sh
node scripts/cloud/decision-specialist.mjs --once
node scripts/cloud/decision-specialist.mjs --diff /var/lib/margaryan-cloud/agents/decision.json
```

When the owner verifies the real worker state and local-only networking, review the two unit templates under `deploy/cloud/agents/markarian-decision-specialist.{service,timer}`; they schedule checks every two minutes. Neither template is installed or enabled by this PR.

The Agent Supervisor reads the resulting `CLOUD_DECISION_STATE_FILE` as a **third** source, requiring all three recent complete snapshots (Portfolio Guardian, Coolify Sentinel, Decision Specialist). The protected Mission Control status endpoint returns UNKNOWN if the specialist is absent/stale, rather than depicting an apparently healthy integrated platform. Decision Specialist does not prove paper profitability, independently authenticate exchange prices, or authorize live orders.

## Still required before any Cloud production migration

Full checkout Node tests and Next.js typecheck/build, real Coolify VPS pilot, backups and restore exercise, agent timer operation, VETO source test against actual worker, audit logs, and manual owner approval. Never change exchange permissions or PAPER binding using a diagnostic agent.
