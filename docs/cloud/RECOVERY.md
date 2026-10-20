# Markarian Recovery — encrypted offsite PostgreSQL backups

**Source implemented and locally tested with mock processes; NOT connected to any production database or external storage.** No real backups, restore tests or DNS cutovers have been performed.

## Actual capabilities
- Streaming PostgreSQL custom-format pg_dump into an encrypted Restic backup without creating a plaintext dump file on local disk.
- --preflight validates configured database and offsite repository requirements, including private credential file permissions.
- --backup-postgres records an encrypted backup and its verified Restic snapshot identifier (not a verified restore).
- --inspect-snapshot ID FILE streams a Restic archive into pg_restore --list to check archive readability without writing plaintext to disk. This is NOT a real database restore.
- --check-repository runs restic check --read-data, verifying repository data integrity but not application consistency.
- Shell-disabled spawn, fixed command paths, no direct secrets on CLI args, private password file, no arbitrary SQL or destructive operations.

## Manual operator setup (isolated staging VPS, Node 22+, PostgreSQL client tools, Restic)

Create an encrypted Restic repository in genuinely separate offsite storage, with a separate failure domain. Prefer TLS and a tightly scoped write-only backup credential. Initialize the repository via reviewed Restic commands, separate from this CLI. Retain the Restic encryption password safely in a separate secure location: losing it can make restores impossible.

Set the following in the SERVER-ONLY environment (no NEXT_PUBLIC variables, no GitHub secrets committed):
- RESTIC_REPOSITORY: remote s3:, sftp:, b2:, azure:, gs:, rclone: or rest:https:// URI. Verify your actual transport uses TLS or SSH, regardless of accepted syntax.
- RESTIC_PASSWORD_FILE: absolute file with restrictive 0600 permissions.
- PGHOST / PGPORT / PGUSER / PGDATABASE: staging PostgreSQL connection fields.
- PGPASSFILE: protected absolute PostgreSQL password file (chmod 600); do not set PGPASSWORD.
- CLOUD_BACKUP_PROJECT: lowercase project slug, e.g. promptence.

Run these ONLY on the protected machine:

    node scripts/cloud/recovery.mjs --plan
    node scripts/cloud/recovery.mjs --preflight
    node scripts/cloud/recovery.mjs --backup-postgres
    node scripts/cloud/recovery.mjs --inspect-snapshot SNAPSHOT_ID PROJECT-TIMESTAMP.dump
    node scripts/cloud/recovery.mjs --check-repository

## Mandatory real recovery drill

On a separate **empty staging PostgreSQL instance**, use a known-good Restic snapshot to restore into a new database with credentials restricted to staging. Verify schema, row counts, Auth/RLS, application login, migrations and integrity. Do not restore onto any production database or re-use production URLs. Capture snapshot ID, source database, restore duration, result and operator sign-off.

Logical dumps are NOT point-in-time recovery (PITR). For PITR, add tested base backups, WAL archiving, retention and restore points. Storage objects and separate Supabase configuration/secrets require their own secure backup lifecycle. The script does not implement object backups, retention/pruning, schedules, locks, offsite checks, or automated recovery verification. Archive inspection and restic check are not substitutes for an actual staging restore.

Unit tests use mocks for pg_dump, pg_restore and restic. They validate program behavior, not real credentials, external storage, PostgreSQL client versions or actual restoration.