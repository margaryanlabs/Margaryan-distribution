import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVps, parseArgs, main, PILOT_LIMITS } from './vps-preflight.mjs';
const good = { platform: 'linux', arch: 'x64', nodeMajor: 22, cpu: 8,
  ramMiB: 32768, freeDiskGiB: 150, dockerCli: true, localDockerContext: true, compose: true, daemon: true };

test('sufficient Linux host allows disposable pilot but never production', () => {
  const report = evaluateVps(good);
  assert.equal(report.gate, 'READY_FOR_DISPOSABLE_PILOT');
  for (const permission of ['canDeployProduction', 'canMigrateProduction', 'canMoveDNS', 'canTrade'])
    assert.equal(report[permission], false);
});
test('missing daemon is a wait even when Docker CLI exists', () => {
  const report = evaluateVps({ ...good, daemon: false });
  assert.equal(report.gate, 'NOT_READY');
  assert.deepEqual(report.checks.find(x => x.id === 'docker_daemon_access'),
    { id: 'docker_daemon_access', status: 'WAIT' });
});
test('unexpected remote Docker context blocks the staging pilot', () => {
  assert.equal(evaluateVps({ ...good, localDockerContext: false }).gate, 'NOT_READY');
});
test('missing Compose blocks the staging pilot', () => {
  assert.equal(evaluateVps({ ...good, compose: false }).gate, 'NOT_READY');
});
test('thresholds are intended for the pilot, not every Margaryan product', () => {
  assert.equal(PILOT_LIMITS.ramMiB, 8192);
  assert.equal(evaluateVps({ ...good, freeDiskGiB: 79 }).gate, 'NOT_READY');
  assert.equal(evaluateVps({ ...good, ramMiB: 8191 }).gate, 'NOT_READY');
  assert.equal(evaluateVps({ ...good, cpu: 3 }).gate, 'NOT_READY');
});
test('invalid and unsupported host observations fail closed', () => {
  for (const wrong of [{ platform: 'win32' }, { arch: 'ia32' }, { nodeMajor: 20 },
    { ramMiB: NaN }, { freeDiskGiB: Infinity }, { cpu: -1 }]) {
    assert.equal(evaluateVps({ ...good, ...wrong }).gate, 'NOT_READY');
  }
});
test('arguments never permit install or production deployment', () => {
  assert.deepEqual(parseArgs(['--check', '--json']), { mode: '--check', json: true });
  for (const argv of [['--deploy'], ['--install'], ['--check', '--deploy'], []])
    assert.equal(parseArgs(argv), null);
});
test('plan mode does not collect host state', () => {
  let called = false;
  const priorWrite = process.stdout.write;
  process.stdout.write = () => true;
  try { assert.equal(main(['--plan'], () => { called = true; return good; }), 0); }
  finally { process.stdout.write = priorWrite; }
  assert.equal(called, false);
});
