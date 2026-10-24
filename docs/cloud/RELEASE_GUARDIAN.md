# Margaryan Cloud: Project Engine + Release Guardian V1

STATUS: Source-only staging review; no auto-deployment, no actual VPS, production DNS, exchange permissions, or customer databases changed.

## Components

- scripts/cloud/release-guardian.mjs contains nine canonical product blueprints.
- --catalog lists them; --blueprint PROJECT prints exact project-specific checks. Both are offline.
- --assess /ABSOLUTE/release.json validates a private mode-0600, operator-owned manifest and reports missing evidence. It does not connect to GitHub/Coolify or actually prove backup recovery.
- A matching project repository, staging environment, and exact lowercase 40-character commit SHA are mandatory. Unknown projects, production targets, source mismatch and unsafe evidence references are rejected.
- BLOCKED means mandatory evidence missing/failed/unknown. REVIEW_REQUIRED means all checks are operator-attested but NOT independently verified. It never means approved to deploy.
- Current Coolify importer scripts/cloud/deploy-stage.mjs is separate and requires explicit owner staging approval; it only creates an app record and DOES NOT deploy it.
- Mission Control Projects displays the chosen profile, risks, project-specific checks and offline command. It does not change infrastructure.

## Safe commands

    node scripts/cloud/release-guardian.mjs --catalog
    node scripts/cloud/release-guardian.mjs --blueprint decision-command
    node scripts/cloud/release-guardian.mjs --blueprint vetogram
    node --test scripts/cloud/release-guardian.test.mjs

Create operator-only private JSON on a trusted host. This example contains NON-REAL source SHA and evidence.

    {
      "project": "decision-command",
      "repository": "margaryanlabs/decision-command",
      "environment": "staging",
      "releaseName": "veto-preview",
      "commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "evidence": {
        "ci": {
          "status": "unknown",
          "reference": "https://github.com/margaryanlabs/decision-command/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        }
      }
    }

Then inspect:

    node scripts/cloud/release-guardian.mjs --assess /absolute/private/release.json

All omitted checks are blockers. GitHub evidence links are operator-provided references, NOT cryptographic attestations, and cannot prove actual database restores, fresh markets, valid OAuth or isolated credentials. A manually claimed pass does not grant permissions. Never paste secrets, credentials, live trading data, customer PII or database dumps in evidence or CLI output.

## Mandatory high-risk project checks

VETO Decision Command: /healthz is process liveness, /readyz rollout acceptance, /market-readyz market freshness, and /governed-paper-readyz persisted owner-bound PAPER-cycle freshness. These are distinct and require independent verification. Governed paper never grants real exchange order authority. Verify zero-live-authority and correct paper portfolio epoch; never auto-enable a binding.

VETOGRAM: isolate staging Telegram sessions and test Business automation, stories, anti-delete, webhook ownership, user consent and account/session recovery.

SOFIA: student privacy, access roles, data retention, accessible classroom UX, fallback graphics on low-memory devices.

Promptence: OAuth callback allowlists, GSC/GA4 tokens, scheduled jobs and isolated payment/webhook environment.

Margaryan Cloud / Motion Studio: verify private networks, operator authentication, media workers, storage/restore and reproducible rollback. A working Coolify installation is not multi-node reliability.

## Milestones not yet completed

1. Full repository typecheck, production Next.js build and Cloud regression suites.
2. Owned isolated VPS; disposable Coolify pilot verified over HTTPS and checked by separate observation.
3. SHA-bound receipts from actual CI, staging runtime, backup/restore checks and deployment artifact verification.
4. Approved non-destructive staging run, app-specific smoke tests and rollback rehearsal.
5. Production cutovers only after independent owner sign-off and data restore success.

Project Engine does not deploy anything. This source may be reviewed without paying for GitHub Actions or VPS.
