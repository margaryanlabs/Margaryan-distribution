import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,chmodSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {assessCIRun,main} from './ci-run-gate.mjs';
const run={id:40115604030,head_sha:'a'.repeat(40),status:'completed',conclusion:'failure'};
const jobs=[{name:'cloud-safety',status:'completed',conclusion:'failure',steps:[]},{name:'web-build',status:'completed',conclusion:'failure',steps:[]}];
const state=(r=run,j=jobs)=>assessCIRun(r,j).state;
test('classifies an observed two-job pre-step GitHub failure as runner startup, not code failure',()=>{
 assert.equal(state(),'RUNNER_STARTUP_FAILURE');assert.equal(assessCIRun(run,jobs).canDeploy,false);
});
test('pending runs are not completed and never green',()=>{
 assert.equal(state({...run,status:'queued',conclusion:null}), 'PENDING');
});
test('missing or duplicated jobs never pass',()=>{
 assert.equal(state({...run,conclusion:'success'},[jobs[0]]),'MISSING_REQUIRED_JOBS');
 assert.equal(state({...run,conclusion:'success'},[jobs[0],jobs[0]]),'MISSING_REQUIRED_JOBS');
});
test('missing step data cannot be used to claim runner failure',()=>{
 assert.equal(state(run,[{...jobs[0],steps:undefined},jobs[1]]),'UNKNOWN');
});
test('after runner starts, a failed command counts as test or build failure',()=>{
 const r={...run};const j=[{...jobs[0],steps:[{name:'Run tests',conclusion:'failure'}]},jobs[1]];
 assert.equal(state(r,j),'TEST_FAILURE');
});
test('only successful executed steps on all required jobs may be observed green, never production release',()=>{
 const good={...run,conclusion:'success'},successJobs=jobs.map(j=>({...j,conclusion:'success',steps:[{name:'Run test',conclusion:'success'}]}));
 const out=assessCIRun(good,successJobs);
 assert.equal(out.state,'TESTS_OBSERVED_SUCCESS');assert.equal(out.canDeploy,false);
 assert.equal(out.canMigrateProduction,false);
});
test('a purported successful job without steps is not evidence',()=>{
 const good={...run,conclusion:'success'},successJobs=jobs.map(j=>({...j,conclusion:'success'}));
 assert.equal(state(good,successJobs),'UNKNOWN');
});
test('unsafe SHA and invalid inputs return unknown',()=>{
 assert.equal(state({...run,head_sha:'main'}),'UNKNOWN');
 assert.equal(assessCIRun(null,[]).state,'UNKNOWN');
});
test('operator-only CLI reads private snapshots, refuses symlinks, and never reports success exit 0',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mc-ci-gate-')),file=join(dir,'snapshot.json');
 try{
  writeFileSync(file,JSON.stringify({run,jobs}),{mode:0o600});
  let data='';const o={write:s=>data+=s},e={write:()=>{}};
  assert.equal(main(['--inspect',file],o,e),1);
  assert.equal(JSON.parse(data).state,'RUNNER_STARTUP_FAILURE');
  chmodSync(file,0o644);assert.equal(main(['--inspect',file],o,e),1);
  const link=join(dir,'link');symlinkSync(file,link);assert.equal(main(['--inspect',link],o,e),1);
  assert.equal(main(['--plan'],o,e),0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
