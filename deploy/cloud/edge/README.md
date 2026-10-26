# Markarian Edge V1 — health-aware private HAProxy staging

Status **source implementation + isolated pure-logic checks only**. No live edge server, private overlay tunnel, production domain or traffic cutover has occurred. This is the first working configuration generator, not a tested SLA.

## What this layer is for

Coolify can build an application Docker image once and deploy it to separate servers; it **does not balance external traffic**. This stage provides a HAProxy HTTP routing layer with distinct upstream pools for VETOGRAM and Promptence, HTTP 200 health checks, least-connections balancing, and automatic exclusion of backends after repeated failed checks. Coolify's current multi-server mechanism does NOT support Docker Compose resources or resources with Coolify persistent volumes. Use the two dedicated `Dockerfile.selfhost` applications; keep database, Auth, Storage, media, sessions and workers external and private.

**This HAProxy container cannot be a complete high-availability solution by itself.** It is one edge instance and is itself a single point of failure. A future production setup requires two independent edge instances plus an external provider load balancer or another correctly tested VIP/DNS failover mechanism.

References:
- https://coolify.io/docs/core/infrastructure/scaling/multi-server-deployments
- https://coolify.io/docs/core/infrastructure/scaling/cloud-load-balancing
- https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Offline development / safe validation

```sh
node --test scripts/cloud/edge-render.test.mjs scripts/cloud/edge-probe.test.mjs

node scripts/cloud/edge-render.mjs --plan "$(pwd)/deploy/cloud/edge/staging.example.json"
node scripts/cloud/edge-render.mjs --render "$(pwd)/deploy/cloud/edge/staging.example.json"
```

The manifest describes **only** staging on private RFC1918 addresses. It insists on two backends for both VETOGRAM and Promptence, distinct private IP:port endpoints and at least two declared zone labels for each product. It refuses public, loopback or cloud metadata IPs, unknown products, source SHA placeholders with wrong format, public host port publishing and production manifests. Zone labels and SHA fields are untrusted operator assertions, **not runtime verification**. The generator performs no shell calls, Docker actions or API calls.

Before using this with real servers, replace illustrative addresses, zone labels and expected SHAs with the **correct private WireGuard/provider-network addresses and reviewed source SHAs**. An internal container IP that disappears after restarting Coolify is NOT an acceptable stable backend. Confirm the HAProxy host can reach each application at the chosen exact private IP and port, with firewall restrictions preventing public access to the app origin. If Coolify's proxy only exposes HTTPS by per-domain virtual hosts, implement an explicitly reviewed **private** origin listener or TLS-aware backend scheme instead of bypassing access controls. Never simply expose app ports on the Internet to make them reachable.

## Read-only active backend probe

Only from a trusted operator host with the permitted private overlay configured:

```sh
node scripts/cloud/edge-probe.mjs --verify "$(pwd)/deploy/cloud/edge/staging.example.json"
```

This independently sends GET to each declared RFC1918 origin + port + health path, with no credentials, no redirects, 4s timeout, up to 8 concurrent probes and HTTP 200 requirement. Any failure blocks the observation. Output excludes response bodies, private secrets and actual IPs (reports service/backend/zone labels and status). A success exits as **REVIEW ONLY (3)**, not deployment approval. HTTP 200 **does not** prove active source SHA, Telegram sessions, sign-in, payments, database readiness, media availability or a multi-zone failover.

## Private HAProxy stage (operator action after network and test builds work)

1. On a secured edge machine, create and attach a **private shared ingress Docker network** named `markarian-edge-ingress`. Only the approved external HTTPS termination proxy and this staging HAProxy instance may join it. The names and setup here are review examples, not a command to edit the live Coolify proxy.
2. On the edge, maintain a **separate, private network route** (provider private LAN or WireGuard with strict firewall) to each application origin. Do not publish PostgreSQL, Redis/Valkey, Grafana, Supabase Studio or MTProto session interfaces.
3. Render the reviewed manifest into the edge directory manually (the resulting file contains private origins and must not be committed):
   ```sh
   node scripts/cloud/edge-render.mjs --render "$(pwd)/deploy/cloud/edge/staging.example.json" > deploy/cloud/edge/haproxy.cfg
   chmod 600 deploy/cloud/edge/haproxy.cfg
   ```
