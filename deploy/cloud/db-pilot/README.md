# Markarian Cloud — PostgreSQL disposable durability pilot

**Not production. Not Supabase. Not deployed.** This isolated Compose project validates that the future VPS can run a private persistent PostgreSQL container *before* any user data moves. Coolify deployment pilot and this database pilot are independent stages.

## Why this is separated

The existing Supabase Docker preparation remains the path for products that use Supabase Auth, Realtime, Storage or Edge Functions. This PostgreSQL-only lab cannot replace them. The lab publishes **zero host ports**, joins an `internal: true` Docker network and uses a randomly generated password from an untracked root-owned/operator-owned local file.

## Operator commands (ONLY on an owner-controlled staging VPS)

```sh
node scripts/cloud/prepare-db-pilot.mjs --plan
node --test scripts/cloud/prepare-db-pilot.test.mjs
node scripts/cloud/prepare-db-pilot.mjs --prepare "$(pwd)/deploy/cloud/db-pilot"
cd deploy/cloud/db-pilot
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
docker compose -f compose.yaml exec -T postgres pg_isready -U markarian_pilot -d markarian_pilot
docker compose -f compose.yaml exec -T postgres psql -U markarian_pilot -d markarian_pilot -c "SELECT 1;"
```

Check that the health probe succeeds and your non-sensitive test table persists across a container restart. Do **not** use real user data or backups in this pilot. For cleanup, `docker compose -f compose.yaml down` stops containers but leaves volumes; `down -v` **destroys the test database** and is allowed only for the disposable pilot after reviewing the project name and data.

## Required boundaries

- The generated `secrets/postgres_password` is ignored by Git and never printed or overwritten. Do not copy it to GitHub or chat.
- `postgres:16-alpine` is a moving pilot tag. Pin a reviewed image digest for production and plan major-version upgrades.
- No default public ingress, SQL proxy, Supabase Auth/Storage, application service credentials, backup, restore, PITR, high availability or SLA is provided here.
- **Production needs** dedicated restricted database users, network isolation for each client, schema migrations, encryption, offsite backup, tested restore and full Supabase migration where required.
- Refer to `docs/cloud/SELF_HOSTED_DATA.md`, `docs/cloud/RECOVERY.md`, and `docs/cloud/RESTORE_LAB.md` for later phases.
