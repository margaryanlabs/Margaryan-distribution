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