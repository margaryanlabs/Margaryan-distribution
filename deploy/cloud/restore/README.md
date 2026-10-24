# Margaryan Cloud — disposable PostgreSQL Restore Lab

**Not deployed.** This lab exists to prove that an encrypted offsite Restic backup can be streamed into a *separate, empty, short-lived* PostgreSQL database. It never connects to an arbitrary PGHOST and does not restore any production database.

## Prerequisites

- Dedicated trusted Linux staging/backup host, Docker Engine + Compose, Node.js >=22, Restic and sufficient disk/RAM for the chosen database archive. Do not run this on a shared production machine.
- Owner-controlled offsite Restic repository. Configure `RESTIC_REPOSITORY`, `RESTIC_PASSWORD_FILE` and any required provider credentials on the operator host. The Restic password file must be private (`chmod 600`), not committed to Git.
- Local Docker socket available at `/var/run/docker.sock`. The script forces this local Unix socket; remote Docker contexts are intentionally not supported. Access to the Docker socket is equivalent to host administrator privileges: restrict the operator account.
- Use an archive produced by `scripts/cloud/recovery.mjs --backup-postgres`. Its exact snapshot ID and filename are needed.

## Initialize an **empty** lab manually

Copy the repository to the secure host. Review `compose.yaml`, then create a password file for the lab with secure random bytes in `deploy/cloud/restore/secrets/lab_password` and mode `0600`. Keep the `secrets` folder at `0700` and outside version control (it is covered by the repository's secrets exclusion; verify before Git operations). Example on Linux:

```sh
cd deploy/cloud/restore
umask 077
mkdir -p secrets
openssl rand -base64 48 > secrets/lab_password
chmod 600 secrets/lab_password
docker compose -f compose.yaml -p markarian-restore-lab up -d
# Confirm db is healthy before proceeding.
cd ../../..
```

The lab container has no published ports, only an internal Docker network, and a temporary PostgreSQL data directory. It can still contain real production-derived data during a drill: prevent other host users from accessing Docker and never make its database publicly reachable. Docker may persist logs and Restic downloads may be temporarily cached by the host: apply host-level access controls.

## Restore verification

```sh
node scripts/cloud/restore-lab.mjs --plan
node scripts/cloud/restore-lab.mjs --review SNAPSHOT_ID PROJECT-TIMESTAMP.dump
node scripts/cloud/restore-lab.mjs --restore SNAPSHOT_ID PROJECT-TIMESTAMP.dump --approve REVIEW_DIGEST
```

`--plan` and `--review` never spawn Docker/Restic. `--restore` requires an explicit digest matching the reviewed snapshot, exact file, fixed Compose project and service. The CLI confirms the local Docker container ID/labels, checks that no user tables exist beforehand, streams `restic dump` into `pg_restore` inside the lab (no plaintext file on disk), then checks that at least one application table exists. Errors are redacted; a failed or partial restore never generates a success receipt. **Recreate a fresh lab after any failed restore.**

Read-only status `ISOLATED_RESTORE_OBSERVED` confirms only that this lab received and parsed the archive. This does **not** prove application integrity, Auth/Storage/Realtime compatibility, RLS correctness, email/webhooks, retention, PITR, disaster recovery RTO, or safe production cutover. After the first lab succeeds, operators must still perform app-level sign-in, schema, storage, and reconciliation checks before migrating any live project.

## Cleanup (manual and destructive to the *lab only*)

When evidence has been recorded, **manually** run `docker compose -f deploy/cloud/restore/compose.yaml -p markarian-restore-lab down` from the trusted checkout. Do not assume tmpfs/no volumes alone guarantees secure erasure of host swap, backups, logs or memory. The script never invokes `down`, `stop`, `rm`, deploys, DNS changes or production database writes.

## Tests

```sh
node --test scripts/cloud/restore-lab.test.mjs
```

Offline tests use simulated Docker/Restic processes and are not evidence of a real Restore Lab operation.