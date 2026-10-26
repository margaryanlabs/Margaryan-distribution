# Markarian Cloud — local release checks without GitHub Actions

**Status:** the source and tests can run on a trusted machine with Node 22+. This is a **software quality gate only**, not a VPS installation, backup or production migration approval. It does not connect to Coolify or use GitHub Actions minutes.

## Run

From the **repository root on the Cloud branch**:

```sh
node scripts/cloud/local-ci.mjs --plan
node scripts/cloud/local-ci.mjs --cloud
node scripts/cloud/local-ci.mjs --full
node scripts/cloud/local-ci.mjs --full --json
```

`--cloud` runs 29 Cloud regression suites, including first-node verification, portfolio Guardian GitHub audit, isolated restore lab, recovery, auth, deploy, telemetry and Sentinel tests. They use Node's built-in test runner without installing npm dependencies. **Plan** is non-executing. **Full** runs the Cloud suite followed by `npm run typecheck` and `npm run build` locally. Full requires dependencies already installed in `node_modules`; it never invokes `npm install` itself. If a mandatory step fails or is missing, later steps are skipped. An unsuccessful run exits 1; invalid arguments exit 2.

Local `npm run build` includes repository prebuild Motion regression tests and writes build artifacts under `.next`. Run it in an isolated trusted checkout with ample RAM/disk. It does not deploy infrastructure, but existing project build hooks must be reviewed before execution. **Do not run on a production machine as root.**

Subprocesses receive only a minimal environment, excluding provider tokens and secrets. The JSON report includes only step IDs and pass/fail status, not command stdout/stderr, tokens or production machine metadata. To debug individual failures, manually run the reported test in a trusted environment; do not copy private logs into chat or GitHub.

## Interpretation

- `PLAN_ONLY`: nothing executed.
- `CLOUD_TESTS_VERIFIED`: all 29 Cloud suites passed in this checkout; full build and VPS are not verified.
- `LOCAL_BUILD_VERIFIED`: 29 Cloud suites, TypeScript typecheck and the Next.js build passed locally.
- `BLOCKED`: a check failed or was missing; inspect the step status.

**No output means production is approved.** `productionReady` and `canMigrateProduction` remain `false` in every mode. Promotion requires a real First Node staging receipt, app-level runtime smoke checks, independently tested offsite backup and restore, secure access, and manual cutover/rollback approval.

## Why not GitHub Actions?

GitHub Actions runners for the existing Cloud PR have been failing before executing job steps. The local path avoids those runners. A local pass is evidence of a local run, not proof GitHub CI recovered or production is deployed.
