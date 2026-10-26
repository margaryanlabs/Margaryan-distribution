#!/usr/bin/env node
/** Read-only inventory of an owner-managed Linux VPS before a disposable Coolify pilot.
 * No changes to Docker, firewall, SSH, DNS, databases, secrets, or production.
 */
import { cpus, totalmem, platform, arch } from 'node:os';
import { statfsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PILOT_LIMITS = Object.freeze({ cpu: 4, ramMiB: 8192, freeDiskGiB: 80, nodeMajor: 22 });

export function evaluateVps(snapshot) {
  const checks = [
    ['linux', snapshot.platform === 'linux'],
    ['supported_architecture', ['x64', 'arm64'].includes(snapshot.arch)],
    ['node_22_or_newer', Number.isInteger(snapshot.nodeMajor) && snapshot.nodeMajor >= PILOT_LIMITS.nodeMajor],
    ['cpu_for_staging', Number.isInteger(snapshot.cpu) && snapshot.cpu >= PILOT_LIMITS.cpu],
    ['ram_for_staging', Number.isFinite(snapshot.ramMiB) && snapshot.ramMiB >= PILOT_LIMITS.ramMiB],
    ['free_disk_for_staging', Number.isFinite(snapshot.freeDiskGiB) && snapshot.freeDiskGiB >= PILOT_LIMITS.freeDiskGiB],
    ['docker_cli', snapshot.dockerCli === true],
    ['local_docker_context', snapshot.localDockerContext === true],
    ['docker_compose', snapshot.compose === true],
    ['docker_daemon_access', snapshot.daemon === true],
  ].map(([id, pass]) => ({ id, status: pass ? 'PASS' : 'WAIT' }));
  const ready = checks.every(x => x.status === 'PASS');
  return {
    schema: 'markarian-vps-preflight/v1',
    gate: ready ? 'READY_FOR_DISPOSABLE_PILOT' : 'NOT_READY',
    checks,
    canDeployProduction: false, canMigrateProduction: false, canMoveDNS: false, canTrade: false,
    note: 'Host capability only; never evidence of backups, TLS, tenancy, app build, or database restore.',
  };
}

function probeDocker(args) {
  try {
    execFileSync('docker', args, { timeout: 4500, stdio: 'ignore',
      env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || '/tmp' } });
    return true;
  } catch { return false; }
}

function probeLocalContext() {
  try {
    const context = execFileSync('docker', ['context', 'show'], { timeout: 4500, encoding: 'utf8',
      env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || '/tmp' }, maxBuffer: 1024 });
    return context.trim() === 'default';
  } catch { return false; }
}

export function readHost() {
  let freeDiskGiB = NaN;
  try {
    const fs = statfsSync('/');
    freeDiskGiB = fs.bavail * fs.bsize / (1024 ** 3);
  } catch { /* Missing evidence fails closed. */ }
  return {
    platform: platform(), arch: arch(), nodeMajor: Number(process.versions.node.split('.')[0]),
    cpu: cpus().length, ramMiB: totalmem() / 1048576, freeDiskGiB,
    dockerCli: probeDocker(['--version']), localDockerContext: probeLocalContext(),
    compose: probeDocker(['compose', 'version']),
    daemon: probeDocker(['info', '--format', '{{.ServerVersion}}']),
  };
}

export function parseArgs(args) {
  const rest = [...args];
  const json = rest.includes('--json');
  if (json) rest.splice(rest.indexOf('--json'), 1);
  if (rest.length !== 1 || !['--plan', '--check'].includes(rest[0])) return null;
  return { mode: rest[0], json };
}

export function main(args = process.argv.slice(2), read = readHost) {
  const parsed = parseArgs(args);
  if (!parsed) {
    process.stderr.write('Usage: node scripts/cloud/vps-preflight.mjs --plan | --check [--json]\n');
    return 2;
  }
  if (parsed.mode === '--plan') {
    const plan = { schema: 'markarian-vps-preflight/v1', gate: 'PLAN_ONLY',
      minPilot: PILOT_LIMITS, canDeployProduction: false, canMigrateProduction: false };
    process.stdout.write(parsed.json ? JSON.stringify(plan) + '\n' :
      'Read-only checks: Linux/arch/Node >=22, >=4 CPU, >=8 GiB RAM, >=80 GiB free disk, Docker/Compose/daemon. No deployment.\n');
    return 0;
  }
  const report = evaluateVps(read());
  if (parsed.json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else {
    for (const item of report.checks) process.stdout.write(`[${item.status}] ${item.id}\n`);
    process.stdout.write(`Gate: ${report.gate}. No production action authorized.\n`);
  }
  return report.gate === 'READY_FOR_DISPOSABLE_PILOT' ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  process.exitCode = main();
