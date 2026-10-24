import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CLOUD_TESTS,releaseSteps,runLocalGate,parseArgs} from './local-ci.mjs';

test('Cloud suite includes first node, backup, auth, monitoring and deploy regressions',()=>{
 assert.equal(CLOUD_TESTS.length,27);
 for(const x of ['first-node.test.mjs','recovery.test.mjs','restore-lab.test.mjs','portfolio-guardian.test.mjs', 'release-guardian.test.mjs','release-evidence.test.mjs','test-release-marker.mjs','ci-run-gate.test.mjs','test-cloud-stack-workflow.mjs','agent-supervisor.test.mjs','test-agent-supervisor-status.mjs','decision-specialist.test.mjs','test-operator-auth.mjs','test-sentinel.mjs','deploy-stage.test.mjs'])
  assert.ok(CLOUD_TESTS.includes(x));
 assert.equal(new Set(CLOUD_TESTS).size,CLOUD_TESTS.length);
});
test('plan never executes anything and never claims release readiness',()=>{
 let called=0;
 const r=runLocalGate('plan',{runner:()=>{called++;return {ok:true};}});
 assert.equal(called,0);
 assert.equal(r.gate,'PLAN_ONLY');
 assert.equal(r.checks.length,27);
 assert.ok(r.checks.every(c=>c.status==='NOT_RUN'));
 assert.equal(r.productionReady,false);
});
test('cloud mode can pass but never authorizes production migration',()=>{
 let called=0;
 const r=runLocalGate('cloud',{fileExists:()=>true,runner:()=>{called++;return {ok:true};},nodeVersion:'22.16.0'});
 assert.equal(called,27);
 assert.equal(r.gate,'CLOUD_TESTS_VERIFIED');
 assert.equal(r.canMigrateProduction,false);
});
test('missing mandatory file fails closed before executing a runner',()=>{
 let called=0;
 const r=runLocalGate('cloud',{fileExists:()=>false,runner:()=>{called++;return {ok:true};},nodeVersion:'22.0.0'});
 assert.equal(called,0);
 assert.equal(r.gate,'BLOCKED');
 assert.equal(r.checks.find(c=>c.id==='cloud/test-contract.mjs').status,'MISSING');
 assert.equal(r.checks.at(-1).status,'SKIPPED');
});
test('a failed mandatory check blocks the rest including build',()=>{
 const seq=[];
 const r=runLocalGate('full',{fileExists:()=>true,runner:step=>{seq.push(step.id);return {ok:step.id!=='cloud/prepare-supabase.test.mjs'};},nodeVersion:'24.0.0'});
 assert.deepEqual(seq,['cloud/test-contract.mjs','cloud/prepare-supabase.test.mjs']);
 assert.equal(r.gate,'BLOCKED');
 assert.equal(r.checks.find(c=>c.id==='web/build').status,'SKIPPED');
});
test('full mode only passes after actual Cloud tests, typecheck and build',()=>{
 const r=runLocalGate('full',{fileExists:()=>true,runner:()=>({ok:true}),nodeVersion:'22.0.0'});
 assert.equal(r.gate,'LOCAL_BUILD_VERIFIED');
 assert.equal(r.checks.length,30);
 assert.equal(r.checks.at(-2).id,'web/typecheck');
 assert.equal(r.checks.at(-1).id,'web/build');
 assert.equal(r.productionReady,false);
});
test('Node <22 blocks without execution',()=>{
 let called=0;
 const r=runLocalGate('full',{runner:()=>{called++;return {ok:true};},nodeVersion:'20.0.0'});
 assert.equal(called,0);
 assert.equal(r.gate,'BLOCKED');
 assert.equal(r.checks[0].status,'FAIL');
});
test('runner exceptions cannot be interpreted as passed',()=>{
 const r=runLocalGate('cloud',{fileExists:()=>true,runner:()=>{throw Error('simulated');},nodeVersion:'22.1.0'});
 assert.equal(r.gate,'BLOCKED');
 assert.equal(r.checks[1].status,'FAIL');
});
test('no shell, remote command, dependency installation, or deployment in release steps',()=>{
 const steps=releaseSteps('full');
 for(const s of steps){
  assert.ok(['npm',process.execPath].includes(s.cmd));
  assert.ok(!s.args.some(v=>['install','deploy','curl','ssh','sudo'].includes(v)));
  assert.ok(s.requiredFile&&!s.requiredFile.startsWith('/'));
  assert.ok(s.timeoutMs>0);
 }
 assert.deepEqual(steps.at(-2).args,['run','typecheck']);
 assert.deepEqual(steps.at(-1).args,['run','build']);
});
test('strict CLI argument allowlist',()=>{
 assert.deepEqual(parseArgs(['--cloud','--json']),{mode:'cloud',json:true});
 for(const args of [[],['--cloud','--full'],['--production'],['--cloud','--exec'],['--cloud','--json','--extra']])
  assert.equal(parseArgs(args),null);
});
