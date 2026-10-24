# Margaryan Cloud — Portfolio Guardian V1

**Status: source and offline tests only. NOT deployed, scheduled, or connected to a VPS.**

Portfolio Guardian complements Infrastructure Sentinel. Sentinel reads Coolify app/server/deployment state; Guardian reads GitHub repository metadata, latest Actions CI, and a sample of open PRs from both owner spaces: margaryanlabs and margaryan-labs. It dynamically includes repositories visible to its token, including VETO Decision Command, VETOGRAM, SOFIA/DAS, Promptence, VETO Sport and others.

## Observations and boundaries

- Read-only authenticated GitHub discovery, owner allowlist, bounded pagination and concurrency.
- For each repository: default branch, privacy/archived flags, last GitHub push age, most recent available Actions conclusion, and up to ten open PRs. Ten is a sample, not a total.
- A completed failed/timed-out/action-required CI adds a finding. Critical projects (especially Decision Command) have elevated incident severity.
- Missing or pending CI is unknown or pending, never successful. Dormant projects are not automatically marked unhealthy.
- A private --diff state file identifies new/changed/resolved findings. Incomplete sources never overwrite previous state or fabricate recoveries.
- Every output explicitly states runtimeChecked=false, productionReady=false, autonomousRemediation=false.

This is a deterministic operator-run auditor, not an LLM with infrastructure write permissions. No GitHub writes, trades, DNS changes, deployments, notifications, code-security scans or production uptime checks have been implemented here.

## Run (trusted Node.js 22+ operator machine)

First run the offline plan and no-network tests:

    node scripts/cloud/portfolio-guardian.mjs --plan
    node --test scripts/cloud/portfolio-guardian.test.mjs

Use a **fine-grained, read-only GitHub token**, authorized for both owner namespaces and relevant private repos, with Metadata read, Actions read and Pull Requests read. Put it in an absolute non-symlink operator-owned mode-0600 private file. Never put it in Git, browser storage, NEXT_PUBLIC environment variables, ChatGPT or shared logs.

    export CLOUD_GUARDIAN_GITHUB_TOKEN_FILE=/absolute/private/github-token
    node scripts/cloud/portfolio-guardian.mjs --once

To compare incidents, create a private operator-owned directory (mode 0700):

    node scripts/cloud/portfolio-guardian.mjs --diff /absolute/private/guardian-state.json

The state can contain the names of private repos. Do not publish it. Missing permissions, partial checks and pagination limits produce an incomplete result, not a green one.

## Periodic execution (future; not running)

Once a secured VPS or other always-on host exists, schedule an hourly unprivileged systemd service/timer with a private home directory, flock for exclusive execution and restrictive private logs. Notification transport is a separate secure integration; do not assume that the script sends messages. Do not install a privileged self-hosted GitHub Actions runner merely to avoid hosted CI billing.

Future Supervisor: Portfolio Guardian (GitHub), Infrastructure Sentinel (Coolify), independent production probes, Release Guardian, database/worker health, and a VETO Decision Command specialist checking pipeline freshness without executing trades. All repair or deployment actions require independently scoped owner approval and rollback tests.
