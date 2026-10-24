# Markarian Recovery — isolated restore validation gate

The new owner-only `scripts/cloud/restore-lab.mjs` safely connects the existing encrypted Restic backup tool to a dedicated disposable PostgreSQL Docker Compose lab.

- `--plan`: offline operator instructions only.
- `--review SNAPSHOT FILE`: validates snapshot and exact archive selectors, prints a review digest. No network or process execution.
- `--restore SNAPSHOT FILE --approve DIGEST`: **explicitly approved**, streams the encrypted offsite archive through Restic to a fixed local Docker PostgreSQL container. No custom database host, custom Docker context or production target is accepted.
- Docker container must be running, from Compose project `markarian-restore-lab`, service `db`, not privileged, not using host networking and with no published ports.
- Container inspection now also requires the **exact ID** returned by Compose, a healthy `postgres:16-alpine` image, the dedicated project network, `no-new-privileges`, no extra capabilities, no host/shared namespaces, temporary database data and exactly one read-only password-secret mount. An unexpected resource fails closed rather than being treated as a verified restore lab.
- Docker configuration/context overrides are filtered from subprocess environments; real container inspection remains mandatory before any write. Do not use an existing production Docker host for trials. Existing user tables cause a hard failure. After restore, count of application tables must be positive.
- Receipt always declares `productionReady: false`, `canMigrateProduction: false` and `appChecksPerformed: false`.

**Source exists only.** No real VPS, offsite backup, running lab or app-level recovery test has been verified. Docker/Restic process tests use mocks. For actual operator steps see [`deploy/cloud/restore/README.md`](../../deploy/cloud/restore/README.md).

Before any migration to owned infrastructure, separately verify restore completeness, data consistency, encrypted storage, user authentication, object storage, secrets, backups and recovery time. Supabase self-hosted architecture requires special attention to Auth/Storage/Realtime services that a PostgreSQL dump does not cover.