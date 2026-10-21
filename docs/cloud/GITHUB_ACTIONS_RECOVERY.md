# GitHub Actions: jobs fail before execution (20 Oct 2026)

Observed in Margaryan Distribution:
- Existing `main` branch workflow runs had failures before PR #92.
- PR #92 `web` and `voice-gateway` jobs also completed with failure but **zero reported steps**, no job logs.
- Therefore these job failures do **not** prove the Cloud or Motion code failed compilation.
- The actual pre-job banner text and owner billing status were not accessible through the connector. The cause is **unverified**.

## Operator investigation

1. Open https://github.com/margaryanlabs/Margaryan-distribution/actions and select PR #92's failed workflow. Check the error banner on the run/job page.
2. Because the repository owner is GitHub user `margaryanlabs`, examine **that account's** Settings → Billing and licensing → Usage / Budgets and payment history. If the banner mentions payments or spending limits, resolve any payment restriction or configure an acceptable Actions budget. Do not increase spending without an intentional cap.
3. Under repository Settings → Actions → General, verify that workflow execution is allowed. Check runner availability/status.
4. Re-run the failed workflow only after the account-level error has been resolved. If pre-job failures continue with healthy billing and permissions, open a GitHub Support case including the run URL and billing-status screenshots.
5. Independently run `node --experimental-strip-types --test scripts/cloud/test-contract.mjs` and `npm run typecheck` and `npm run build` in a trusted Node 22 environment once dependencies can be installed.

Official troubleshooting: https://docs.github.com/en/actions/how-tos/troubleshoot-workflows

Do not switch `runs-on` to `self-hosted` unless a properly isolated and maintained runner already exists. Runner access to this repository's privileged jobs is a security boundary.

## No false CI claims

The isolated Cloud API contract and Compose pilot structure can be tested offline. The full Next.js app plus existing Motion regression suite have **not** been verified; leave the PR open until those pass.
