#!/usr/bin/env node
/** PostgreSQL pg_dump stream -> encrypted offsite restic snapshot.
 * No unencrypted dump file, shell execution, DB writes or automated restore.
 */
import {spawn} from 'node:child_process';
import {statSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
const COMMANDS=new Set(['--plan','--preflight','--backup-postgres','--check-repository','--inspect-snapshot']);
const MAX_LOG_BYTES=1024*1024;
const fail=message=>{throw new Error(message);};
function privateFile(name,env){
 const file=env[name];
 if(!file||!isAbsolute(file))fail(name+' must be an absolute file path');
 try{
  const s=statSync(file);
  if(!s.isFile()||(s.mode&0o077)!==0)fail(name+' must be a private regular file (chmod 600)');
 }catch(e){
  if(e instanceof Error&&e.message.startsWith(name+' must'))throw e;
  fail(name+' is missing or unreadable');
 }
}
export function validateRecoveryEnvironment(env,{postgres=false}={}){
 const repo=env.RESTIC_REPOSITORY?.trim()||'';
 if(!/^(s3:https:\/\/|s3:|sftp:|b2:|azure:|gs:|rclone:|rest:https:\/\/)/.test(repo))
  fail('Use an offsite restic repository (s3, sftp, b2, azure, gs, rclone or HTTPS REST).');
 if(/^s3:http:\/\//.test(repo)||/^rest:http:\/\//.test(repo))fail('Refusing a plaintext HTTP backup destination');
 if(/[\s\x00-\x1f]/.test(repo))fail('Repository address contains invalid characters');
 privateFile('RESTIC_PASSWORD_FILE',env);
 if(postgres){
  for(const key of ['PGHOST','PGUSER','PGDATABASE'])if(!env[key])fail('Missing '+key);
  privateFile('PGPASSFILE',env);
  if(env.PGPASSWORD)fail('Do not pass PGPASSWORD inline: use private PGPASSFILE');
  if(env.PGPORT&&!/^\d{1,5}$/.test(env.PGPORT))fail('Invalid PGPORT');
  if(!/^[a-z0-9][a-z0-9_-]{1,47}$/.test(env.CLOUD_BACKUP_PROJECT||''))
   fail('CLOUD_BACKUP_PROJECT must be a lowercase slug (2–48 characters)');
 }
 return true;
}
function safeEnv(env){return {...env,PGPASSWORD:undefined,RESTIC_PASSWORD:undefined};}
function silentProcess(binary,args,env,{stdin='ignore',capture=false,pipeOutput=false}={}){
 const child=spawn(binary,args,{env:safeEnv(env),shell:false,stdio:[stdin,(capture||pipeOutput)?'pipe':'ignore','ignore']});
 let output='';
 if(capture)child.stdout.on('data',chunk=>{
  if(output.length<MAX_LOG_BYTES)output+=chunk.toString('utf8').slice(0,MAX_LOG_BYTES-output.length);
 });
 const completed=new Promise((resolve,reject)=>{
  child.once('error',()=>reject(new Error(binary+' unavailable')));
  child.once('close',code=>resolve(code));
 });
 return {child,completed,getOutput:()=>output};
}
export async function backupPostgres(env){
 validateRecoveryEnvironment(env,{postgres:true});
 const probe=silentProcess('restic',['snapshots','--json'],env,{capture:true});
 if(await probe.completed!==0)fail('Offsite restic repository not initialized or inaccessible');
 const project=env.CLOUD_BACKUP_PROJECT;
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const file=project+'-'+stamp+'.dump';
 const dumpArgs=['--format=custom','--no-owner','--no-acl','--host',env.PGHOST,
  '--port',env.PGPORT||'5432','--username',env.PGUSER,'--dbname',env.PGDATABASE];
 const archive=silentProcess('restic',['backup','--stdin','--stdin-filename',file,'--tag','markarian-postgres','--tag','project:'+project,'--json'],env,{stdin:'pipe',capture:true});
 const dump=silentProcess('pg_dump',dumpArgs,env,{pipeOutput:true});
 dump.child.stdout?.on('error',()=>{});
 archive.child.stdin.on('error',()=>{});
 dump.child.stdout?.pipe(archive.child.stdin);
 const [dumpExit,archiveExit]=await Promise.all([dump.completed,archive.completed]);
 if(dumpExit!==0||archiveExit!==0)
  fail('Backup failed (pg_dump or encrypted upload unsuccessful); inspect private server logs');
 let snapshotId=null;
 for(const line of archive.getOutput().split(/\r?\n/).filter(Boolean)){
  try{
   const item=JSON.parse(line);
   if(item.message_type==='summary'&&typeof item.snapshot_id==='string'&&/^[a-f0-9]{8,64}$/.test(item.snapshot_id))
    snapshotId=item.snapshot_id;
  }catch{}
 }
 if(!snapshotId)fail('Restic did not confirm a backup snapshot ID');
 return {snapshotId,project,filename:file,verifiedRestore:false};
}
export async function inspectSnapshot(env,snapshotId,filename){
 validateRecoveryEnvironment(env);
 if(!/^[a-f0-9]{8,64}$/.test(snapshotId||''))fail('Expected a hexadecimal snapshot ID');
 if(!/^[a-z0-9][a-z0-9_-]{1,47}-[0-9TZ-]+\.dump$/.test(filename||''))
  fail('Expected a safe backup filename');
 const archive=silentProcess('restic',['dump',snapshotId,filename],env,{pipeOutput:true});
 const archiveCheck=silentProcess('pg_restore',['--list'],env,{stdin:'pipe'});
 archive.child.stdout?.on('error',()=>{});
 archiveCheck.child.stdin.on('error',()=>{});
 archive.child.stdout?.pipe(archiveCheck.child.stdin);
 const [a,b]=await Promise.all([archive.completed,archiveCheck.completed]);
 if(a!==0||b!==0)fail('Archive inspection failed; snapshot or PostgreSQL archive unavailable');
 return {snapshotId,archiveReadable:true,restoreTested:false};
}
export async function checkRepository(env){
 validateRecoveryEnvironment(env);
 const check=silentProcess('restic',['check','--read-data'],env);
 if(await check.completed!==0)fail('Restic repository integrity check failed; inspect private server logs');
 return {repositoryChecked:true,restoreTested:false};
}
async function main(args=process.argv.slice(2),env=process.env){
 const [action,...extra]=args;
 if(!COMMANDS.has(action)||(action==='--inspect-snapshot'?extra.length!==2:extra.length!==0)){
  process.stderr.write('Usage: node scripts/cloud/recovery.mjs --plan|--preflight|--backup-postgres|--check-repository|--inspect-snapshot ID FILE\n');
  process.exitCode=2;return;
 }
 if(action==='--plan'){
  process.stdout.write('Markarian Recovery: encrypted offsite PostgreSQL backups via pg_dump | restic, no local plaintext dump.\n'+
   'Commands: --preflight, --backup-postgres, --check-repository, --inspect-snapshot ID FILE.\n'+
   'Requires RESTIC_REPOSITORY and RESTIC_PASSWORD_FILE; database backup also needs PGHOST, PGUSER, PGDATABASE, PGPASSFILE and CLOUD_BACKUP_PROJECT.\n'+
   'Restoring into an empty staging database is a separate required operator procedure. No live data modified by this command.\n');
  return;
 }
 try{
  validateRecoveryEnvironment(env,{postgres:action==='--backup-postgres'||action==='--preflight'});
  if(action==='--preflight'){
   process.stdout.write('Private configuration validated (presence and file permissions only); no backup or restore attempted.\n');
   return;
  }
  if(action==='--inspect-snapshot'){
   await inspectSnapshot(env,extra[0],extra[1]);
   process.stdout.write('Encrypted archive inspected successfully. Database restore test: NOT PERFORMED.\n');
  }else if(action==='--backup-postgres'){
   const result=await backupPostgres(env);
   process.stdout.write('Encrypted offsite backup created. Snapshot ID: '+result.snapshotId+
    '\nProject: '+result.project+'\nArchive filename: '+result.filename+'\nRestore test: NOT PERFORMED\n');
  }else{
   await checkRepository(env);
   process.stdout.write('Full restic repository data check completed. Restore test: NOT PERFORMED.\n');
  }
 }catch(e){
  process.stderr.write('RECOVERY NOT READY: '+(e instanceof Error?e.message:'Unknown error')+'\n');
  process.exitCode=1;
 }
}
const invoked=process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url;
if(invoked)await main();
