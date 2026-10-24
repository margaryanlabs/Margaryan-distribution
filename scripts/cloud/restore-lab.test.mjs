import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable,Writable} from 'node:stream';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after} from 'node:test';
import {approvalDigest,validateSelector,validateContainerMetadata,parseArgs,main,runRestoreLab} from './restore-lab.mjs';
const id='a'.repeat(64);
const snapshot='deadbeef012345';
const filename='promptence-2026-10-24T17-30-00-000Z.dump';
const secrets=mkdtempSync(join(tmpdir(),'markarian-restore-test-'));
const passFile=join(secrets,'restic-password');
writeFileSync(passFile,'test-only-password',{mode:0o600});
after(()=>rmSync(secrets,{recursive:true,force:true}));
const env={RESTIC_REPOSITORY:'s3:https://backup.example.invalid/private',RESTIC_PASSWORD_FILE:passFile};
const metadata={State:{Running:true},Config:{Labels:{'com.docker.compose.project':'markarian-restore-lab','com.docker.compose.service':'db'}},
 HostConfig:{NetworkMode:'markarian-restore-lab_restore_private',Privileged:false,PortBindings:{'5432/tcp':null}}};
const inspect=JSON.stringify(metadata);
function fakeSpawn({failDump=false,failRestore=false,existingTables=false,zeroAfter=false}={}){
 let tables=0;
 const calls=[];
 const spawnFn=(cmd,args,options)=>{
  calls.push({cmd,args,options});
  const child=new EventEmitter();
  const isDump=cmd==='restic';
  const isRestore=cmd==='docker'&&args.includes('pg_restore');
  const isProbe=cmd==='docker'&&args.includes('psql');
  let txt='';
  if(cmd==='docker'&&args.includes('ps'))txt=id+'\n';
  if(cmd==='docker'&&args.includes('inspect'))txt=inspect+'\n';
  if(isProbe)txt=existingTables?'1\n':(tables && !zeroAfter?'1\n':'0\n');
  if(isDump)txt='custom dump\n';
  child.stdout=Readable.from([txt]);
  child.stdin=new Writable({write(_c,_e,cb){cb();}});
  child.kill=()=>{};
  process.nextTick(()=>{if(isRestore&&!failRestore)tables=1;child.emit('close',(isDump&&failDump)||(isRestore&&failRestore)?1:0);});
  return child;
 };
 return {spawnFn,calls};
}
test('accepts only reviewed Restic snapshot and safe archive name',()=>{
 assert.deepEqual(validateSelector(snapshot,filename),{snapshot,filename});
 for(const [a,b] of [['../../etc/passwd',filename],[snapshot,'../../.env'],[snapshot,'foo.dump'],[snapshot,'PROMPTENCE.dump']])
  assert.throws(()=>validateSelector(a,b));
});
test('digest ties snapshot and filename to fixed target, never to production',()=>{
 assert.equal(approvalDigest(snapshot,filename),approvalDigest(snapshot,filename));
 assert.notEqual(approvalDigest(snapshot,filename),approvalDigest('cafecafe',filename));
 assert.notEqual(approvalDigest(snapshot,filename),approvalDigest(snapshot,'promptence-2026-10-25T17-30-00-000Z.dump'));
});
test('container must be running, correctly labeled, isolated and non-privileged',()=>{
 assert.equal(validateContainerMetadata(id,metadata),true);
 for(const m of [
  {...metadata,State:{Running:false}},
  {...metadata,Config:{Labels:{'com.docker.compose.project':'production','com.docker.compose.service':'db'}}},
  {...metadata,HostConfig:{...metadata.HostConfig,Privileged:true}},
  {...metadata,HostConfig:{...metadata.HostConfig,NetworkMode:'host'}},
  {...metadata,HostConfig:{...metadata.HostConfig,PortBindings:{'5432/tcp':[{HostPort:'5432'}]}}}
 ])assert.throws(()=>validateContainerMetadata(id,m));
 assert.throws(()=>validateContainerMetadata('not-an-id',metadata));
});
test('CLI syntax and review never run a process',async()=>{
 assert.equal(parseArgs(['--plan']).mode,'plan');
 assert.equal(parseArgs(['--review',snapshot,filename]).mode,'review');
 assert.equal(parseArgs(['--restore',snapshot,filename,'--approve','abc']).mode,'restore');
 for(const a of [[],['--production'],['--restore',snapshot,filename],['--review','../../etc/passwd',filename]]){
  try{assert.equal(parseArgs(a),null);}catch{assert.match(a[1],/\.\./);}
 }
 let out='';let err='';let calls=0;
 const runner=()=>{calls++;throw Error('must not call');};
 assert.equal(await main(['--plan'],{}, {write:x=>{out+=x;}},{write:x=>{err+=x;}},runner),0);
 assert.equal(await main(['--review',snapshot,filename],{}, {write:x=>{out+=x;}},{write:x=>{err+=x;}},runner),0);
 assert.match(out,/reviewDigest/);assert.equal(calls,0);
});
test('approval mismatch fails without spawning processes',async()=>{
 let calls=0;
 const result=await main(['--restore',snapshot,filename,'--approve','wrong'],env,{write:()=>{}},{write:()=>{}},()=>{calls++;});
 assert.equal(result,1);assert.equal(calls,0);
});
test('restore script cannot specify host, database, user or arbitrary Docker service',()=>{
 const code=readFileSync(new URL('./restore-lab.mjs',import.meta.url),'utf8');
 assert.match(code,/const PROJECT='markarian-restore-lab'/);
 assert.match(code,/const SERVICE='db'/);
 assert.match(code,/--dbname','restore_lab'/);
 assert.doesNotMatch(code,/pg_restore.*PGHOST/);
 assert.equal(parseArgs(['--restore',snapshot,filename,'--target','production']),null);
});
test('Compose lab publishes zero ports and uses isolated ephemeral data',()=>{
 const compose=readFileSync(new URL('../../deploy/cloud/restore/compose.yaml',import.meta.url),'utf8');
 assert.match(compose,/internal: true/);
 assert.match(compose,/tmpfs:/);
 assert.match(compose,/POSTGRES_PASSWORD_FILE/);
 assert.doesNotMatch(compose,/^\s+ports:/m);
 assert.doesNotMatch(compose,/\/var\/run\/docker\.sock/);
});
test('successful streamed restore returns observed-only receipt, not production readiness',async()=>{
 const {spawnFn,calls}=fakeSpawn();
 const report=await runRestoreLab(snapshot,filename,env,spawnFn);
 assert.equal(report.gate,'ISOLATED_RESTORE_OBSERVED');
 assert.equal(report.tableCount,1);
 assert.equal(report.productionReady,false);
 assert.equal(report.appChecksPerformed,false);
 assert.equal(report.canMigrateProduction,false);
 assert.ok(calls.some(x=>x.cmd==='restic'&&x.args[0]==='dump'));
 assert.ok(calls.some(x=>x.args.includes('pg_restore')));
 assert.ok(calls.filter(x=>x.args.includes('psql')).length===2);
 assert.ok(calls.every(x=>x.options.shell===false));
});
test('populated lab, failed archive and zero table restore fail closed',async()=>{
 for(const scenario of [{existingTables:true},{failDump:true},{failRestore:true},{zeroAfter:true}]){
  const {spawnFn}=fakeSpawn(scenario);
  await assert.rejects(runRestoreLab(snapshot,filename,env,spawnFn));
 }
});