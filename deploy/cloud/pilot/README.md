# Markarian Cloud · Stage 0 disposable pilot

**No server has been purchased or deployed by this PR.** This is a safe launch target for validating Coolify once the operator owns a VPS.

The pilot is a stateless unprivileged NGINX container. It deliberately has:
- no host port mapping, no database, no secrets and no persistent storage;
- read-only root filesystem and `cap_drop: ALL`;
- ephemeral `/tmp`, an internal port `8080`, and a container health check.

## Deploy after setting up a VPS and Coolify

1. Install Coolify from https://coolify.io/docs/get-started/installation and finish TLS, firewall and SSH hardening.
2. Inside Coolify create a private project `markarian-cloud-pilots` and a `staging` environment.
3. Add an **Application** from this Git repository: `margaryanlabs/Margaryan-distribution`. Choose a branch containing this pilot, then choose the **Docker Compose** build strategy.
4. Set **Base Directory** to `/deploy/cloud/pilot` and **Docker Compose Location** to `compose.yaml`. Inspect the generated Compose before deploying.
5. Select service `pilot` and set the domain to your own test hostname with **internal port 8080**, e.g. `https://<your-pilot-host>:8080` in Coolify's domain field. Never expose a host port or open firewall port 8080 publicly.
6. Deploy and confirm status healthy and HTTP response 200 through HTTPS. Inspect the deployment and runtime logs.
7. Stop/delete this disposable resource when finished. It has no persisted production data.

**Do not use Raw Compose mode** unless you deliberately manage proxy labels yourself. Coolify's normal Compose deployment adds proxy routing and network management. Do not use an unverified domain or claim the pilot is already live.

For long-lived production images pin an immutable digest, track updates and integrate external monitoring. This intentionally uses a standard tagged image only as a short-lived smoke test.

Source: https://coolify.io/docs/applications/builds/docker-compose

## Required evidence before migrating a real app

Record a real successful deploy, HTTPS, health check, source commit, logs, DNS, and a tested removal. Then verify each application's worker schedules, outbound webhooks, data persistence, backups and rollback. This NGINX pilot does not exercise any of those production dependencies.
