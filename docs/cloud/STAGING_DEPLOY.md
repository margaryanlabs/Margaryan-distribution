# Markarian Cloud — operator-only staging Git importer

Source-only until an owned Coolify server exists. Implements the documented Coolify Create (Public) endpoint: POST /api/v1/applications/public.

**Repository modes:** public HTTPS Git repository (default) or private `owner/repo` using a preconfigured and repository-restricted Coolify GitHub App UUID. The app private key and installation credentials are configured separately inside Coolify, never collected by this CLI or web UI.

**Security:** This CLI has no web API exposure and cannot create production applications, deploy them, delete resources or modify existing services. It creates an isolated new staging application record only after an operator explicitly approves a hash of the exact request. Coolify does NOT automatically deploy this resource through our CLI.

## Usage after VPS setup
1. Harden your VPS and install self-hosted Coolify behind trusted HTTPS and private owner access.
2. Obtain a Coolify token with the minimum permissions needed to create staging applications. Store it in a private local chmod 600 file. This is a separate privileged credential from read-only CLOUD_COOLIFY_TOKEN.
3. Create an absolute-path config JSON file containing reviewed staging values, for example:
    {"project_uuid":"YOUR_PROJECT_UUID","server_uuid":"YOUR_SERVER_UUID","environment_name":"staging","git_repository":"https://github.com/example/public-app","git_branch":"main","build_pack":"nixpacks","ports_exposes":"3000","name":"staging-app"}
4. For **private** repositories, set `source:"private-github-app"`, `github_app_uuid:"EXISTING_COOLIFY_GITHUB_APP_UUID"`, and `git_repository:"owner/repo"`. Create and scope the GitHub App inside self-hosted Coolify before running this command; use the app's repository allowlist and do not expose its private key in Git.
5. Preview exactly what will be sent:
    node scripts/cloud/deploy-stage.mjs --plan /ABSOLUTE/staging-app.json
6. Verify app name, Git repository, branch, port, project UUID and server UUID.
7. Only if reviewed, configure CLOUD_COOLIFY_URL, CLOUD_COOLIFY_WRITE_TOKEN_FILE and CLOUD_DEPLOY_ENABLE=staging-only in the protected operator terminal.
8. Execute explicitly with the digest from the preview:
    node scripts/cloud/deploy-stage.mjs --create-staging /ABSOLUTE/staging-app.json --approve REVIEW_DIGEST
9. Inspect the resulting app UUID in Coolify, add runtime environment secrets on the secure server, then run a separate approved staging deploy and verify health, HTTPS and rollback.

## Limits
- Private repositories use an already-installed Coolify GitHub App and its allowlisted repositories. GitHub App installation/provisioning itself is intentionally separate and not automated here. No private SSH deploy-key mode is supported yet.
- No build is started by this command. No DNS alias/production URL is updated.
- Preview SHA-style short digest is a human-review token, **not** a cryptographic identity or multi-user permission system. Operator SSH/Zero Trust and file permissions remain the security boundary.
- The CLI requires an HTTPS Coolify origin (not an arbitrary URL). No shell interpolation, retry loop or secret output.
- Some Coolify versions may require different build packs or extra fields. Verify your installed API version against the official docs and test disposable applications first.
- Never use a personal admin API token in the website's NEXT_PUBLIC settings or expose this importer via a browser endpoint.

Official endpoint: https://coolify.io/docs/api/endpoints/applications/create-public-application
## 2026-10-26 — recover PROMPTENCE and VETO with nested Dockerfiles

The old importer had a real mismatch: a Coolify `build_pack:"dockerfile"` request for these repositories did not specify `dockerfile_location` even though neither Dockerfile is in the repository root. The operator importer now accepts a *validated, repository-relative* `dockerfile_location` **only** with the Dockerfile build pack, rejects traversal/URLs/unsafe suffixes, and explicitly submits `instant_deploy:false`, `is_auto_deploy_enabled:false`, `autogenerate_domain:false`, and `base_directory:"/"`. The importer also supplies conservative app-runtime container caps (`limits_memory:"1g"`, `limits_cpus:"1"`) unless one of the explicitly allowed small overrides is reviewed (memory: `512m|1g|2g|4g`; CPU: `0.5|1|2`). Build process limits need separate enforcement. These settings do not confer production safety or prove the actual deployed Coolify version. There is **no live staging app yet**.

Both source repositories are **private**; an operator must first set up a narrowly scoped, existing Coolify GitHub App inside the private Coolify administration UI. No GitHub App private key is sent through this config.

**PROMPTENCE config shape** (values are **placeholders**, not real UUIDs or production credentials):

```json
{
  "project_uuid": "YOUR_PROJECT_UUID",
  "server_uuid": "YOUR_SERVER_UUID",
  "environment_name": "staging",
  "source": "private-github-app",
  "github_app_uuid": "YOUR_COOLIFY_GH_APP_UUID",
  "git_repository": "margaryan-labs/ai-revenue-navigator",
  "git_branch": "ops/recovery-readiness-20261026",
  "build_pack": "dockerfile",
  "dockerfile_location": "deploy/selfhost/Dockerfile",
  "ports_exposes": "3000",
  "name": "promptence-recovery-staging"
}
```

**VETO config** is the same except:

```json
{
  "git_repository": "margaryanlabs/decision-command",
  "git_branch": "ops/recovery-readiness-20261026",
  "dockerfile_location": "deploy/selfhost/Dockerfile.web",
  "name": "veto-recovery-staging"
}
```

Merge these four VETO values into the **complete** PROMPTENCE config, retaining the operator-supplied UUIDs. Never use production database, AI, payment or trading secrets for a build smoke. In Coolify, base directory must remain the repository root to keep the Docker `COPY . .` and lockfiles valid. PROMPTENCE also needs its **browser-public** Supabase URL and publishable key as manually reviewed build arguments; service-role/worker secrets must not be Docker build args. The canonical production Supabase ref is still hard-pinned, so a successful build is **not** proof of working Auth or recovered customer data.

Run on a trusted operator system (Node 22+):

```bash
node --test scripts/cloud/test-deploy-stage-dockerfile.mjs
node scripts/cloud/deploy-stage.mjs --plan /ABSOLUTE/private/stage-promptence.json
node scripts/cloud/deploy-stage.mjs --plan /ABSOLUTE/private/stage-veto.json
```

This only validates the request and provides an approval digest; it creates no application. Creation is a **separate owner-reviewed operation** using the exact digest and staging-only credentials per instructions above. The Coolify API creates only an application record and is not an authorization to deploy, allocate paid resources or change DNS.

After a manually approved disposable image build, run each repository's `node scripts/ops/selfhost-gate.mjs preflight` and local `smoke http://127.0.0.1:3000/`. These are source and single-endpoint checks; independent recovery of Postgres, Supabase Auth, Storage, ClickHouse, backups, RLS and worker safety is still required.

Official Coolify Git app and Dockerfile location documentation: https://coolify.io/docs/api/endpoints/applications/create-private-github-app-application and https://coolify.io/docs/applications/builds/dockerfile .
