# Markarian Cloud OS — first-node staging verification

**Status:** the verifier and unit tests are implemented. No VPS, Coolify instance, pilot, or production applications have been deployed or verified by this repository change.

This is the first evidence gate **after** an owner acquires and secures a VPS. It deliberately does **not** install Coolify, trigger a deployment, write database records, perform a backup, change DNS or authorize a production migration. It needs only Node.js 22+ and uses built-in Node APIs (no npm dependencies).

## Stage 0 — inspect the plan safely (no VPS required)

```sh
node scripts/cloud/first-node.mjs --plan
node --test scripts/cloud/first-node.test.mjs
```

## Stage 1 — owner-managed disposable VPS pilot

1. Provision Ubuntu LTS, restrict SSH to key authentication, configure host firewall, unattended security updates, DNS, and HTTPS. Put the Coolify admin panel behind VPN/Zero Trust if possible. Use a **separate test** hostname.
2. Install Coolify following the [official install guide](https://coolify.io/docs/get-started/installation) and activate its API on the secured host. Create an API credential granting only read access to server inventory. Do not reuse a write/deploy or admin token.
3. In Coolify, create `markarian-cloud-pilots` with environment `staging`. Follow [deploy/cloud/pilot/README.md](../../deploy/cloud/pilot/README.md) and deploy `deploy/cloud/pilot/compose.yaml` **and the adjacent `index.html`**. The page exposes a deliberately public and non-secret marker (`markarian-cloud-pilot:v1:disposable`). Container mounts no writable host path and publishes no host ports.
4. Get the **exact target server UUID** from Coolify. Do not use an arbitrary healthy server from the inventory.
5. On a secured operator machine (not browser/localStorage), save the read-only token in an absolute file owned by the operator with mode 0600. For example, store it in a private home directory and run `chmod 600` on the file. Never paste credentials into GitHub, ChatGPT, or command output.
6. Set environment variables locally:

   - `CLOUD_COOLIFY_URL=https://coolify.your-domain.example` — exact trusted HTTPS origin
   - `CLOUD_PILOT_URL=https://pilot.your-domain.example` — exact trusted HTTPS origin, no port/path/query
   - `CLOUD_TARGET_SERVER_UUID=YOUR_KNOWN_TARGET_UUID` — explicit server UUID
   - `CLOUD_COOLIFY_READ_TOKEN_FILE=/absolute/path/to/private-read-token` — absolute local file path

7. Run:

```sh
node scripts/cloud/first-node.mjs --verify
node scripts/cloud/first-node.mjs --verify --json
```

The script exits `0` only if all checks pass; `1` for any failed/missing condition; `2` for invalid CLI usage. Output contains bounded status labels and generic messages **without** token values, upstream response bodies, server hostnames or origin URLs. JSON can be stored as a local operator receipt, but it does not include a timestamp or a signed attestation.

## Verifier boundaries

- The Coolify read-only API must report **the selected server UUID** with `settings.is_reachable === true` and `settings.is_usable === true`. This remains **Coolify-reported state**, not independent SSH-level validation.
- The pilot must return `200` over HTTPS without redirects, `text/html`, and the expected static identity marker in at most 64 KiB. Generic HTML or an arbitrary `200` is a fail. The marker is **not a secret or cryptographic proof**; it is only a negative guard against checking the wrong default welcome page.
- `STAGING_PILOT_VERIFIED` means two separate observations succeeded; it does **not** cryptographically link the pilot host to the selected server UUID, prove any persistent storage, backup/restore, DNS cutover, CI/Next.js build, live service uptime, or customer isolation.
- Missing/incomplete data never becomes a green status. Redirection and non-HTTPS origins are refused; the Coolify token is **never** sent to the public pilot.
- Production migration requires a separate app-by-app cutover approval after live build/tests, real restore, production workload health, rollback plan, and observability are confirmed.

## If the check fails

Inspect the particular `WAIT` or `FAIL` step. Common causes: server UUID mismatch, incomplete Coolify API permissions, inaccessible target server, TLS/DNS not ready, or missing/old pilot identity page. Do not disable TLS validation or use an admin token to silence errors. Never move live VETOGRAM, SOFIA, Promptence or any database based on this pilot gate alone.