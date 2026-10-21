# Markarian Cloud OS — Self-hosted Data Foundation

**Source/installer prepared only. NOT deployed.** No VPS, database, customer data, passwords, or production environment have been created or migrated.

## Separation of responsibilities

- **Control plane:** the private /cloud dashboard reads Coolify with a scoped `read` token; it is not a database administrator and has no write API.
- **Runtime:** Coolify deploys web containers, workers and scheduled tasks on owned VPS infrastructure.
- **Data plane:** official Supabase Docker stack on a secured, preferably separate VPS. PostgreSQL, Auth, Realtime, Storage and Edge Functions are separate services.
- **Analytics:** VETO ClickHouse must not compete with the primary database for RAM; its Railway measurements reached nearly 8 GB.
- **Backups:** encrypted offsite DB and object backups with periodic restore tests; VPS snapshots alone are not disaster recovery.

Supabase's official guide recommends 4 CPU cores, 8 GB+ RAM, 80 GB+ SSD for a full self-hosted deployment: https://supabase.com/docs/guides/self-hosting/docker

## Prepare official source safely

On a trusted operator machine with Node 22+ and Git:

    node scripts/cloud/prepare-supabase.mjs --plan
    node scripts/cloud/prepare-supabase.mjs --prepare /srv/markarian-supabase

The installer fetches the official Supabase `self-hosted/v0.8.2` release into a **new** directory. It never overwrites existing files, copies a real `.env`, generates keys, starts Docker, modifies DNS, or migrates data.

After reviewing the official upstream release and Docker Compose files, on the **secured target VPS only**, copy `.env.example` to `.env`, set strict file permissions and generate fresh credentials and authentication signing keys using official instructions. Configure HTTPS, API hostname, private network, email, and secret store.

    node scripts/cloud/prepare-supabase.mjs --verify /srv/markarian-supabase

`--verify` checks only configuration field presence and release marker and never prints secret values; it does **not** validate secret strength, runtime health, encrypted storage, backup completeness, or restore success.

Before `docker compose up -d`, set up offsite backups and test restoration into a disposable environment. Do NOT open public Postgres/Redis ports. Run staging Auth/Storage/Realtime/email/webhook smoke tests. Production migrations require their own rollback, consistency checks and a tested maintenance plan.

Self-hosted Supabase represents **one project**, not the cloud-hosted multi-project management platform. Markarian Cloud's future multi-project Data product will require explicit orchestration, tenancy isolation, access control and audit logs.

## Permissions

- Never expose Supabase service-role, Postgres root, JWT private signing, object storage or Coolify tokens to the browser.
- Keep the Command Center read-only until strong operator identity, MFA, audit logs, role-scoped approvals and isolated deployment/DB write services exist.
- Avoid copying production secrets to GitHub, screenshots, scripts or localStorage.

Official references: https://supabase.com/docs/guides/self-hosting/docker and https://coolify.io/docs/api/permissions