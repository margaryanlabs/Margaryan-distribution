# Margaryan Cloud — Release Evidence V1 (read-only)

Status: source implementation and offline tests only. NOT deployed; NO evidence of a running VPS, green CI, real staging URL, database restore or successful production release.

## Why this exists

Release Guardian V1 only checks an operator-supplied checklist. Release Evidence V1 can independently query two specific GitHub records: exact source commit SHA and the latest returned Actions run for a selected workflow on the SAME SHA. It also probes only an operator-configured staging hostname for a self-reported version marker and a basic HTTP health response. Results are explicitly **observations**, not cryptographic attestations and NEVER execution authority. The staging checker makes no external requests if staging origin is not configured.

This is complementary to Project Engine, first-node verifier, Portfolio Guardian, Sentinel and Decision Specialist; it does NOT bypass any of their release gates.

## Trusted operator setup

1. On a trusted Node.js 22+ operator machine, store a fine-grained read-only GitHub token with repository metadata/Contents and Actions READ permissions in a private, operator-owned, non-symlink file (mode 0600). Set CLOUD_RELEASE_GITHUB_TOKEN_FILE to its absolute path. Never set this token in NEXT_PUBLIC or put it in Git.
2. Create a private JSON release manifest with the exact registered product repository, full 40-hex commit SHA and the workflow file whose results you want to verify. Choose a workflow that really includes the release tests; an arbitrary passing workflow is not sufficient proof of quality. Set previousCommit only to a separately verified old STAGING SHA. Example contains NON-REAL SHAs and should not be used for production:

    {
      "project": "margaryan-cloud",
      "repository": "margaryanlabs/Margaryan-distribution",
      "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "previousCommit": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "workflowFile": "ci.yml"
    }

3. To also observe staging, configure CLOUD_RELEASE_STAGING_ORIGIN to the exact trusted HTTPS origin (no path, no credentials). The manifest cannot override it. Optional CLOUD_RELEASE_STAGING_HEALTH_PATH accepts only /healthz or /api/health. DNS/network protections must independently prevent DNS rebinding and outbound access to private infrastructure; domain validation alone is NOT sufficient SSRF protection. Run on a tightly controlled host with egress firewall rules.
4. Run:

    node scripts/cloud/release-evidence.mjs --plan
    node --test scripts/cloud/release-evidence.test.mjs
    node --experimental-strip-types --test scripts/cloud/test-release-marker.mjs
    node scripts/cloud/release-evidence.mjs --verify /absolute/private/release.json

Return code 1 is BLOCKED, 3 means observations available for HUMAN REVIEW, and 2 is invalid CLI usage. Zero is only for --plan, never deployment authorization.

## Staging release identity contract

Request: GET /.well-known/markarian-release.json over approved HTTPS. Expected JSON:

    {"schema":"markarian-staging-release/v1","environment":"staging","project":"margaryan-cloud","repository":"margaryanlabs/Margaryan-distribution","commit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}

The tool then independently sends GET /healthz, or GET /api/health when configured. Both must return valid, bounded JSON; a 200 from /healthz with status ok/ready or from /api/health with ok true is recorded as OBSERVED. Health is not evidence of correct database, pipeline, Telegram session, payment integration or user flow.

For THIS Margaryan Cloud repository only, an opt-in Next.js GET marker route is included. It returns 404 unless all these server-side variables are set to the exact expected values:
- CLOUD_STAGING_MARKER_ENABLED=staging-only
- CLOUD_STAGE_ENVIRONMENT=staging
- CLOUD_STAGE_PROJECT=margaryan-cloud
- CLOUD_STAGE_REPOSITORY=margaryanlabs/Margaryan-distribution
- CLOUD_STAGE_COMMIT_SHA=<actual deployed 40-digit lowercase source SHA>

NEVER set this marker for production. The marker can be misconfigured and it is not signed, so compare against independent provider deployment SHA and artifact digest before accepting a release. Other product repositories still need separately reviewed marker endpoints or equivalent reliable deployment identity checks. This PR does NOT add them to other projects.

## Controlled rollback

Output includes a NOT_EXECUTED manual rollback plan: preserve current logs, independently verify former artifact SHA/digest, check schema backward compatibility and offsite restore rehearsal, request owner approval, revert STAGING through a separate reviewed operator command, then verify smoke tests. The tool itself never calls rollback, Coolify write endpoints, DNS, trades, or databases.

## Outstanding gates

- Full Next.js typecheck/build and entire Cloud test suite — not verified.
- GitHub Actions runner for stacked PR chain — not confirmed green.
- Actual staging origin, independent artifact hash, OAuth sessions, market freshness, real database backups and restore drill — not checked.
- No scheduled continuous evidence polling or push notifications exist in this release.
- No merging or production migration until each critical product independently passes deployment checks.
