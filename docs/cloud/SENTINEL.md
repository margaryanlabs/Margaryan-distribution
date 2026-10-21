# Markarian Sentinel V1 — read-only infrastructure watcher

**Implemented in code, NOT DEPLOYED or running in the background.** A future owner-managed VPS can execute the watcher periodically. It never deploys, restarts, deletes, writes databases, sends webhook messages or changes DNS.

## Actual scope

- Coolify read-only GET inventories of applications, servers and deployments (fixed, allowlisted paths only).
- Normalize fields before evaluating app failures, unreachable servers and deployment failures from the **last 24 hours**; earlier failed deployments do not remain current incidents forever.
- Print a machine-readable JSON health receipt from `--once`.
- With `--diff`, compare with the previous complete poll: new, changed, ongoing and resolved incidents, and atomically store minimal state under a private `0600` file.
- When Coolify sources fail, report a degraded poll, return a nonzero status, **do not overwrite the previous state**, and do not claim any incident resolved.
- Bounds on signal count and no secrets, raw Coolify objects, production write tokens or log bodies in output.

## Secure future VPS setup

Create a non-root operator service account. In a secure environment, set `CLOUD_COOLIFY_URL` (trusted HTTPS origin) and `CLOUD_SENTINEL_TOKEN_FILE` (absolute path to an owner-owned, chmod 600 **read-only** Coolify token, kept OUTSIDE GitHub). For `--diff`, create a private directory (chmod 700) owned by this service account and use an absolute state-file path.

    node --experimental-strip-types scripts/cloud/sentinel.mjs --plan
    node --experimental-strip-types scripts/cloud/sentinel.mjs --once
    node --experimental-strip-types scripts/cloud/sentinel.mjs --diff /private/operator-owned/state.json

Use a locked systemd timer or cron with `flock` once a real VPS is available, with private rotated logs. The application does not create a scheduler or launch an agent automatically. No remote alert delivery is present yet.

## Limitations and next gates

- Reports reflect Coolify's statuses, not validated global customer uptime, DNS propagation, TLS health or database consistency.
- A **complete poll** proves only that three selected Coolify endpoints responded, not that every upstream resource is healthy.
- Single local state file is not high-availability, signed incident history, RBAC audit or an AI agent.
- Real-time notification channels, per-project thresholds, approval-controlled remediation, ClickHouse ingest probes, and active Postgres/Auth/Storage diagnostics are separate future stages.
- Do not set `CLOUD_COOLIFY_WRITE_TOKEN_FILE` for Sentinel. Its role should grant only the three inventory reads.
## Connecting the protected status display

After the owner operates a real scheduled Sentinel, optionally mount its private `state.json` read-only into the Markarian Distribution server/container and configure the server-only `CLOUD_SENTINEL_STATE_FILE=/absolute/path/state.json`. The container process must be able to read the file; it must be a non-symlink regular file with no group/other permissions (`0600`). Do NOT provide this path to the browser or expose a shared volume to other apps. The protected `GET /api/cloud/sentinel` endpoint returns only an allowlisted incident summary and the last complete timestamp; it never accepts path query parameters. Agent Watch marks an observation **stale after five minutes**, even if last recorded conditions were healthy.

A fresh state file is a successful **read-only poll**, not a claim that a background agent is continuously running, that all systems are healthy, or that AI remediation has been enabled. Do not connect a production write token to this feature.
