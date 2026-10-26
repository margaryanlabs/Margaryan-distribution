# Margaryan Cloud: stacked CI and staging readiness

**Status 2026-10-24:** No confirmed full Next.js build on the stacked Cloud branch. No owned VPS, real Coolify staging, encrypted restore or rollback has yet been executed.

## Identified missing CI coverage

The main workflow .github/workflows/ci.yml triggers pull_request only when the PR base is main. Our cloud PRs are stacked against intermediate feature branches; PR #99 targets PR #98's branch. No successful main workflow test run on the latest feature HEAD was available.

The new cloud-stack-ci.yml recognizes feature-base pull requests and uses minimal read-only GitHub permissions, no secrets and no deployment tokens. One explicit branch workflow push also attempts TypeScript and the full Next.js/Motion prebuild. The full-build job does NOT automatically run for every feature PR.

First observed run: https://github.com/margaryanlabs/Margaryan-distribution/actions/runs/40115604030

- Result: FAILURE.
- Both jobs, cloud-safety and web-build, completed with failure.
- Both reported zero recorded steps and finished within seconds.
- This is evidence of **runner startup failure**, not verified source-code test failures. The underlying reason requires GitHub Actions account, runner, billing and policy inspection; do not guess or bypass platform account restrictions.

## Reproducible operator checks

Node.js 22+ on a trusted machine with a COMPLETE GitHub checkout:

    npm install --no-audit --no-fund
    node scripts/cloud/local-ci.mjs --cloud
    node scripts/cloud/local-ci.mjs --full
    npm run typecheck
    npm run build

There is currently no committed package-lock.json; npm ci cannot run. The unlocked npm install matches main CI, but is not a reproducible dependency lock. Generate and review a committed lockfile before treating a full-build result as a reproducible release.\n\nNo production keys are needed for these offline checks. This assistant environment cannot clone the full public GitHub repo due network/DNS restrictions, so these complete commands were not executed here.

Read-only classification of GitHub run/job metadata:

    node scripts/cloud/ci-run-gate.mjs --plan
    node --test scripts/cloud/ci-run-gate.test.mjs
    node scripts/cloud/ci-run-gate.mjs --inspect /absolute/private/run.json

Snapshot JSON includes run id, head_sha, status and conclusion plus required job names/statuses/recorded steps. Do not include secret values or full logs. The private file must be 0600, regular and operator owned, not a symlink.

The classifier distinguishes RUNNER_STARTUP_FAILURE, TEST_FAILURE, UNKNOWN, MISSING_REQUIRED_JOBS, PENDING and TESTS_OBSERVED_SUCCESS. Even successful tests return nonzero status 3 (human review), never grant production permissions. Local tests of this classifier passed 9/9 on Node.js 22.

## Before first VPS and application staging

1. Resolve GitHub Actions pre-step failures using actual run details and platform account settings.
2. Confirm successful full cloud tests, TypeScript and Next.js build; capture exact Git SHA and reviewed artifact.
3. Only then provision a secured isolated test VPS, setup Coolify and follow docs/cloud/FIRST_NODE.md with a disposable pilot.
4. Verify HTTPS, expected staging identity and app-specific smoke checks via docs/cloud/RELEASE_EVIDENCE.md. The self-reported marker is not signed proof.
5. Test an encrypted offsite Postgres backup, isolated restore and reversible staging deployment.
6. Require independent explicit owner approval for each production cutover. Never alter real VETOGRAM Telegram sessions, trading exchange authority, payment credentials, student data, DNS or production databases automatically.

No part of this PR deploys infrastructure or releases user-facing products.
