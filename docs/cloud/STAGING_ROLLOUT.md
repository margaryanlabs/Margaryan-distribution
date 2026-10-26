# Markarian Cloud: operator-gated Coolify staging deployment

**Implementation status:** Code-only. Coolify and production apps have not been contacted. This operator CLI is intentionally separate from the public Cloud UI and is not an autonomous deployment agent.

## Why this is a real infrastructure step

Coolify's documented `POST /api/v1/deploy?uuid=...` queues an application deployment and `GET /api/v1/applications/{uuid}` reads its configuration. With this new CLI, an operator can check the exact **staging** application metadata before asking Coolify to deploy it.

Coolify's multi-server deployment can propagate a single image to attached standalone servers, provided the application does not use persistent Coolify storage or a Compose app. **Coolify still does not provide the external load balancer**, nor database replication or offsite recovery. This script does not change per-server rollout order. A staging deployment can affect all servers attached to the selected *staging* app.

Official sources:
- https://coolify.io/docs/api/endpoints/applications/get-application-by-uuid
- https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid
- https://coolify.io/docs/api/endpoints/deployments/get-deployment-by-uuid
- https://coolify.io/docs/core/infrastructure/scaling/multi-server-deployments

## Prepare a real isolated staging application (NOT production)

1. Create a separate project/environment and staging app in Coolify, with its own UUID, a real staging domain containing the DNS label `staging`, dedicated test credentials, and no live user data.
2. Select the **Dockerfile** build type and `Dockerfile.selfhost`. Do not use Docker Compose or persistent application storage for multi-server staging. Both VETOGRAM and Promptence have portable Docker staging drafts; their full app builds and application health are not yet verified.
3. Set a pinned 40-character lowercase source commit SHA in Coolify's `git_commit_sha` configuration. This may require an application setting or an API/CLI action, depending on the installed Coolify version. **If unavailable, deployment is blocked**; do not substitute an unpinned branch. Turn off automatic deployments during this operator-reviewed staging workflow.
4. Enable a **real** app readiness endpoint `/api/health` or `/healthz`. It must be implemented and tested by the app; the CLI checks the configuration only and never assumes the endpoint is healthy.
5. Create two separate Coolify tokens: team-scoped read (application and deployment metadata only) and minimally scoped write/deploy. Store each in its own absolute regular file, `chmod 600`, owned by the operator. NEVER put tokens in the repo, URL, CI logs or chat.
6. Set `CLOUD_COOLIFY_URL` to the exact trusted HTTPS Coolify origin. Restrict operator API access through private connectivity/Zero Trust/IP allowlist and firewall; validating a hostname alone cannot prevent DNS rebinding.

## Manifest and steps

Copy the appropriate template from `deploy/cloud/rollouts/*.example.json` to a private operator path and fill in the real Coolify application UUID, staging URL, reviewed repo branch, and an **actual** tested commit SHA.

```sh
# Source-only: no network, no credentials, no Docker and no purchases.
node scripts/cloud/rollout.mjs --plan /absolute/operator/vetogram-staging.json

# Read-only, requires CLOUD_COOLIFY_READ_TOKEN_FILE, compares live app metadata.
node scripts/cloud/rollout.mjs --verify /absolute/operator/vetogram-staging.json

# Only on an authorized owner machine, after reviewing --plan and --verify.
export CLOUD_DEPLOY_ENABLE=staging-only
export CLOUD_COOLIFY_WRITE_TOKEN_FILE=/absolute/private/coolify-write-token
node scripts/cloud/rollout.mjs --start-staging /absolute/operator/vetogram-staging.json --approve SHA256_FROM_PLAN

# Observe status; a Coolify 'finished' event is not proof of a healthy app.
node scripts/cloud/rollout.mjs --status DEPLOYMENT_UUID_FROM_RESULT
```

`--start-staging` first re-reads the live app with the read-only token, verifies that its git repo/branch/commit, staging-only name/domain, Dockerfile, healthcheck and disabled auto-deploy still match, then queues a Coolify deploy with a **separate** write token. The tool does not retry POST on failures to avoid duplicate jobs.

`--start-staging` always returns `QUEUED_UNVERIFIED`, even if the HTTP response is 200. `--status` can return `DEPLOYMENT_REPORTED_FINISHED_REVIEW`, **never** production approval. A write response might be ambiguous if the connection fails after Coolify accepted it; inspect the deployment queue before retrying.

## Mandatory checks AFTER staging deployment

- Confirm an immutable built image digest and deployed SHA via independent build records, not only the app's `git_commit_sha` config.
- Verify actual readiness from every application server, source SHA, TLS, failure isolation, external LB health probe, caching, dynamic routing and tracing. Confirm all traffic shifts are **staging only**. The CLI does not rotate traffic.
- VETOGRAM: use separate Telegram test bot/account, verify encrypted sessions/Neon-v6 schema, stories, Anti-Delete, media, signed worker triggers and sensitive permissions.
- Promptence: verify real Nitro build, Supabase Auth + Storage + RLS tenant isolation, measurements, external OAuth and signed payment webhooks, plus all four scheduled worker replacements.
- Backup all relevant data and verify a real isolated restore, not just backup file creation.
- Production cutover requires a distinct, explicit process with restoration, rollback and security evidence. **This CLI cannot run production actions even with a write token.**

## Security and operational limits

The preflight depends on Coolify's own reported `git_commit_sha` and settings. This is **configuration evidence**, not cryptographically pinned image verification. Git remote/ref movement between the GET and POST remains a possible race; use immutable Git SHAs and independent registry digest evidence before promoting any real release. The app must have no attached persistent Coolify volumes to use the multi-server feature; the app GET API alone does not prove that condition.

The current GitHub Actions runners for the stacked PR chain fail before executing steps. The test file is committed and wired into CI; it does **not** imply a verified green build. No VPS, Coolify credentials, app runtime, load balancer, TLS or database restore is present in this development environment.
