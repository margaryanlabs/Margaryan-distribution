#!/usr/bin/env node
/** Fail-closed classification of completed GitHub Actions job evidence. No network or writes. */
import {lstatSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
export const REQUIRED=Object.freeze(['cloud-safety','web-build']);
const STATES=Object.freeze({UNKNOWN:'UNKNOWN',PENDING:'PENDING',RUNNER:'RUNNER_STARTUP_FAILURE',TESTS:'TEST_FAILURE',MISSING:'MISSING_REQUIRED_JOBS',SUCCESS:'TESTS_OBSERVED_SUCCESS'});
export function assessCIRun(run,jobs,required=REQUIRED){
 const report=(state,reason)=>({schema:'markarian-ci-run-gate/v1',state,reason,canDeploy:false,canMigrateProduction:false,canChangeDns:false});
 if(!run||typeof run!=='object'||!Array.isArray(jobs)||!Array.isArray(required)||required.length===0||required.some(x=>typeof x!=='string'||!x))
  return report(STATES.UNKNOWN,'Required GitHub run/job metadata unavailable');
 if(!/^[a-f0-9]{40}$/.test(run.head_sha||'')||!Number.isSafeInteger(run.id)||run.id<=0)
  return report(STATES.UNKNOWN,'Run identity missing or invalid');
 if(!['completed','queued','in_progress','waiting','requested','pending'].includes(run.status))
  return report(STATES.UNKNOWN,'Run status not recognized');
 if(run.status!=='completed')return report(STATES.PENDING,'The selected run is not complete');
 const names=new Set(required);const found=jobs.filter(j=>j&&names.has(j.name));
 if(found.length!==required.length||new Set(found.map(j=>j.name)).size!==required.length)
  return report(STATES.MISSING,'Required jobs absent or duplicated');
 if(found.some(j=>j.status!=='completed'))return report(STATES.UNKNOWN,'Job status contradicts completed run');
 if(found.some(j=>!Array.isArray(j.steps)))return report(STATES.UNKNOWN,'Steps unavailable: cannot distinguish runner and test failure');
 const zeroSteps=found.every(j=>j.steps.length===0);
 if(run.conclusion==='failure'&&zeroSteps&&found.every(j=>j.conclusion==='failure'))
  return report(STATES.RUNNER,'Required jobs failed before any recorded runner steps');
 if(found.some(j=>j.conclusion!=='success')||run.conclusion!=='success')
  return report(STATES.TESTS,'One or more completed checks failed, cancelled or did not succeed');
 if(found.some(j=>j.steps.length===0))
  return report(STATES.UNKNOWN,'Successful job without recorded steps is not verified');
 if(found.some(j=>j.steps.some(s=>!s||s.conclusion!=='success'&&s.conclusion!=='skipped')))
  return report(STATES.TESTS,'At least one executed job step did not succeed');
 return report(STATES.SUCCESS,'Required jobs completed successfully; production permission remains denied');
}
export function main(args=process.argv.slice(2),out=process.stdout,err=process.stderr){
 if(args.length===1&&args[0]==='--plan'){
  out.write('Read-only CI gate: require run ID/SHA and required jobs with executed steps. No secrets, deployment, or automatic retry.\n');return 0;
 }
 if(args.length!==2||args[0]!=='--inspect'||!isAbsolute(args[1])){
  err.write('Usage: ci-run-gate.mjs --plan | --inspect /absolute/private/snapshot.json\n');return 2;
 }
 try{
  const file=args[1],s=lstatSync(file);
  if(!s.isFile()||(s.mode&0o077)!==0||s.size>256*1024||(typeof process.getuid==='function'&&s.uid!==process.getuid()))throw Error('unsafe file');
  const snapshot=JSON.parse(readFileSync(file,'utf8'));
  const verdict=assessCIRun(snapshot?.run,snapshot?.jobs);
  out.write(JSON.stringify(verdict)+'\n');return verdict.state===STATES.SUCCESS?3:1;
 }catch{err.write('CI STATUS UNKNOWN: private read-only snapshot invalid. No action taken.\n');return 1;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
