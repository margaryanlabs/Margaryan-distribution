import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const script = fileURLToPath(new URL('./prepare-db-pilot.mjs', import.meta.url));
const compose = readFileSync(new URL('../../deploy/cloud/db-pilot/compose.yaml', import.meta.url), 'utf8');

test('Compose is private, persistent and uses a file-backed secret', () => {
  for (const marker of ['internal: true','POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password','pilot_pgdata:/var/lib/postgresql/data','restart: "no"'])
    assert.ok(compose.includes(marker));
  assert.equal(compose.split('\n').some(line => /^\s*ports:/.test(line)), false);
  assert.equal(compose.split('\n').some(line => /^\s*POSTGRES_PASSWORD:/.test(line)), false);
});
test('plan is side-effect free', () => {
  const p = spawnSync(process.execPath,[script,'--plan'],{encoding:'utf8'});
  assert.equal(p.status,0); assert.match(p.stdout,/No database changes/);
});
test('no production or docker-run action exists', () => {
  for (const args of [['--deploy'],['--prepare'],['--restore'],[]]) {
    const p = spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
    assert.equal(p.status,2);
  }
});
test('password is private, never printed and never overwritten', () => {
  const tmp = mkdtempSync(join(tmpdir(),'markarian-db-test-'));
  try {
    writeFileSync(join(tmp,'compose.yaml'),compose);
    const first = spawnSync(process.execPath,[script,'--prepare',tmp],{encoding:'utf8'});
    assert.equal(first.status,0);
    const password = readFileSync(join(tmp,'secrets/postgres_password'),'utf8').trim();
    assert.ok(password.length >= 40);
    assert.ok(!first.stdout.includes(password));
    assert.equal(statSync(join(tmp,'secrets/postgres_password')).mode & 0o777,0o600);
    const second = spawnSync(process.execPath,[script,'--prepare',tmp],{encoding:'utf8'});
    assert.equal(second.status,1);
    assert.equal(readFileSync(join(tmp,'secrets/postgres_password'),'utf8').trim(),password);
  } finally { rmSync(tmp,{recursive:true,force:true}); }
});