4. Confirm syntax with official HAProxy **before** starting a container:
   ```sh
   docker run --rm --network none \
     -v "$(pwd)/deploy/cloud/edge/haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro" \
     haproxy:3.2-alpine haproxy -c -f /usr/local/etc/haproxy/haproxy.cfg
   ```
5. Compare the resolved image digest against a reviewed tag and pin the image digest for production. The sample `deploy/cloud/edge/compose.yaml` uses `expose` (8081 VETOGRAM, 8082 Promptence) and **no host `ports`**. Only then start the staging container with Compose from the edge directory. The Compose healthcheck validates **configuration syntax, not origin availability**.
6. Configure your external **HTTPS-only** proxy to forward the staging hostnames to HAProxy on the shared private Docker network and map the two applications to their distinct ports. Verify that no application accepts direct unauthenticated Internet connections through the private backend ports.
7. Test each backend by stopping one **staging-only** instance at a time. Confirm the other continues serving test requests, failed health checks remove unhealthy servers, and recovery returns them. Record latency, errors, active users/sessions, and network traces. Never perform these tests against customer production data.
8. If both backends fail, the load balancer must fail closed rather than route traffic to an unhealthy instance. Monitor HAProxy's 503 responses and alert an operator.

## Review exact staged source markers on EVERY origin

VETOGRAM and Promptence each have optional stage-only source endpoints under `/api/markarian-release` in their separate PRs. Their dedicated Dockerfiles require `MARKARIAN_SOURCE_SHA` (exact 40 hex lowercase) as a build argument, and the runtime exports `MARKARIAN_RELEASE_ENABLED=staging-only`, `MARKARIAN_ENVIRONMENT=staging` and `MARKARIAN_SOURCE_SHA`. No stage marker is exposed in the existing Vercel configurations.

After making sure `deploy/cloud/edge/staging.example.json` has the **real reviewed SHA for each application** and private routing to every actual instance, run:

```sh
node --test scripts/cloud/edge-release.test.mjs
node scripts/cloud/edge-release.mjs --verify "$(pwd)/deploy/cloud/edge/staging.example.json"
```

This checks the genuine `/api/health` endpoint followed by a bounded `/api/markarian-release` response from **each** node. Every HTTP response must report the expected staging product, exact repo and full SHA; one stale, missing, malformed or unhealthy origin blocks review. It never deploys or changes traffic. The marker is still **self-reported**, NOT an immutable running Docker image digest; compare with independently recorded registry digests and Coolify's exact deployment queue before customer cutover.

Promptence's new staging `/api/health` validates HTTPS access to the configured Supabase GoTrue `/auth/v1/health`; it checks auth transport only, **not** RLS, Storage objects, API data integrity, payment receipts or client activation. VETOGRAM's `/api/health` already depends on real Telegram bot and storage health. Never point a staging instance at production Telegram credentials or customer data merely to make a health check pass.

## Critical properties this code deliberately DOES NOT assert

- HAProxy is **not** a TLS certificate manager here. TLS termination, hostname routing and trusted forwarded headers must be tested at the upstream HTTPS edge. An untrusted public HTTP listener is forbidden.
- Health probes check HTTP 200 on each backend. They do not verify source SHA or built Docker image digest. Get independent version/immutable-image receipts per backend before attaching live traffic.
- A single HAProxy container, edge host or DNS record is **not highly available**, even with two healthy application servers.
- The backends are stateless application instances only. PostgreSQL/Supabase data require separate replication, fencing, backups, verified restore and failover tooling. Media/uploads must be shared and resilient; do not store data in a local web container.
- No GitHub merge, production deployment, DNS change, billing action, Telegram webhook cutover, database migration or origin switch is performed by these scripts.

## Next implementation milestone

Per-backend release identity verification (real running image digest and expected commit), immutable rollout receipts, staging failover drill, external edge HA and a separate database recovery plane. Complete Node/Next build and `haproxy -c` in a real Docker environment remain required; previous GitHub Actions runners fail before executing jobs.
