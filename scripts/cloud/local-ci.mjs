#!/usr/bin/env node
/** Markarian Cloud owner-run release checks. No deployment, secret reads or writes to infrastructure.
 * --cloud: deterministic Cloud regression suite. --full: suite, typecheck and local Next build.
 * --plan: list steps without running anything.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'../..');
export const CLOUD_TESTS=Object.freeze([
 'test-contract.mjs', 'prepare-supabase.test.mjs', 'test-providers.mjs',
 'test-operator-auth.mjs', 'test-ops.mjs', 'test-owned.mjs',
 'test-telemetry.mjs', 'recovery.test.mjs', 'restore-lab.test.mjs', 'test-deploy-plan.mjs',
 'test-capacity.mjs', 'deploy-stage.test.mjs', 'test-health-signals.mjs',
 'test-mission-control-v3.mjs', 'test-domain-plan.mjs', 'test-sentinel.mjs',
 'test-sentinel-status.mjs', 'first-node.test.mjs', 'portfolio-guardian.test.mjs',
 'agent-supervisor.test.mjs', 'test-agent-supervisor-status.mjs',
 'decision-specialist.test.mjs', 'release-guardian.test.mjs', 'release-evidence.test.mjs', 'test-release-marker.mjs', 'ci-run-gate.test.mjs', 'test-cloud-stack-workflow.mjs'
]);
const SLOW_TESTS=new Set([
 'test-contract.mjs', 'test-providers.mjs','test-operator-auth.mjs',
 'test-owned.mjs','test-telemetry.mjs','test-deploy-plan.mjs',
 'test-capacity.mjs','test-health-signals.mjs','test-domain-plan.mjs',
 'test-sentinel.mjs','test-sentinel-status.mjs','test-release-marker.mjs'
]);
const state=(id,status)=>({id,status});

export function releaseSteps(mode) {
 if (!['cloud','full'].includes(mode)) throw Error('Invalid local release mode');
 const steps=CLOUD_TESTS.map(name=>({
   id:'cloud/'+name,
   requiredFile:'scripts/cloud/'+name,
   cmd:process.execPath,
   args:[...(SLOW_TESTS.has(name)?['--experimental-strip-types']:[]),'--test','scripts/cloud/'+name],
   timeoutMs:90000
 }));
 if(mode==='full') steps.push(
   {id:'web/typecheck',requiredFile:'node_modules/.bin/tsc',cmd:'npm',args:['run','typecheck'],timeoutMs:180000},
   {id:'web/build',requiredFile:'node_modules/.bin/next',cmd:'npm',args:['run','build'],timeoutMs:600000}
 );
 return steps;
}

export function runProcess(step,root) {
 // Do not pass cloud provider tokens, authorization variables or private credentials to test subprocesses.
 const cleanEnv={PATH:process.env.PATH||'', HOME:process.env.HOME||'',
   TMPDIR:process.env.TMPDIR||'/tmp', LANG:process.env.LANG||'C.UTF-8',
   CI:'true', NEXT_TELEMETRY_DISABLED:'1'};
 const result=spawnSync(step.cmd,step.args,{cwd:root,env:cleanEnv,shell:false,
   encoding:'utf8',timeout:step.timeoutMs,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});
 // Raw output is intentionally not copied to a shareable report: tests can emit sensitive data.
 return {ok:result.status===0&&!result.error};
}

export function runLocalGate(mode,{root=ROOT,fileExists=existsSync,runner=runProcess,nodeVersion=process.versions.node}={}) {
 if(!['plan','cloud','full'].includes(mode))throw Error('Invalid mode');
 const planned=releaseSteps(mode==='full'?'full':'cloud');
 if(mode==='plan')return {schema:'markarian-local-ci/v1',mode,gate:'PLAN_ONLY',
   checks:planned.map(x=>state(x.id,'NOT_RUN')),productionReady:false,canMigrateProduction:false};
 const checks=[];
 const major=Number(nodeVersion.split('.')[0]);
 checks.push(state('node>=22',major>=22?'PASS':'FAIL'));
 if(major<22)return {schema:'markarian-local-ci/v1',mode,gate:'BLOCKED',checks,productionReady:false,canMigrateProduction:false};
 let blocked=false;
 for(const step of planned){
   if(blocked){checks.push(state(step.id,'SKIPPED'));continue;}
   if(!fileExists(join(root,step.requiredFile))){checks.push(state(step.id,'MISSING'));blocked=true;continue;}
   let passed=false;
   try {passed=runner(step,root)?.ok===true;}catch{passed=false;}
   checks.push(state(step.id,passed?'PASS':'FAIL'));
   if(!passed)blocked=true;
 }
 const gate=!blocked&&checks.every(x=>x.status==='PASS')
   ?mode==='full'?'LOCAL_BUILD_VERIFIED':'CLOUD_TESTS_VERIFIED':'BLOCKED';
 return {schema:'markarian-local-ci/v1',mode,gate,checks,
   productionReady:false,canMigrateProduction:false};
}

export function parseArgs(args){
 const flags=[...args];
 const json=flags.includes('--json');
 if(json)flags.splice(flags.indexOf('--json'),1);
 if(flags.length!==1||!['--plan','--cloud','--full'].includes(flags[0]))return null;
 return {mode:flags[0].slice(2),json};
}

export function main(args=process.argv.slice(2),deps={}){
 const parsed=parseArgs(args);
 if(!parsed){process.stderr.write('Usage: node scripts/cloud/local-ci.mjs --plan | --cloud [--json] | --full [--json]\n');return 2;}
 const report=runLocalGate(parsed.mode,deps);
 if(parsed.json) process.stdout.write(JSON.stringify(report,null,2)+'\n');
 else{
   for(const item of report.checks)process.stdout.write(`[${item.status}] ${item.id}\n`);
   process.stdout.write(`Gate: ${report.gate}. Production migration is NOT authorized.\n`);
 }
 return ['CLOUD_TESTS_VERIFIED','LOCAL_BUILD_VERIFIED','PLAN_ONLY'].includes(report.gate)?0:1;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
