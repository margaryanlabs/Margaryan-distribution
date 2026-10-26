#!/usr/bin/env node
/** Generates an unprinted, private, non-overwritten password for a disposable Postgres pilot.
 * Does not run Docker, contact networks, write to databases, or touch production.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, openSync, writeFileSync, closeSync, rmSync, lstatSync } from 'node:fs';
import { isAbsolute, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function planDirectory(raw) {
  if (!raw || !isAbsolute(raw)) throw Error('Use an absolute Compose directory');
  const target = resolve(raw);
  if (['/', '/etc', '/srv', '/tmp', '/root', '/home'].includes(target)) throw Error('System root is not a Compose directory');
  if (!existsSync(join(target,'compose.yaml')) || lstatSync(join(target,'compose.yaml')).isSymbolicLink())
    throw Error('Expected a regular pilot compose.yaml');
  if (!lstatSync(join(target,'compose.yaml')).isFile()) throw Error('Invalid Compose source');
  return target;
}
export function prepare(raw) {
  const target = planDirectory(raw);
  const directory = join(target, 'secrets');
  if (existsSync(directory)) throw Error('Secrets already present: refusing overwrite');
  mkdirSync(directory, { mode: 0o700 });
  try {
    const password = randomBytes(36).toString('base64url');
    const fd = openSync(join(directory, 'postgres_password'), 'wx', 0o600);
    try { writeFileSync(fd, password + '\n'); } finally { closeSync(fd); }
  } catch (e) { rmSync(directory, { recursive: true, force: true }); throw e; }
  return 'Secret created privately. Database is NOT running.';
}
export function main(args = process.argv.slice(2)) {
  try {
    if (args.length === 1 && args[0] === '--plan') {
      process.stdout.write('Prepare a local disposable DB secret only; then review Compose and start manually. No database changes.\n');
      return 0;
    }
    if (args.length === 2 && args[0] === '--prepare') {
      process.stdout.write(prepare(args[1]) + '\n');
      return 0;
    }
    process.stderr.write('Usage: node scripts/cloud/prepare-db-pilot.mjs --plan | --prepare /absolute/path/to/deploy/cloud/db-pilot\n');
    return 2;
  } catch (e) {
    process.stderr.write('NOT READY: ' + (e instanceof Error ? e.message : 'unexpected error') + '\n');
    return 1;
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  process.exitCode = main();
