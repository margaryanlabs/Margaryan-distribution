# Margaryan Cloud — Stack Readiness Gate V1

**Source only. No merge, deploy, VPS purchase, database migration or trading action.** This gate evaluates the exact GitHub PR dependency chain and latest observed CI evidence. It never authorizes merging, regardless of status.

## What is checked

The reviewed PR chain is explicit and immutable in scripts/cloud/cloud-stack-readiness.mjs:

92 (main) -> 93 -> 95 -> 96 -> 97 -> 98 -> 99 -> 100 -> 101.

Each PR must be OPEN on its expected feature branch, target the exact preceding branch, expose a 40-character HEAD commit SHA and eventually be marked ready for human review. The gate checks the GitHub Actions run SHA against that HEAD and requires the canonical repository as both action source and head. It checks the selected run's recorded job results and executed steps. Missing workflows, untrusted forks, stale SHA, draft state, failed jobs or an incomplete chain block promotion.

This is a *read-only review gate*, not a GitHub branch protection setting. It does not prove that all production rollout prerequisites have passed, nor does it itself merge anything. GitHub CI can be unavailable because of account settings, billing/runners, rate limits or upstream system status; the gate must not guess the cause.

## Operator-only use

1. Review current code and security settings for PR #101 and its ancestors. Install Node.js >= 22 in a trusted operator environment.
2. Create a fine-grained GitHub read-only token with minimum Metadata, Pull requests and Actions READ permissions for margaryanlabs/Margaryan-distribution. Save it in a regular, owner-owned 0600 local file; do not use a symlink or a browser env variable.
3. Export only the private absolute path in CLOUD_GITHUB_READ_TOKEN_FILE. Do not expose the token, repository credentials or raw HTTP responses to console logs.
4. Check the deterministic plan offline:

    node scripts/cloud/cloud-stack-readiness.mjs --plan

5. Run a live read-only GitHub inspection:

    node scripts/cloud/cloud-stack-readiness.mjs --audit

The command makes only GET requests to fixed GitHub API URLs for the nine expected PRs, selected SHA-scoped workflow runs and the chosen run jobs. It does not query user-supplied addresses or change PR metadata. GitHub API rate limits apply.

The CLI returns 1 for missing or blocking evidence, 3 when all selected checks are observed and **manual review is still required**, 0 only for offline --plan, and 2 for invalid arguments.

## Incident categories

- CI_NO_RUN: no CI run was observed for the selected HEAD SHA.
- CI_PENDING: latest selected run is still in progress.
- CI_RUNNER_STARTUP_FAILURE: all observed jobs failed before recording even one step, suggesting a runner/system blockage rather than a confirmed application test failure.
- CI_JOB_OR_TEST_FAILURE: runner did record steps but the run did not succeed.
- CI_UNKNOWN: jobs/steps metadata missing, incomplete or contradictory.
- DRAFT_PENDING_REVIEW and WRONG_BRANCH_CHAIN: the PR is not ready for human review or targets the wrong predecessor.

Even if every PR later reports observed CI success, the state becomes **HUMAN_REVIEW_REQUIRED**, never automatic merge approval.

## Current verified limitation

GitHub Actions run https://github.com/margaryanlabs/Margaryan-distribution/actions/runs/40116157549 for PR #100's HEAD did not execute test steps: cloud-safety failed with zero steps and web-build was skipped. The underlying GitHub account/runner issue must be resolved through the official GitHub Actions page or platform support before CI is reliable. This does not prove the source code is broken or healthy.

A full Next.js build and all Cloud suite tests were not performed in this environment because github.com is not reachable from the isolated container. The core gate logic was evaluated against 12 pure JavaScript input scenarios using the saved GitHub source; the new Node regression suite still needs a full runner checkout.

## Release sequence after the blocker is resolved

- Wait for actual executed (not zero-step) CI and fix real test/build issues.
- Review the stacked PR chain in parent-to-child order. Avoid merging downstream branches first, and do not auto-merge when predecessor tests are not verified.
- Verify SHA identity, independent artifact digest, authenticated private monitoring, isolated encrypted backups and restore drills.
- Perform first disposable Coolify staging pilot; run release-evidence verifier, per-app smoke tests and owner-reviewed staging rollback.
- Production remains a separate approval per app. Do not migrate VETOGRAM MTProto sessions, Decision Command market/order permissions, SOFIA student data or Promptence OAuth/payment keys automatically.

This gate is designed to make unknown states visible, not manufacture successful build reports.
